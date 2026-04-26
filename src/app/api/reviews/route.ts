import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { case_id, lawyer_id, rating, review } = body;

  if (!case_id || !lawyer_id || !rating || !review) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const newReview = await prisma.review.create({
      data: {
        case_id,
        client_id: session.user.id,
        lawyer_id,
        rating: Number(rating),
        review: review,
      },
    });

    // Update lawyer's aggregate rating
    const allReviews = await prisma.review.findMany({
      where: { lawyer_id },
      select: { rating: true },
    });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await prisma.lawyerProfile.update({
      where: { id: lawyer_id },
      data: {
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: allReviews.length,
      },
    });

    return NextResponse.json({ review: newReview });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'You have already reviewed this case.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
