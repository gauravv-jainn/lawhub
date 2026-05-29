/**
 * Payment Ledger Service
 *
 * Immutable, append-only financial audit trail.
 * Every escrow action creates a ledger entry — no exceptions.
 *
 * Design principles:
 * - balance_before/after track escrow balance for each payment
 * - Fee/TDS entries are informational (don't change escrow balance)
 * - Must run inside Prisma transactions for atomicity
 * - Never update or delete entries (DB trigger enforces this)
 */

import 'server-only';
import type { PrismaClient } from '@prisma/client';

// ─── Event Types ─────────────────────────────────────────────────────────────

export const LedgerEvent = {
  PAYMENT_CREATED:       'PAYMENT_CREATED',
  ESCROW_HELD:           'ESCROW_HELD',
  PAYMENT_CAPTURED:      'PAYMENT_CAPTURED',
  MILESTONE_RELEASED:    'MILESTONE_RELEASED',
  PARTIAL_REFUND:        'PARTIAL_REFUND',
  FULL_REFUND:           'FULL_REFUND',
  PLATFORM_FEE_DEDUCTED: 'PLATFORM_FEE_DEDUCTED',
  TDS_DEDUCTED:          'TDS_DEDUCTED',
  DISPUTE_FROZEN:        'DISPUTE_FROZEN',
  DISPUTE_RESOLVED:      'DISPUTE_RESOLVED',
  ADMIN_OVERRIDE:        'ADMIN_OVERRIDE',
  PAYMENT_FAILED:        'PAYMENT_FAILED',
} as const;

export type LedgerEventKey = keyof typeof LedgerEvent;
export type LedgerEventValue = typeof LedgerEvent[LedgerEventKey];

// ─── Events that change escrow balance ───────────────────────────────────────
const BALANCE_INCREASING: LedgerEventValue[] = ['ESCROW_HELD', 'PAYMENT_CAPTURED'];
const BALANCE_DECREASING: LedgerEventValue[] = ['MILESTONE_RELEASED', 'FULL_REFUND', 'PARTIAL_REFUND'];

// ─── Append Ledger Entry ──────────────────────────────────────────────────────

interface AppendParams {
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
  paymentId: string;
  caseId: string;
  milestoneId?: string | null;
  disputeId?: string | null;
  actorId?: string | null;
  eventType: LedgerEventValue;
  amount: number; // in paise
  metadata?: Record<string, unknown>;
}

/**
 * Append an immutable ledger entry within a transaction.
 * MUST be called inside prisma.$transaction().
 */
export async function appendLedger(params: AppendParams): Promise<void> {
  const { tx, paymentId, caseId, eventType, amount } = params;

  // Read the most recent balance for this payment (within this transaction)
  const lastEntry = await (tx as any).paymentLedger.findFirst({
    where: { payment_id: paymentId },
    orderBy: { created_at: 'desc' },
    select: { balance_after: true },
  });

  const balanceBefore = lastEntry?.balance_after ?? 0;

  let balanceAfter = balanceBefore;
  if (BALANCE_INCREASING.includes(eventType)) {
    balanceAfter = balanceBefore + amount;
  } else if (BALANCE_DECREASING.includes(eventType)) {
    balanceAfter = Math.max(0, balanceBefore - amount);
  }
  // All other event types: balance unchanged (informational)

  await (tx as any).paymentLedger.create({
    data: {
      payment_id:    paymentId,
      case_id:       caseId,
      milestone_id:  params.milestoneId ?? null,
      dispute_id:    params.disputeId ?? null,
      actor_id:      params.actorId ?? null,
      event_type:    eventType,
      amount,
      balance_before: balanceBefore,
      balance_after:  balanceAfter,
      metadata:      params.metadata ?? null,
    },
  });
}

// ─── Query helpers (read-only, use outside transactions) ─────────────────────

import prisma from '@/lib/prisma';

/**
 * Get the current ledger-computed escrow balance for a payment.
 * Returns 0 if no ledger entries exist yet.
 */
export async function getLedgerBalance(paymentId: string): Promise<number> {
  const last = await prisma.paymentLedger.findFirst({
    where: { payment_id: paymentId },
    orderBy: { created_at: 'desc' },
    select: { balance_after: true },
  });
  return last?.balance_after ?? 0;
}

/**
 * Get full ledger history for a payment (oldest-first for display).
 */
