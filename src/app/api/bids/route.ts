import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    brief_id,
    lawyer_id,
    proposed_fee,
    fee_structure,
    milestone_count,
    strategy_text,
    cover_letter,
    relevant_experience,
    availability,
    estimated_timeline,
    status,
  } = body;

  if (!brief_id || !proposed_fee || !strategy_text || !estimated_timeline) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const bid = await prisma.bid.create({
      data: {
        brief_id,
        lawyer_id: lawyer_id ?? session.user.id,
        proposed_fee: Number(proposed_fee),
        fee_structure: fee_structure ?? 'flat',
        milestone_count: Number(milestone_count ?? 1),
        strategy_text,
        cover_letter: cover_letter ?? strategy_text,
        relevant_experience: relevant_experience ?? null,
        availability: availability ?? 'Immediately',
        estimated_timeline,
        status: status ?? 'pending',
      },
    });

    // Notify client
    const brief = await prisma.brief.findUnique({
      where: { id: brief_id },
      select: { client_id: true, title: true },
    });
    if (brief) {
      await prisma.notification.create({
        data: {
          user_id: brief.client_id,
          type: 'new_proposal',
          title: 'New Proposal Received',
          body: `You received a new proposal on "${brief.title}"`,
          link: `/client/briefs/${brief_id}`,
        },
      });
    }

    return NextResponse.json({ bid });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'You have already submitted a proposal for this brief.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
  }
}
