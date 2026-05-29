/**
 * POST /api/payments/create-order
 *
 * Client initiates payment for an APPROVED milestone.
 * The milestone must be in status="approved" before payment can begin.
 * Amount comes from the milestone record — never from the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { caseId, milestoneNumber } = (await req.json()) as {
    caseId?: string;
    milestoneNumber?: number;
  };

  if (!caseId || milestoneNumber === undefined) {
    return NextResponse.json({ error: 'caseId and milestoneNumber are required.' }, { status: 400 });
  }

  // Fetch case — only the client can pay
  const caseRow = await prisma.case.findFirst({
    where: { id: caseId, client_id: session.user.id },
    select: { id: true, title: true, lawyer_id: true, status: true },
  });

  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  if (caseRow.status === 'disputed') {
    return NextResponse.json(
      { error: 'Payments are frozen while a dispute is active.' },
      { status: 400 }
    );
  }

  if (caseRow.status === 'cancelled' || caseRow.status === 'completed') {
    return NextResponse.json(
      { error: 'Cannot make payments on a closed case.' },
      { status: 400 }
    );
  }

  // Fetch the milestone — must be in "approved" status
  const milestone = await prisma.milestone.findUnique({
    where: { case_id_number: { case_id: caseId, number: milestoneNumber } },
    select: {
      id: true,
      title: true,
      amount: true,
      status: true,
      payment: { select: { id: true, status: true } },
    },
  });

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  }

  if (milestone.status !== 'approved') {
    return NextResponse.json(
      { error: `Milestone must be approved before payment. Current status: "${milestone.status}".` },
      { status: 400 }
    );
  }

  if (milestone.payment && ['held', 'released'].includes(milestone.payment.status)) {
    return NextResponse.json(
      { error: 'This milestone has already been paid.' },
      { status: 409 }
    );
  }

  const amount       = milestone.amount; // in paise — from DB, never from client
  const platformFee  = Math.round(amount * 0.10);
  const netAmount    = amount - platformFee;

  const razorpayKeyId     = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 500 });
  }

  const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

  const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `case_${caseId}_ms_${milestoneNumber}`,
      notes: {
        case_id:          caseId,
        milestone_id:     milestone.id,
        milestone_number: milestoneNumber,
        client_id:        session.user.id,
        lawyer_id:        caseRow.lawyer_id,
      },
    }),
  });

  const order = (await orderRes.json()) as { id?: string; amount?: number; currency?: string; error?: unknown };

  if (!order.id) {
    console.error('[create-order] Razorpay error:', order.error);
    return NextResponse.json({ error: 'Failed to create payment order.' }, { status: 500 });
  }

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: {
      milestone_id: milestone.id,
    },
    create: {
      case_id:          caseId,
      client_id:        session.user.id,
      lawyer_id:        caseRow.lawyer_id,
      milestone_id:     milestone.id,
      milestone_number: milestoneNumber,
      amount,
      platform_fee:     platformFee,
      net_amount:       netAmount,
      status:           'pending',
      razorpay_order_id: order.id,
    },
    update: {
      razorpay_order_id: order.id,
      status:            'pending',
    },
  });

  return NextResponse.json({
    orderId:   order.id,
    amount:    order.amount,
    currency:  order.currency,
    paymentId: payment.id,
    keyId:     razorpayKeyId,
  });
}
