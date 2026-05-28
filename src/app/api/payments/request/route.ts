import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'lawyer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, nextMilestone } = await req.json() as {
      caseId?: string;
      nextMilestone?: number;
    };

    if (!caseId || nextMilestone === undefined) {
      return NextResponse.json({ error: 'caseId and nextMilestone are required' }, { status: 400 });
    }

    const caseData = await prisma.case.findFirst({
      where: { id: caseId, lawyer_id: session.user.id },
      select: {
        id: true,
        client_id: true,
        lawyer_id: true,
        status: true,
        current_milestone: true,
        milestone_count: true,
        total_fee: true,
      },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (caseData.status !== 'active') {
      return NextResponse.json({ error: 'Case is not active' }, { status: 400 });
    }
    if (nextMilestone < 1 || nextMilestone > caseData.milestone_count) {
      return NextResponse.json({ error: 'Invalid milestone number' }, { status: 400 });
    }

    // Ensure no duplicate payment request for this milestone
    const existing = await prisma.payment.findFirst({
      where: { case_id: caseId, milestone_number: nextMilestone },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Payment for this milestone has already been requested' },
        { status: 409 }
      );
    }

    // Compute amount from agreed fee — never accept from client
    const milestoneAmount = Math.round(caseData.total_fee / caseData.milestone_count);
    const platformFee = Math.round(milestoneAmount * 0.1);
    const netAmount = milestoneAmount - platformFee;

    // Status is 'pending_payment' — awaiting client to initiate Razorpay
    // (NOT 'held' — that only happens after Razorpay confirms money movement)
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          case_id: caseId,
          client_id: caseData.client_id,
          lawyer_id: session.user.id,
          milestone_number: nextMilestone,
          amount: milestoneAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: 'pending',
        },
      }),
      prisma.notification.create({
        data: {
          user_id: caseData.client_id,
          type: 'payment_requested',
          title: 'Payment Requested',
          body: `Your advocate has requested payment for Milestone ${nextMilestone}`,
          link: `/client/cases/${caseId}`,
        },
      }),
    ]);

    return NextResponse.json({ payment });
  } catch (err: unknown) {
    console.error('[POST /api/payments/request]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
