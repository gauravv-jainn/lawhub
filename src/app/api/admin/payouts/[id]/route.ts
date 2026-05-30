/**
 * PATCH /api/admin/payouts/[id]  — update payout status (complete, fail, retry)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeLedger } from '@/lib/ledger';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const updateSchema = z.discriminatedUnion('action', [
  z.object({
    action:         z.literal('complete'),
    utr:            z.string().min(1).max(50),
  }),
  z.object({
    action:         z.literal('fail'),
    failure_reason: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('retry'),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payout = await prisma.payout.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, lawyer_id: true, amount: true, payment_ids: true },
  });

  if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });

  const { action } = parsed.data;
  const now = new Date();

  if (action === 'complete') {
    if (!['pending', 'processing'].includes(payout.status)) {
      return NextResponse.json({ error: 'Only pending/processing payouts can be completed.' }, { status: 400 });
    }

    await prisma.payout.update({
      where: { id: params.id },
      data: {
        status:       'completed',
        utr:          parsed.data.utr,
        completed_at: now,
      },
    });

    // Write ledger entries linked to payment IDs
    const paymentIds = payout.payment_ids as string[];
    if (paymentIds.length > 0) {
      const payments = await prisma.payment.findMany({
        where: { id: { in: paymentIds } },
        select: { id: true, case_id: true, amount: true },
      });
      const caseMap = new Map<string, { paymentId: string; amount: number }[]>();
      for (const p of payments) {
        if (!caseMap.has(p.case_id)) caseMap.set(p.case_id, []);
        caseMap.get(p.case_id)!.push({ paymentId: p.id, amount: p.amount });
      }
      for (const [caseId, pmts] of caseMap) {
        await writeLedger({
          caseId,
          eventType:   'payout_completed',
          amount:      pmts.reduce((s, p) => s + p.amount, 0),
          description: `Payout completed. UTR: ${parsed.data.utr}`,
          actorId:     session.user.id,
          metadata:    { payout_id: params.id, utr: parsed.data.utr },
        });
      }
    }

    await prisma.notification.create({
      data: {
        user_id: payout.lawyer_id,
        type:    'payout_completed',
        title:   'Payout Completed',
        body:    `Your payout of ₹${payout.amount / 100} has been transferred. UTR: ${parsed.data.utr}`,
        link:    '/lawyer/payouts',
      },
    });

  } else if (action === 'fail') {
    if (!['pending', 'processing'].includes(payout.status)) {
      return NextResponse.json({ error: 'Only pending/processing payouts can be marked failed.' }, { status: 400 });
    }

    await prisma.payout.update({
      where: { id: params.id },
      data: {
        status:         'failed',
        failure_reason: parsed.data.failure_reason,
        failed_at:      now,
      },
    });

    const paymentIds = payout.payment_ids as string[];
    if (paymentIds.length > 0) {
      const payments = await prisma.payment.findMany({
        where: { id: { in: paymentIds } },
        select: { id: true, case_id: true, amount: true },
      });
      for (const p of payments) {
        await writeLedger({
          caseId:      p.case_id,
          eventType:   'payout_failed',
          amount:      p.amount,
          description: `Payout failed: ${parsed.data.failure_reason}`,
          paymentId:   p.id,
          actorId:     session.user.id,
          metadata:    { payout_id: params.id },
        });
      }
    }

    await prisma.notification.create({
      data: {
        user_id: payout.lawyer_id,
        type:    'payout_failed',
        title:   'Payout Failed',
        body:    `Your payout of ₹${payout.amount / 100} failed. Reason: ${parsed.data.failure_reason}. Please contact support.`,
        link:    '/lawyer/payouts',
      },
    });

  } else if (action === 'retry') {
    if (payout.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed payouts can be retried.' }, { status: 400 });
    }

    await prisma.payout.update({
      where: { id: params.id },
      data: {
        status:         'pending',
        failure_reason: null,
        failed_at:      null,
      },
    });
  }

  await prisma.adminLog.create({
    data: {
      admin_id:    session.user.id,
      action:      `payout_${action}`,
      target_id:   params.id,
      target_type: 'payout',
      metadata:    body,
    },
  });

  return NextResponse.json({ ok: true });
}
