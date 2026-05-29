/**
 * GET /api/cron/stuck-escrow
 *
 * Runs daily. Detects payments stuck in 'held' state for > 14 days.
 * Notifies all admins so they can investigate or take action.
 *
 * "Stuck" = payment.status === 'held' AND paid_at > 14 days ago AND
 *           case is not actively disputed (those are legitimately frozen).
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
import { formatCurrency } from '@/lib/utils/formatCurrency';
export const dynamic = 'force-dynamic';

const STUCK_THRESHOLD_DAYS = 14;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STUCK_THRESHOLD_DAYS);

  // Find held payments older than threshold, excluding actively disputed cases
  const stuckPayments = await prisma.payment.findMany({
    where: {
      status: 'held',
      paid_at: { lte: cutoff },
      case: {
        status: { notIn: ['disputed'] }, // disputed cases are legitimately frozen
      },
    },
    select: {
      id:               true,
      amount:           true,
      milestone_number: true,
      paid_at:          true,
      case_id:          true,
      case: {
        select: {
          title:      true,
          status:     true,
          client_id:  true,
          lawyer_id:  true,
        },
      },
    },
    take: 100,
  });

  if (stuckPayments.length === 0) {
    return NextResponse.json({ ok: true, stuckCount: 0, message: 'No stuck payments found.' });
  }

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true },
  });

  const totalStuck = formatCurrency(stuckPayments.reduce((s, p) => s + p.amount, 0));

  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type:   'stuck_escrow_alert',
      title:  `⚠ Stuck Escrow Alert — ${stuckPayments.length} payment(s)`,
      body:   `${stuckPayments.length} payment(s) totalling ${totalStuck} have been held in escrow for over ${STUCK_THRESHOLD_DAYS} days. Review required.`,
      link:   '/admin/ledger?reconcile=1',
      sendEmail: false,
    });
  }

  // Log to AdminLog for audit trail
  if (admins[0]) {
    await prisma.adminLog.create({
      data: {
        admin_id:    admins[0].id,
        action:      'stuck_escrow_scan',
        target_type: 'payment',
        notes:       `Found ${stuckPayments.length} stuck payment(s) totalling ${totalStuck}`,
        metadata:    {
          payment_ids:      stuckPayments.map((p) => p.id),
          threshold_days:   STUCK_THRESHOLD_DAYS,
          scanned_at:       new Date().toISOString(),
        },
      },
    });
  }

  return NextResponse.json({
    ok:         true,
    stuckCount: stuckPayments.length,
    totalValue: totalStuck,
    payments:   stuckPayments.map((p) => ({
      id:               p.id,
      caseId:           p.case_id,
      caseTitle:        p.case.title,
      amount:           p.amount,
      milestoneNumber:  p.milestone_number,
      paidAt:           p.paid_at,
      daysHeld:         Math.floor((Date.now() - new Date(p.paid_at!).getTime()) / 86_400_000),
    })),
  });
}
