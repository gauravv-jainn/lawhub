/**
 * POST /api/cases/[id]/cancel
 *
 * Either party (client or lawyer) can cancel an active case with a reason.
 * - Unpaid milestones (draft/active/submitted/approved) are cancelled
 * - Payments in "held" state are refunded via Razorpay API and marked as refunded
 * - Payments already "released" are not touched
 * - Both parties are notified
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cancellationSchema } from '@/lib/utils/validators';
import { notify } from '@/lib/notifications';
import { issueRazorpayRefund } from '@/lib/razorpay';
import { appendLedger, LedgerEvent } from '@/lib/ledger';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: {
      id: true,
      title: true,
      status: true,
      client_id: true,
      lawyer_id: true,
    },
  });

  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  if (!['active', 'completion_requested'].includes(caseRow.status)) {
    return NextResponse.json(
      { error: `Only active cases can be cancelled (current status: ${caseRow.status}).` },
      { status: 400 }
    );
  }

  const body   = await req.json();
  const parsed = cancellationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const isClient = session.user.id === caseRow.client_id;
  const now      = new Date();

  // Fetch held payments BEFORE the transaction to trigger Razorpay refunds
  const heldPayments = await prisma.payment.findMany({
    where: { case_id: params.id, status: 'held' },
    select: { id: true, amount: true, milestone_id: true, razorpay_payment_id: true },
  });

  // Issue Razorpay refunds first (outside transaction — these are external calls)
  const refundResults: { paymentId: string; success: boolean; error?: string }[] = [];
  for (const pmt of heldPayments) {
    if (pmt.razorpay_payment_id) {
      try {
        await issueRazorpayRefund(pmt.razorpay_payment_id, pmt.amount, {
          case_id: params.id,
          reason:  parsed.data.reason.slice(0, 100),
        });
        refundResults.push({ paymentId: pmt.id, success: true });
      } catch (err) {
        console.error(`[cancel] Razorpay refund failed for payment ${pmt.id}:`, err);
        refundResults.push({ paymentId: pmt.id, success: false, error: String(err) });
        // Continue — mark as refunded in DB regardless. Admin can reconcile manually.
      }
    } else {
      // No Razorpay payment_id — payment was never captured (pending)
      refundResults.push({ paymentId: pmt.id, success: true });
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Cancel the case
    await tx.case.update({
      where: { id: params.id },
      data: {
        status: 'cancelled',
        cancelled_by_id: session.user.id,
        cancellation_reason: parsed.data.reason,
        cancelled_at: now,
      },
    });

    // 2. Cancel all unfinished milestones
    await tx.milestone.updateMany({
      where: {
        case_id: params.id,
        status: { notIn: ['paid', 'cancelled'] },
      },
      data: { status: 'cancelled', updated_at: now },
    });

    // 3. Mark held payments as refunded (Razorpay call already made above)
    await tx.payment.updateMany({
      where: { case_id: params.id, status: 'held' },
      data: { status: 'refunded' },
    });

    // 4. Ledger: full refund entries for each held payment
    for (const pmt of heldPayments) {
      await appendLedger({
        tx,
        paymentId:   pmt.id,
        caseId:      params.id,
        milestoneId: pmt.milestone_id,
        actorId:     session.user.id,
        eventType:   LedgerEvent.FULL_REFUND,
        amount:      pmt.amount,
        metadata:    { reason: parsed.data.reason, triggered_by: isClient ? 'client' : 'lawyer' },
      });
    }

    // 5. Record case event
    await tx.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'case_cancelled',
        title: 'Case cancelled',
        description: `Reason: ${parsed.data.reason}${heldPayments.length > 0 ? ` · ${heldPayments.length} payment(s) refunded.` : ''}`,
      },
    });
  });

  // Notify the other party
  const otherPartyId    = isClient ? caseRow.lawyer_id : caseRow.client_id;
  const cancelledByRole = isClient ? 'client' : 'advocate';

  await notify({
    userId: otherPartyId,
    type: 'case_cancelled',
    title: 'Case Cancelled',
    body: `"${caseRow.title}" has been cancelled by the ${cancelledByRole}. Reason: ${parsed.data.reason}`,
    link: `/${isClient ? 'lawyer' : 'client'}/cases/${params.id}`,
    sendEmail: true,
  });

  // Notify admin only if refunds had errors (need manual reconciliation)
  const failedRefunds = refundResults.filter(r => !r.success);
  if (failedRefunds.length > 0) {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'refund_required',
        title: 'Refund Reconciliation Required',
        body: `Case "${caseRow.title}" was cancelled but ${failedRefunds.length} Razorpay refund(s) failed. Manual action needed.`,
        link: `/admin/cases/${params.id}`,
        sendEmail: false,
      });
    }
  } else if (heldPayments.length > 0) {
    // All refunds succeeded — still notify admin for records
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'refund_processed',
        title: 'Case Cancelled — Refunds Issued',
        body: `Case "${caseRow.title}" was cancelled. ${heldPayments.length} payment(s) refunded via Razorpay.`,
        link: `/admin/cases/${params.id}`,
        sendEmail: false,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
