import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bidId } = await req.json();
    if (!bidId) return NextResponse.json({ error: 'bidId required' }, { status: 400 });

    // Load the bid with brief info
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { brief: true },
    });

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    if (bid.brief.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run in a transaction: accept bid, create case, close brief
    const [updatedBid, newCase] = await prisma.$transaction(async (tx) => {
      const accepted = await tx.bid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      const created = await tx.case.create({
        data: {
          title: bid.brief.title,
          brief_id: bid.brief_id,
          client_id: bid.brief.client_id,
          lawyer_id: bid.lawyer_id,
          status: 'active',
          total_fee: bid.proposed_fee,
          fee_structure: bid.fee_structure ?? 'flat',
          milestone_count: bid.milestone_count ?? 1,
          current_milestone: 0,
        },
      });

      await tx.brief.update({
        where: { id: bid.brief_id },
        data: { status: 'closed' },
      });

      return [accepted, created];
    });

    return NextResponse.json({ caseId: newCase.id, bidId: updatedBid.id });
  } catch (err) {
    console.error('[POST /api/bids/accept]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
