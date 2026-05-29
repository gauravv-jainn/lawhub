/**
 * GET   /api/admin/cases/[id]  — full case view with all data
 * PATCH /api/admin/cases/[id]  — admin overrides (force_complete, force_cancel, release_payment, refund_payment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
import { issueRazorpayRefund } from '@/lib/razorpay';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const caseRow = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      brief: { select: { title: true, category: true } },
      client: { select: { id: true, full_name: true, email: true } },
      lawyer: { select: { id: true, full_name: true, email: true } },
      milestones: { orderBy: { number: 'asc' }, include: { payment: true, attachments: true } },
      payments:   { orderBy: { milestone_number: 'asc' } },
      events:     { orderBy: { created_at: 'asc' } },
      messages: {
        orderBy: { created_at: 'asc' },
        include: { sender: { select: { full_name: true, role: true } } },
      },
      dispute: true,
    },
  });

  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  return NextResponse.json({ case: caseRow });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const caseRow = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, client_id: true, lawyer_id: true, status: true },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const body   = await req.json();
  const action = body.action as string;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const now    = new Date();

  if (action === 'force_complete') {
    await prisma.case.update({
      where: { id: params.id },
      data: { status: 'completed' },
    });
    await prisma.caseEvent.create({
      data: {
        case_id: params.id, actor_id: session.user.id,
        event_type: 'admin_force_complete',
        title: 'Case force-completed by admin',
        description: reason || 'Admin override.',
      },
    });
    await prisma.adminLog.create({
      data: {
        admin_id:    session.user.id,
        action:      'force_complete_case',
        target_id:   params.id,
        target_type: 'case',
        notes:       reason || 'Admin override',
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'force_cancel') {
    if (!reason) return NextResponse.json({ error: 'Reason required for forced cancellation.' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: params.id },
        data: {
          status: 'cancelled',
          cancelled_by_id: session.user.id,
          cancellation_reason: reason,
          cancelled_at: now,
        },
      });
      await tx.milestone.updateMany({
        where: { case_id: params.id, status: { in: ['active', 'submitted', 'approved'] } },
        data: { status: 'cancelled', updated_at: now },
      });
      await tx.payment.updateMany({
        where: { case_id: params.id, status: 'held' },
        data: { status: 'refunded' },
      });
      await tx.caseEvent.create({
        data: {
          case_id: params.id, actor_id: session.user.id,
          event_type: 'admin_force_cancel',
          title: 'Case cancelled by admin',
          description: reason,
        },
      });
    });

    await Promise.all([
      notify({ userId: caseRow.client_id, type: 'case_cancelled', title: 'Your Case Was Cancelled',
        body: `Case "${caseRow.title}" was cancelled by the platform. Reason: ${reason}`,
        link: `/client/cases/${params.id}`, sendEmail: true }),
      notify({ userId: caseRow.lawyer_id, type: 'case_cancelled', title: 'Case Cancelled by Platform',
        body: `Case "${caseRow.title}" was cancelled by the platform. Reason: ${reason}`,
        link: `/lawyer/cases/${params.id}`, sendEmail: true }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === 'release_payment') {
    const paymentId = body.paymentId as string;
    if (!paymentId) return NextResponse.json({ error: 'paymentId required.' }, { status: 400 });

    const pmt = await prisma.payment.findFirst({
      where: { id: paymentId, case_id: params.id, status: 'held' },
    });
    if (!pmt) return NextResponse.json({ error: 'Payment not found or not in held state.' }, { status: 404 });

    const tds = pmt.amount >= 3_000_000 ? Math.round(pmt.amount * 0.10) : 0;
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'released',
        tds_applicable: pmt.amount >= 3_000_000,
        tds_amount: tds,
        lawyer_final_amount: pmt.amount - tds,
        paid_at: now,
      },
    });
    if (pmt.milestone_id) {
      await prisma.milestone.update({ where: { id: pmt.milestone_id }, data: { status: 'paid', updated_at: now } });
    }
    await prisma.caseEvent.create({
      data: {
        case_id: params.id, actor_id: session.user.id,
        event_type: 'admin_payment_released',
        title: `Admin released payment for milestone ${pmt.milestone_number}`,
        description: reason || 'Admin override.',
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'refund_payment') {
    const paymentId = body.paymentId as string;
    if (!paymentId) return NextResponse.json({ error: 'paymentId required.' }, { status: 400 });

    const pmt = await prisma.payment.findFirst({
      where: { id: paymentId, case_id: params.id, status: 'held' },
      select: { id: true, amount: true, razorpay_payment_id: true },
    });
    if (!pmt) {
      return NextResponse.json({ error: 'Payment not found or not in held state.' }, { status: 404 });
    }

    // Issue actual Razorpay refund if a payment was captured
    if (pmt.razorpay_payment_id) {
      try {
        await issueRazorpayRefund(pmt.razorpay_payment_id, pmt.amount, {
          admin_action: 'manual_refund',
          reason: reason?.slice(0, 100) ?? 'Admin override',
          case_id: params.id,
        });
      } catch (err) {
        console.error(`[admin/refund_payment] Razorpay refund failed:`, err);
        return NextResponse.json(
          { error: `Razorpay refund failed: ${String(err)}. Payment not marked as refunded.` },
          { status: 502 }
        );
      }
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
    });
    await prisma.caseEvent.create({
      data: {
        case_id: params.id, actor_id: session.user.id,
        event_type: 'admin_payment_refunded',
        title: `Admin issued refund for payment`,
        description: reason || 'Admin override.',
      },
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        admin_id:    session.user.id,
        action:      'refund_payment',
        target_id:   paymentId,
        target_type: 'payment',
        notes:       reason || 'Admin override',
        metadata:    { caseId: params.id, amount: pmt.amount },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
