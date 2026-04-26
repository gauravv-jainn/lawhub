import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseId, milestoneNumber, amount } = await req.json();

    // Verify case belongs to this client
    const caseData = await prisma.case.findFirst({
      where: { id: caseId, client_id: session.user.id },
    });
    if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    // Create Razorpay order
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `case_${caseId}_ms_${milestoneNumber}`,
        notes: { case_id: caseId, milestone: milestoneNumber, client_id: session.user.id, lawyer_id: caseData.lawyer_id },
      }),
    });

    const order = await orderRes.json();
    if (!order.id) return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });

    const platformFee = Math.round(amount * 0.1);
    const netAmount = amount - platformFee;

    const payment = await prisma.payment.create({
      data: {
        case_id: caseId,
        client_id: session.user.id,
        lawyer_id: caseData.lawyer_id,
        milestone_number: milestoneNumber,
        amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: 'pending',
        razorpay_order_id: order.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      keyId: razorpayKeyId,
    });
  } catch (err) {
    console.error('Payment create-order error:', err);
    return NextResponse.json({ error: 'Payment service error' }, { status: 500 });
  }
}
