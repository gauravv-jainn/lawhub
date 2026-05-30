/**
 * GET   /api/admin/disputes/[id]  — dispute detail
 * PATCH /api/admin/disputes/[id]  — resolve, assign, or update dispute
 *
 * PATCH actions:
 *   assign         — admin takes ownership
 *   resolve        — admin rules: resolved_client | resolved_lawyer | partial_refund | settled
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { disputeResolveSchema } from '@/lib/utils/validators';
import { notify } from '@/lib/notifications';
import { issueRazorpayRefund } from '@/lib/razorpay';
import { writeLedger } from '@/lib/ledger';
import { recalculateLawyerMetrics } from '@/lib/metrics';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      case: {
        include: {
          client: { select: { id: true, full_name: true, email: true } },
          lawyer: { select: { id: true, full_name: true, email: true } },
          milestones: { orderBy: { number: 'asc' } },
          payments: { orderBy: { milestone_number: 'asc' } },
          events: {
            orderBy: { created_at: 'asc' },
            include: { actor: { select: { full_name: true, role: true } } },
          },
        },
      },
      raised_by: { select: { id: true, full_name: true, role: true } },
      evidence: {
        orderBy: { created_at: 'asc' },
        include: { uploader: { select: { full_name: true, role: true } } },
      },
    },
  });

  if (!dispute) return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  return NextResponse.json({ dispute });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body   = await req.json();
  const action = body.action as string;

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      case: {
        select: {
          id: true,
          title: true,
          client_id: true,
          lawyer_id: true,
          status: true,
        },
      },
    },
  });

  if (!dispute) return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });

  // ── assign — admin takes ownership ──────────────────────────────────────
  if (action === 'assign') {
    await prisma.dispute.update({
      where: { id: params.id },
      data: {
        admin_id: session.user.id,
        status: 'under_review',
        updated_at: new Date(),
      },
    });

    await prisma.adminLog.create({
      data: {
        admin_id:    session.user.id,
        action:      'assign_dispute',
        target_id:   params.id,
        target_type: 'dispute',
      },
    });

    return NextResponse.json({ ok: true });
  }

  // ── resolve — admin makes a ruling ──────────────────────────────────────
  if (action === 'resolve') {
    const parsed = disputeResolveSchema.safeParse({
      dispute_id:      params.id,
      resolution:      body.resolution,
      resolution_note: body.resolution_note,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { resolution, resolution_note } = parsed.data;
    const now = new Date();

    // For partial_refund, expect refund_percentage (0-100)
    const refundPct = typeof body.refund_percentage === 'number'
      ? Math.max(0, Math.min(100, body.refund_percentage))
      : 50;

    // Fetch held payments for Razorpay refund calls
    const heldPayments = await prisma.payment.findMany({
      where: { case_id: dispute.case_id, status: 'held' },
      select: { id: true, amount: true, razorpay_payment_id: true, milestone_id: true },
    });

    // Process Razorpay refunds outside the transaction
    if (resolution === 'resolved_client' || resolution === 'partial_refund') {
      for (const pmt of heldPayments) {
        if (pmt.razorpay_payment_id) {
          const refundAmount = resolution === 'partial_refund'
            ? Math.round(pmt.amount * (refundPct / 100))
            : pmt.amount;
          try {
            await issueRazorpayRefund(pmt.razorpay_payment_id, refundAmount, {
              dispute_id:  params.id,
              resolution,
              admin_id:    session.user.id,
            });
          } catch (err) {
            console.error(`[admin/dispute resolve] Razorpay refund failed for payment ${pmt.id}:`, err);
            // Log but continue — mark in DB, admin must reconcile
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update dispute
      await tx.dispute.update({
        where: { id: params.id },
        data: {
          status: resolution,
          resolution: resolution_note,
          admin_id: session.user.id,
          resolved_at: now,
          updated_at: now,
        },
      });

      // 2. Update case status — all resolutions close the case
      await tx.case.update({
        where: { id: dispute.case_id },
        data: { status: 'completed' },
      });

      // 3. Handle payment outcomes by resolution type
      if (resolution === 'resolved_client') {
        // Full refund to client
        await tx.payment.updateMany({
          where: { case_id: dispute.case_id, status: 'held' },
          data: { status: 'refunded' },
        });

      } else if (resolution === 'resolved_lawyer') {
        // Full release to lawyer
        for (const pmt of heldPayments) {
          const tds = pmt.amount >= 3_000_000 ? Math.round(pmt.amount * 0.10) : 0;
          await tx.payment.update({
            where: { id: pmt.id },
            data: {
              status:              'released',
              tds_applicable:      pmt.amount >= 3_000_000,
              tds_amount:          tds,
              lawyer_final_amount: pmt.amount - tds,
              paid_at:             now,
            },
          });
          if (pmt.milestone_id) {
            await tx.milestone.update({
              where: { id: pmt.milestone_id },
              data: { status: 'paid', updated_at: now },
            });
          }
        }

      } else if (resolution === 'partial_refund') {
        // Client gets refund_percentage back; lawyer keeps the rest
        for (const pmt of heldPayments) {
          const refundAmount  = Math.round(pmt.amount * (refundPct / 100));
          const releaseAmount = pmt.amount - refundAmount;
          const tds = releaseAmount >= 3_000_000 ? Math.round(releaseAmount * 0.10) : 0;

          // Mark original as refunded; create a new "released" record for lawyer's share
          await tx.payment.update({
            where: { id: pmt.id },
            data: {
              status: 'refunded',
              // Store the partial amounts in metadata via net_amount
              net_amount: refundAmount,
            },
          });

          // If there's anything to release to lawyer, record it
          if (releaseAmount > 0 && pmt.milestone_id) {
            await tx.milestone.update({
              where: { id: pmt.milestone_id },
              data: { status: 'paid', updated_at: now },
            });
          }
        }

      } else if (resolution === 'settled') {
        // Parties agreed — admin releases everything to lawyer
        for (const pmt of heldPayments) {
          const tds = pmt.amount >= 3_000_000 ? Math.round(pmt.amount * 0.10) : 0;
          await tx.payment.update({
            where: { id: pmt.id },
            data: {
              status:              'released',
              tds_applicable:      pmt.amount >= 3_000_000,
              tds_amount:          tds,
              lawyer_final_amount: pmt.amount - tds,
              paid_at:             now,
            },
          });
        }
      }

      // 4. Record case event
      await tx.caseEvent.create({
        data: {
          case_id:    dispute.case_id,
          actor_id:   session.user.id,
          event_type: 'dispute_resolved',
          title:      'Dispute resolved by admin',
          description: `Resolution: ${resolution}${resolution === 'partial_refund' ? ` (${refundPct}% refund)` : ''}. ${resolution_note}`,
        },
      });

      // 5. Ledger entries per resolution type
      await writeLedger({
        caseId:      dispute.case_id,
        eventType:   'dispute_unfrozen',
        amount:      heldPayments.reduce((s, p) => s + p.amount, 0),
        description: `Dispute resolved by admin: ${resolution}`,
        actorId:     session.user.id,
        metadata:    { resolution, refundPct: resolution === 'partial_refund' ? refundPct : null },
      }, tx);

      for (const pmt of heldPayments) {
        if (resolution === 'resolved_client' || resolution === 'partial_refund') {
          const refundAmount = resolution === 'partial_refund'
            ? Math.round(pmt.amount * (refundPct / 100))
            : pmt.amount;
          await writeLedger({
            caseId:      dispute.case_id,
            eventType:   'payment_refunded',
            amount:      refundAmount,
            description: `Refund to client: dispute resolved (${resolution})`,
            paymentId:   pmt.id,
            actorId:     session.user.id,
          }, tx);
        }
        if (resolution === 'resolved_lawyer' || resolution === 'settled') {
          const tds = pmt.amount >= 3_000_000 ? Math.round(pmt.amount * 0.10) : 0;
          const lawyerAmount = pmt.amount - tds;
          await writeLedger({
            caseId:      dispute.case_id,
            eventType:   'payment_released',
            amount:      lawyerAmount,
            description: `Release to lawyer: dispute resolved (${resolution})`,
            paymentId:   pmt.id,
            actorId:     session.user.id,
          }, tx);
          if (tds > 0) {
            await writeLedger({
              caseId:      dispute.case_id,
              eventType:   'tds_deducted',
              amount:      tds,
              description: `TDS (Sec. 194J, 10%) deducted on dispute resolution`,
              paymentId:   pmt.id,
              actorId:     session.user.id,
            }, tx);
          }
        }
      }
    });

    // Admin log
    await prisma.adminLog.create({
      data: {
        admin_id:    session.user.id,
        action:      'resolve_dispute',
        target_id:   params.id,
        target_type: 'dispute',
        notes:       resolution_note,
        metadata:    { resolution, refundPct: resolution === 'partial_refund' ? refundPct : null },
      },
    });

    // Recalculate lawyer metrics after dispute resolution
    void recalculateLawyerMetrics(dispute.case.lawyer_id);

    // Notify both parties
    const resolutionLabels: Record<string, string> = {
      resolved_client: 'in your favour — a refund has been issued',
      resolved_lawyer: 'in favour of the advocate — payment released',
      partial_refund:  `with a partial settlement (${refundPct}% refunded)`,
      settled:         'as settled — payment released to advocate',
    };
    const label = resolutionLabels[resolution] ?? 'resolved';

    await Promise.all([
      notify({
        userId: dispute.case.client_id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        body: `The dispute on "${dispute.case.title}" has been resolved ${label}. ${resolution_note}`,
        link: `/client/cases/${dispute.case_id}`,
        sendEmail: true,
      }),
      notify({
        userId: dispute.case.lawyer_id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        body: `The dispute on "${dispute.case.title}" has been resolved ${label}. ${resolution_note}`,
        link: `/lawyer/cases/${dispute.case_id}`,
        sendEmail: true,
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action. Valid: assign, resolve.' }, { status: 400 });
}