export async function getPaymentLedger(paymentId: string) {
  return prisma.paymentLedger.findMany({
    where: { payment_id: paymentId },
    orderBy: { created_at: 'asc' },
    include: { actor: { select: { full_name: true, role: true } } },
  });
}

/**
 * Get all ledger entries for a case (newest-first for display).
 */
export async function getCaseLedger(caseId: string) {
  return prisma.paymentLedger.findMany({
    where: { case_id: caseId },
    orderBy: { created_at: 'desc' },
    include: {
      actor:   { select: { full_name: true, role: true } },
      payment: { select: { milestone_number: true } },
    },
  });
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export interface ReconciliationIssue {
  paymentId: string;
  caseId: string;
  milestoneNumber: number | null;
  dbStatus: string;
  dbAmount: number;
  ledgerBalance: number;
  issue: 'no_ledger_entries' | 'balance_mismatch' | 'held_but_zero_balance' | 'released_but_nonzero_balance';
}

/**
 * Find payments where DB state and ledger disagree.
 * Use this for admin reconciliation checks.
 */
export async function reconcilePayments(): Promise<ReconciliationIssue[]> {
  const issues: ReconciliationIssue[] = [];

  const paymentsToCheck = await prisma.payment.findMany({
    where: { status: { in: ['held', 'released', 'refunded'] } },
    select: {
      id: true,
      case_id: true,
      milestone_number: true,
      status: true,
      amount: true,
    },
    take: 500, // cap for performance
  });

  for (const pmt of paymentsToCheck) {
    const balance = await getLedgerBalance(pmt.id);

    // Check for missing ledger entries
    const entryCount = await prisma.paymentLedger.count({
      where: { payment_id: pmt.id },
    });

    if (entryCount === 0 && pmt.status !== 'pending') {
      issues.push({
        paymentId: pmt.id,
        caseId: pmt.case_id,
        milestoneNumber: pmt.milestone_number,
        dbStatus: pmt.status,
        dbAmount: pmt.amount,
        ledgerBalance: 0,
        issue: 'no_ledger_entries',
      });
      continue;
    }

    // Held payments should have a positive balance equal to amount
    if (pmt.status === 'held' && balance === 0 && entryCount > 0) {
      issues.push({
        paymentId: pmt.id,
        caseId: pmt.case_id,
        milestoneNumber: pmt.milestone_number,
        dbStatus: pmt.status,
        dbAmount: pmt.amount,
        ledgerBalance: balance,
        issue: 'held_but_zero_balance',
      });
    }

    // Released/refunded payments should have zero balance
    if (['released', 'refunded'].includes(pmt.status) && balance > 0) {
      issues.push({
        paymentId: pmt.id,
        caseId: pmt.case_id,
        milestoneNumber: pmt.milestone_number,
        dbStatus: pmt.status,
        dbAmount: pmt.amount,
        ledgerBalance: balance,
        issue: 'released_but_nonzero_balance',
      });
    }

    // Held payments with wrong balance
    if (pmt.status === 'held' && balance !== 0 && balance !== pmt.amount) {
      issues.push({
        paymentId: pmt.id,
        caseId: pmt.case_id,
        milestoneNumber: pmt.milestone_number,
        dbStatus: pmt.status,
        dbAmount: pmt.amount,
        ledgerBalance: balance,
        issue: 'balance_mismatch',
      });
    }
  }

  return issues;
}

// ─── Human-readable labels ────────────────────────────────────────────────────

export const LEDGER_EVENT_LABELS: Record<string, string> = {
  PAYMENT_CREATED:       'Payment order created',
  ESCROW_HELD:           'Funds held in escrow',
  PAYMENT_CAPTURED:      'Payment captured by gateway',
  MILESTONE_RELEASED:    'Funds released to advocate',
  PARTIAL_REFUND:        'Partial refund to client',
  FULL_REFUND:           'Full refund to client',
  PLATFORM_FEE_DEDUCTED: 'Platform fee deducted',
  TDS_DEDUCTED:          'TDS (194J) deducted',
  DISPUTE_FROZEN:        'Funds frozen — dispute raised',
  DISPUTE_RESOLVED:      'Dispute resolved',
  ADMIN_OVERRIDE:        'Admin action',
  PAYMENT_FAILED:        'Payment failed',
};
