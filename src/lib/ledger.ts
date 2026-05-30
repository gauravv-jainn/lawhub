/**
 * Payment ledger helpers — immutable audit trail for all financial events.
 * Every call creates one row and never mutates existing rows.
 */
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type LedgerEventType =
  | 'order_created'
  | 'payment_captured'
  | 'escrow_held'
  | 'payment_released'
  | 'payment_refunded'
  | 'tds_deducted'
  | 'dispute_frozen'
  | 'dispute_unfrozen'
  | 'payout_initiated'
  | 'payout_completed'
  | 'payout_failed';

interface LedgerEntry {
  caseId:      string;
  eventType:   LedgerEventType;
  amount:      number;
  description: string;
  paymentId?:  string | null;
  actorId?:    string | null;
  metadata?:   Record<string, unknown> | null;
}

/** Write a single immutable ledger entry. Fires and forgets on error — never blocks the caller. */
export async function writeLedger(entry: LedgerEntry, tx?: Prisma.TransactionClient): Promise<void> {
  const data = {
    case_id:    entry.caseId,
    event_type: entry.eventType,
    amount:     entry.amount,
    description: entry.description,
    payment_id: entry.paymentId ?? null,
    actor_id:   entry.actorId ?? null,
    metadata:   entry.metadata as Prisma.InputJsonValue ?? Prisma.DbNull,
  };

  try {
    if (tx) {
      await tx.paymentLedger.create({ data });
    } else {
      await prisma.paymentLedger.create({ data });
    }
  } catch (err) {
    // Ledger write failure must never block the primary payment flow
    console.error('[ledger] Failed to write entry:', entry.eventType, err);
  }
}
