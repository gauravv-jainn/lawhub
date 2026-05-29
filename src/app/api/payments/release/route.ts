/**
 * POST /api/payments/release
 *
 * Client releases a held escrow payment to the lawyer.
 * - Payment must be in "held" state
 * - Case must not be disputed
 * - TDS Section 194J applied server-side for amounts >= ₹30,000
 * - Milestone moves to "paid"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { appendLedger, LedgerEvent } from '@/lib/ledger';
export const dynamic = 'force-dynamic';

// TDS Section 194J: 10% on professional fees >= ₹30,000
// Amounts stored in paise: ₹30,000 = 3,000,000 paise
const TDS_THRESHOLD = 3_000_000;
const TDS_RATE      = 0.10;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { paymentId } = (await req.json()) as { paymentId?: string };
  if (!paymentId) return NextResponse.json({ error: 'paymentId required.' }, { status: 400 });

  // Load payment metadata (without changing status yet — optimistic lock applied inside tx)
  const payment = await prisma.payment.findFirst({
    where: {
      id:        paymentId,
      client_id: session.user.id, // ownership check
      status:    'held',
    },
    select: {
      id: true,
      amount: true,
      case_id: true,
      lawyer_id: true,
      milestone_id: true,
      milestone_number: true,
      case: {
        select: {
          title: true,
          status: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json(
      { error: 'Payment not found, not yours, or not in escrow.' },
      { status: 404 }
    );
  }

  if (payment.case.status === 'disputed') {
    return NextResponse.json(
      { error: 'Payments are frozen while a dispute is active.' },
      { status: 400 }
    );
  }

  // TDS calculation — server-side only, never accept from client
  const tds_applicable      = payment.amount >= TDS_THRESHOLD;
  const tds_amount          = tds_applicable ? Math.round(payment.amount * TDS_RATE) : 0;
  const lawyer_final_amount = payment.amount - tds_amount;

  try {
  await prisma.$transaction(async (tx) => {
    // 1. Optimistic lock: the WHERE status='held' makes this atomic.
    //    If two concurrent release requests both arrive, only one UPDATE will match
    //    (the second sees status='released' and updates 0 rows → throws).
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, client_id: session.user.id, status: 'held' },
      data: {
        status: 'released',
        tds_applicable,
        tds_amount,
        lawyer_final_amount,
        paid_at: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new Error('PAYMENT_ALREADY_PROCESSED');
    }

    // 2. Mark milestone as paid
    if (payment.milestone_id) {
      await tx.milestone.update({
        where: { id: payment.milestone_id },
        data: { status: 'paid', updated_at: new Date() },
      });
    }

    // 3. Record case event
    await tx.caseEvent.create({
      data: {
        case_id:    payment.case_id,
        actor_id:   session.user.id,
        event_type: 'payment_released',
        title:      `Milestone ${payment.milestone_number} payment released`,
        description: `${formatCurrency(payment.amount)} released to advocate.${tds_applicable ? ` TDS of ${formatCurrency(tds_amount)} deducted.` : ''}`,
      },
    });

    // 4. Ledger: funds leave escrow
    await appendLedger({
      tx,
      paymentId:   paymentId,
      caseId:      payment.case_id,
      milestoneId: payment.milestone_id,
      actorId:     session.user.id,
      eventType:   LedgerEvent.MILESTONE_RELEASED,
      amount:      payment.amount,
      metadata:    { lawyer_final_amount, tds_applicable },
    });

    // 5. Ledger: TDS informational entry (does not change escrow balance)
    if (tds_applicable && tds_amount > 0) {
      await appendLedger({
        tx,
        paymentId:   paymentId,
        caseId:      payment.case_id,
        milestoneId: payment.milestone_id,
        actorId:     session.user.id,
        eventType:   LedgerEvent.TDS_DEDUCTED,
        amount:      tds_amount,
        metadata:    { section: '194J', rate: '10%', threshold_paise: 3_000_000 },
      });
    }
  });
  } catch (err: any) {
    if (err?.message === 'PAYMENT_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Payment has already been released.' }, { status: 409 });
    }
    throw err; // re-throw to be caught by Next.js error handler
  }

  // Notify lawyer — with email (payment received is critical)
  await notify({
    userId: payment.lawyer_id,
    type: 'payment_released',
    title: `Payment Released — Milestone ${payment.milestone_number}`,
    body: `${formatCurrency(lawyer_final_amount)} has been released for milestone ${payment.milestone_number} of "${payment.case.title}".`,
    link: `/lawyer/cases/${payment.case_id}`,
    sendEmail: true,
    emailData: {
      amount:        payment.amount,
      platformFee:   payment.amount - payment.amount * 0.9,
      netAmount:     lawyer_final_amount,
      caseTitle:     payment.case.title,
      milestoneName: `Milestone ${payment.milestone_number}`,
      paymentId:     paymentId,
      isLawyer:      true,
    },
  });

  return NextResponse.json({ ok: true });
}
