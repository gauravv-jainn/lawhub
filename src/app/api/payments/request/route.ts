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

    const { caseId, nextMilestone, milestoneAmount, platformFee, netAmount } = await req.json();

    if (!caseId || !nextMilestone || !milestoneAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the case belongs to this lawyer
    const caseData = await prisma.case.findFirst({
      where: { id: caseId, lawyer_id: session.user.id },
      select: { id: true, client_id: true, lawyer_id: true, status: true, current_milestone: true, milestone_count: true },
    });

    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (caseData.status !== 'active') {
      return NextResponse.json({ error: 'Case is not active' }, { status: 400 });
    }

    // Check if a payment for this milestone already exists
    const existing = await prisma.payment.findFirst({
      where: { case_id: caseId, milestone_number: nextMilestone },
    });
    if (existing) {
      return NextResponse.json({ error: 'Payment for this milestone has already been requested' }, { status: 409 });
    }

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
          status: 'held',
        },
      }),
      prisma.case.update({
        where: { id: caseId },
        data: { current_milestone: nextMilestone },
      }),
      // Notify client
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
  } catch (err) {
    console.error('[POST /api/payments/request]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
