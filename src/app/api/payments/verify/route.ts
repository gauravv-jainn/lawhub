import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { appendLedger, LedgerEvent } from '@/lib/ledger';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = await req.json() as {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paymentId?: string;
    };

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
      return NextResponse.json({ error: 'All payment fields are required' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // Verify Razorpay HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    let signaturesMatch = false;
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpaySignature, 'hex')
      );
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Ownership check: payment must belong to this client and be in pending state
    const existingPayment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        client_id: session.user.id,
        razorpay_order_id: razorpayOrderId,
        status: 'pending',
      },
      select: {
        id: true,
        case_id: true,
        milestone_id: true,
        milestone_number: true,
        amount: true,
        platform_fee: true,
        lawyer_id: true,
      },
    });
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found or already processed' }, { status: 404 });
    }

    const platformFee = existingPayment.platform_fee ?? Math.round(existingPayment.amount * 0.10);

    // Atomically update payment + record ledger entries
    const payment = await prisma.$transaction(async (tx) => {
      const pmt = await (tx as any).payment.update({
        where: { id: paymentId },
        data: { status: 'held', razorpay_payment_id: razorpayPaymentId, paid_at: new Date() },
      });

      // Escrow held — balance increases by the full payment amount
      await appendLedger({
        tx,
        paymentId:   existingPayment.id,
        caseId:      existingPayment.case_id,
        milestoneId: existingPayment.milestone_id,
        actorId:     session.user.id,
        eventType:   LedgerEvent.ESCROW_HELD,
        amount:      existingPayment.amount,
        metadata:    { razorpay_payment_id: razorpayPaymentId, razorpay_order_id: razorpayOrderId },
      });

      // Platform fee — informational only, does not change escrow balance
      if (platformFee > 0) {
        await appendLedger({
          tx,
          paymentId:   existingPayment.id,
          caseId:      existingPayment.case_id,
          milestoneId: existingPayment.milestone_id,
          actorId:     session.user.id,
          eventType:   LedgerEvent.PLATFORM_FEE_DEDUCTED,
          amount:      platformFee,
          metadata:    { rate: '10%' },
        });
      }

      // Record case event
      await (tx as any).caseEvent.create({
        data: {
          case_id:    existingPayment.case_id,
          actor_id:   session.user.id,
          event_type: 'milestone_paid',
          title:      `Milestone ${existingPayment.milestone_number} Payment Received`,
          description: `Payment of ₹${existingPayment.amount / 100} is held in escrow.`,
        },
      });

      return pmt;
    });

    // Notify lawyer outside the transaction (non-blocking)
    await prisma.notification.create({
      data: {
        user_id: existingPayment.lawyer_id,
        type:    'payment_received',
        title:   'Milestone Payment in Escrow',
        body:    `Milestone ${existingPayment.milestone_number} payment is held in escrow.`,
        link:    `/lawyer/cases/${existingPayment.case_id}`,
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (err: unknown) {
    console.error('[POST /api/payments/verify]', err);
    return NextResponse.json({ error: 'Verification error' }, { status: 500 });
  }
}
