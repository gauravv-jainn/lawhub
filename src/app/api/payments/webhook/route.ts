import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { appendLedger, LedgerEvent } from '@/lib/ledger';
import crypto from 'crypto';
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

    let event: {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
    };
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (event.event === 'payment.captured') {
      const entity   = event.payload?.payment?.entity;
      const orderId  = entity?.order_id;
      const rzpPayId = entity?.id;

      if (!orderId || !rzpPayId) {
        return NextResponse.json({ received: true });
      }

      // ── Webhook deduplication ───────────────────────────────────────────────
      // Use WebhookEvent table to prevent replay attacks / double-processing.
      // The @@unique([provider, event_id]) constraint causes a P2002 on duplicate.
      const eventId = `payment.captured:${rzpPayId}`;
      try {
        await prisma.webhookEvent.create({
          data: {
            provider:   'razorpay',
            event_id:   eventId,
            event_type: 'payment.captured',
            payload:    event as any,
          },
        });
      } catch (err: any) {
        // P2002 = unique constraint violation → already processed
        if (err?.code === 'P2002') {
          console.log(`[webhook] Duplicate event skipped: ${eventId}`);
          return NextResponse.json({ received: true });
        }
        throw err;
      }

      // Find the payment record for this order
      const payment = await prisma.payment.findFirst({
        where:  { razorpay_order_id: orderId, status: 'pending' },
        select: { id: true, case_id: true, milestone_id: true, amount: true },
      });

      if (payment) {
        // Atomically update payment status + append ledger
        await prisma.$transaction(async (tx) => {
          await (tx as any).payment.update({
            where: { id: payment.id },
            data:  { status: 'held', razorpay_payment_id: rzpPayId, paid_at: new Date() },
          });

          await appendLedger({
            tx,
            paymentId:   payment.id,
            caseId:      payment.case_id,
            milestoneId: payment.milestone_id,
            eventType:   LedgerEvent.PAYMENT_CAPTURED,
            amount:      payment.amount,
            metadata:    { razorpay_payment_id: rzpPayId, razorpay_order_id: orderId, source: 'webhook' },
          });
        });

        // Mark webhook as processed
        await prisma.webhookEvent.update({
          where: { provider_event_id: { provider: 'razorpay', event_id: eventId } },
          data:  { processed: true, processed_at: new Date() },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
