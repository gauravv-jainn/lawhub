/**
 * POST   /api/cases/[id]/dispute   — raise a dispute on this case
 * DELETE /api/cases/[id]/dispute   — withdraw a dispute (raiser only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { disputeCreateSchema } from '@/lib/utils/validators';
import { notify } from '@/lib/notifications';
import { isPrismaUniqueError } from '@/lib/utils/errors';
import { writeLedger } from '@/lib/ledger';
export const dynamic = 'force-dynamic';

// ─── POST — raise a dispute ──────────────────────────────────────────────────

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
      { error: 'Disputes can only be raised on active cases.' },
      { status: 400 }
    );
  }

  const body   = await req.json();
  const parsed = disputeCreateSchema.safeParse({ ...body, case_id: params.id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { reason, description, milestone_id } = parsed.data;

  // Validate milestone ownership if provided
  if (milestone_id) {
    const ms = await prisma.milestone.findFirst({
      where: { id: milestone_id, case_id: params.id },
      select: { id: true },
    });
    if (!ms) return NextResponse.json({ error: 'Milestone not found on this case.' }, { status: 400 });
  }

  try {
    const dispute = await prisma.$transaction(async (tx) => {
      // Freeze held payments — they won't be releasable until dispute resolves
      await tx.case.update({
        where: { id: params.id },
        data: { status: 'disputed' },
      });

      const created = await tx.dispute.create({
        data: {
          case_id:      params.id,
          raised_by_id: session.user.id,
          reason,
          description,
          milestone_id: milestone_id ?? null,
          updated_at:   new Date(),
        },
      });

      await tx.caseEvent.create({
        data: {
          case_id:    params.id,
          actor_id:   session.user.id,
          event_type: 'dispute_raised',
          title:      'Dispute raised',
          description: `Reason: ${reason}. ${description}`,
        },
      });

      return created;
    });

    // Write ledger entries for each held payment being frozen
    const heldPayments = await prisma.payment.findMany({
      where: { case_id: params.id, status: 'held' },
      select: { id: true, amount: true },
    });
    for (const pmt of heldPayments) {
      await writeLedger({
        caseId:      params.id,
        eventType:   'dispute_frozen',
        amount:      pmt.amount,
        description: `Payment frozen: dispute raised. Reason: ${reason}`,
        paymentId:   pmt.id,
        actorId:     session.user.id,
      });
    }

    // Notify the other party
    const isClient     = session.user.id === caseRow.client_id;
    const otherPartyId = isClient ? caseRow.lawyer_id : caseRow.client_id;

    await notify({
      userId: otherPartyId,
      type: 'dispute_raised',
      title: 'A Dispute Has Been Raised',
      body: `A dispute was raised on "${caseRow.title}". Payments are frozen until resolved. Our team will review within 2 business days.`,
      link: `/${isClient ? 'lawyer' : 'client'}/cases/${params.id}`,
      sendEmail: true,
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin.id,
          type: 'dispute_raised',
          title: 'New Dispute Requires Review',
          body: `Dispute on case "${caseRow.title}": ${reason}`,
          link: `/admin/disputes/${dispute.id}`,
          sendEmail: false,
        })
      )
    );

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (err) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json(
        { error: 'A dispute is already active on this case. Contact support to escalate.' },
        { status: 409 }
      );
    }
    console.error('[POST /api/cases/[id]/dispute]', err);
    return NextResponse.json({ error: 'Failed to raise dispute.' }, { status: 500 });
  }
}

// ─── DELETE — withdraw dispute (raiser only) ─────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dispute = await prisma.dispute.findFirst({
    where: {
      case_id:      params.id,
      raised_by_id: session.user.id,
      status:       'open',
    },
    select: { id: true },
  });

  if (!dispute) {
    return NextResponse.json({ error: 'No open dispute found that you raised.' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: { status: 'withdrawn', updated_at: new Date() },
    });

    // Reactivate the case
    await tx.case.update({
      where: { id: params.id },
      data: { status: 'active' },
    });

    await tx.caseEvent.create({
      data: {
        case_id:    params.id,
        actor_id:   session.user.id,
        event_type: 'dispute_withdrawn',
        title:      'Dispute withdrawn',
        description: 'The dispute was withdrawn by the party who raised it.',
      },
    });
  });

  // Write ledger entries for unfreezing payments
  const heldAfterWithdraw = await prisma.payment.findMany({
    where: { case_id: params.id, status: 'held' },
    select: { id: true, amount: true },
  });
  for (const pmt of heldAfterWithdraw) {
    await writeLedger({
      caseId:      params.id,
      eventType:   'dispute_unfrozen',
      amount:      pmt.amount,
      description: 'Payment unfrozen: dispute withdrawn',
      paymentId:   pmt.id,
      actorId:     session.user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
