import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { writeLedger } from '@/lib/ledger';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const body = await req.text();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    let signaturesMatch = false;
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (orderId && razorpayPaymentId) {
        // Find the pending payment for this order (idempotency: skip if already held)
        const dbPayment = await prisma.payment.findFirst({
          where: { razorpay_order_id: orderId, status: 'pending' },
          select: { id: true, case_id: true, amount: true, milestone_number: true },
        });

        if (dbPayment) {
          try {
            await prisma.payment.update({
              where: { id: dbPayment.id },
              data: { status: 'held', razorpay_payment_id: razorpayPaymentId, paid_at: new Date() },
            });

            await Promise.all([
              writeLedger({
                caseId:      dbPayment.case_id,
                eventType:   'payment_captured',
                amount:      dbPayment.amount,
                description: `Webhook: Razorpay payment captured for milestone ${dbPayment.milestone_number}`,
                paymentId:   dbPayment.id,
                metadata:    { razorpay_payment_id: razorpayPaymentId, razorpay_order_id: orderId },
              }),
              writeLedger({
                caseId:      dbPayment.case_id,
                eventType:   'escrow_held',
                amount:      dbPayment.amount,
                description: `Webhook: ₹${dbPayment.amount / 100} held in escrow for milestone ${dbPayment.milestone_number}`,
                paymentId:   dbPayment.id,
              }),
            ]);
          } catch (updateErr: unknown) {
            // P2002 = unique constraint violation on razorpay_payment_id — already processed
            const isPrismaError = (e: unknown): e is { code: string } =>
              typeof e === 'object' && e !== null && 'code' in e;
            if (isPrismaError(updateErr) && updateErr.code === 'P2002') {
              console.warn('[webhook] Duplicate payment_captured ignored:', razorpayPaymentId);
            } else {
              throw updateErr;
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
