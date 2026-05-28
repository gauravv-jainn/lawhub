import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { reviewSchema } from '@/lib/utils/validators';
import { isPrismaUniqueError } from '@/lib/utils/errors';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { case_id, lawyer_id, rating, review } = body as {
    case_id?: string;
    lawyer_id?: string;
    rating?: unknown;
    review?: unknown;
  };

  if (!case_id || !lawyer_id) {
    return NextResponse.json({ error: 'case_id and lawyer_id are required' }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse({ rating, review });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // OWNERSHIP CHECK: confirm the session user was the client on this completed case
  // and that the lawyer_id matches — prevents IDOR and fake reviews
  const caseRecord = await prisma.case.findFirst({
    where: {
      id: case_id,
      client_id: session.user.id,
      lawyer_id,
      status: 'completed',
    },
    select: { id: true },
  });
  if (!caseRecord) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const newReview = await prisma.review.create({
      data: {
        case_id,
        client_id: session.user.id,
        lawyer_id,
        rating: parsed.data.rating,
        review: parsed.data.review,
      },
    });

    // Recalculate using SQL aggregate — no full-table fetch
    const agg = await prisma.review.aggregate({
      where: { lawyer_id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.lawyerProfile.update({
      where: { id: lawyer_id },
      data: {
        avg_rating: Math.round(((agg._avg.rating ?? 0) * 10)) / 10,
        review_count: agg._count.rating,
      },
    });

    return NextResponse.json({ review: newReview });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json({ error: 'You have already reviewed this case.' }, { status: 409 });
    }
    console.error('[POST /api/reviews]', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
