import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = await req.json();

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'held', razorpay_payment_id: razorpayPaymentId, paid_at: new Date() },
    });

    // Create case event
    await prisma.caseEvent.create({
      data: {
        case_id: payment.case_id,
        actor_id: session.user.id,
        event_type: 'milestone_paid',
        title: `Milestone ${payment.milestone_number} Payment Received`,
        description: `Payment of ₹${payment.amount / 100} is held in escrow.`,
      },
    });

    // Notify lawyer
    const caseData = await prisma.case.findUnique({ where: { id: payment.case_id } });
    if (caseData) {
      await prisma.notification.create({
        data: {
          user_id: caseData.lawyer_id,
          type: 'payment_received',
          title: 'Milestone Payment in Escrow',
          body: `Milestone ${payment.milestone_number} payment is held in escrow for "${caseData.title}".`,
          link: `/lawyer/cases/${payment.case_id}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Payment verify error:', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 500 });
  }
}
