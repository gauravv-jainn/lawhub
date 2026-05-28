import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;

      if (orderId && paymentId) {
        await prisma.payment.updateMany({
          where: { razorpay_order_id: orderId, status: 'pending' },
          data: { status: 'held', razorpay_payment_id: paymentId, paid_at: new Date() },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
