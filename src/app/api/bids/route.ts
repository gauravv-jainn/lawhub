import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { bidSubmitSchema } from '@/lib/utils/validators';
import { isPrismaUniqueError } from '@/lib/utils/errors';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bidSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    brief_id,
    proposed_fee,
    fee_structure,
    milestone_count,
    strategy_text,
    cover_letter,
    relevant_experience,
    availability,
    estimated_timeline,
  } = parsed.data;

  // Verify brief exists, is open, and lawyer isn't the brief owner
  const brief = await prisma.brief.findFirst({
    where: { id: brief_id, status: 'open' },
    select: { id: true, client_id: true, title: true },
  });
  if (!brief) {
    return NextResponse.json({ error: 'Brief not found or no longer accepting bids' }, { status: 404 });
  }
  if (brief.client_id === session.user.id) {
    return NextResponse.json({ error: 'Cannot bid on your own brief' }, { status: 403 });
  }

  try {
    const bid = await prisma.bid.create({
      data: {
        brief_id,
        lawyer_id: session.user.id, // ALWAYS from session — never trust request body
        proposed_fee: Number(proposed_fee),
        fee_structure: fee_structure ?? 'flat',
        milestone_count: Number(milestone_count ?? 1),
        strategy_text,
        cover_letter: cover_letter ?? strategy_text,
        relevant_experience: relevant_experience ?? null,
        availability: availability ?? 'Immediately',
        estimated_timeline,
        status: 'pending',
      },
    });

    await prisma.notification.create({
      data: {
        user_id: brief.client_id,
        type: 'new_proposal',
        title: 'New Proposal Received',
        body: `You received a new proposal on "${brief.title}"`,
        link: `/client/briefs/${brief_id}`,
      },
    });

    return NextResponse.json({ bid });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json({ error: 'You have already submitted a proposal for this brief.' }, { status: 409 });
    }
    console.error('[POST /api/bids]', err);
    return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
  }
}
