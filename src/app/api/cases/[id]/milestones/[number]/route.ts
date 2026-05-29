/**
 * GET   /api/cases/[id]/milestones/[number]  — get single milestone
 * PATCH /api/cases/[id]/milestones/[number]  — update milestone (action-based)
 *
 * PATCH actions:
 *   "update"       (lawyer) — edit details in draft/plan_rejected state; logs revision history
 *   "submit_plan"  (lawyer) — submit draft plan to client for approval → pending_client_approval
 *   "approve_plan" (client) — approve the work plan → active
 *   "reject_plan"  (client) — reject the plan with reason → plan_rejected (lawyer revises)
 *   "submit"       (lawyer) — mark work complete, request client approval → submitted
 *   "approve"      (client) — approve completed work → approved (triggers payment CTA)
 *   "dispute"      (client) — dispute this specific milestone
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { milestoneUpdateSchema } from '@/lib/utils/validators';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; number: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const milestoneNumber = parseInt(params.number, 10);
  if (isNaN(milestoneNumber)) return NextResponse.json({ error: 'Invalid milestone number.' }, { status: 400 });

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: { id: true },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const milestone = await prisma.milestone.findUnique({
    where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
    include: {
      attachments: true,
      payment: { select: { id: true, status: true, amount: true } },
      revisions: {
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { actor: { select: { full_name: true } } },
      },
    },
  });

  if (!milestone) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  return NextResponse.json({ milestone });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; number: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const milestoneNumber = parseInt(params.number, 10);
  if (isNaN(milestoneNumber)) return NextResponse.json({ error: 'Invalid milestone number.' }, { status: 400 });

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: {
      id: true,
      title: true,
      client_id: true,
      lawyer_id: true,
      status: true,
    },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  if (caseRow.status === 'cancelled' || caseRow.status === 'completed') {
    return NextResponse.json({ error: 'Cannot modify milestones on a closed case.' }, { status: 400 });
  }

  const milestone = await prisma.milestone.findUnique({
    where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
  });
  if (!milestone) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });

  const body   = await req.json();
  const action = body.action as string;
  const now    = new Date();

  // ── update (lawyer only) — allowed in draft or plan_rejected ─────────────
  if (action === 'update') {
    if (caseRow.lawyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the lawyer can update milestone details.' }, { status: 403 });
    }
    if (!['draft', 'plan_rejected', 'active'].includes(milestone.status)) {
      return NextResponse.json(
        { error: `Milestone in status "${milestone.status}" cannot be edited.` },
        { status: 400 }
      );
    }

    const parsed = milestoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, description, deliverables, due_date } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // Record revision history for non-draft edits
      if (milestone.status !== 'draft') {
        await tx.milestoneRevision.create({
          data: {
            milestone_id: milestone.id,
            changed_by:   session.user.id,
            title:        milestone.title,
            description:  milestone.description,
            deliverables: milestone.deliverables,
            due_date:     milestone.due_date,
            amount:       milestone.amount,
            change_note:  body.change_note ?? 'Details updated',
          },
        });
      }

      await tx.milestone.update({
        where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
        data: {
          ...(title        !== undefined ? { title }        : {}),
          ...(description  !== undefined ? { description }  : {}),
          ...(deliverables !== undefined ? { deliverables } : {}),
          due_date: due_date ? new Date(due_date) : undefined,
          updated_at: now,
        },
      });
    });

    const updated = await prisma.milestone.findUnique({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── submit_plan (lawyer only) — draft → pending_client_approval ──────────
  if (action === 'submit_plan') {
    if (caseRow.lawyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the lawyer can submit the milestone plan.' }, { status: 403 });
    }
    if (!['draft', 'plan_rejected'].includes(milestone.status)) {
      return NextResponse.json(
        { error: `Cannot submit plan for milestone in status "${milestone.status}".` },
        { status: 400 }
      );
    }
    if (!milestone.title?.trim()) {
      return NextResponse.json({ error: 'Add a title before submitting the plan.' }, { status: 400 });
    }
    if (!milestone.deliverables?.trim()) {
      return NextResponse.json(
        { error: 'Describe the deliverables before submitting the plan for approval.' },
        { status: 400 }
      );
    }

    const updated = await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: {
        status: 'pending_client_approval',
        plan_submitted_at: now,
        updated_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_plan_submitted',
        title: `Milestone ${milestoneNumber} plan submitted for approval`,
        description: `"${milestone.title}" plan is ready for your review.`,
      },
    });

    await notify({
      userId: caseRow.client_id,
      type: 'milestone_plan_submitted',
      title: `Milestone ${milestoneNumber} plan needs your approval`,
      body: `Your advocate has submitted the work plan for "${milestone.title}". Review and approve to allow work to begin.`,
      link: `/client/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── approve_plan (client only) — pending_client_approval → active ────────
  if (action === 'approve_plan') {
    if (caseRow.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the client can approve the milestone plan.' }, { status: 403 });
    }
    if (milestone.status !== 'pending_client_approval') {
      return NextResponse.json(
        { error: `Can only approve plans in "pending_client_approval" status (current: "${milestone.status}").` },
        { status: 400 }
      );
    }

    const updated = await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: {
        status: 'active',
        plan_approved_at: now,
        updated_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_plan_approved',
        title: `Milestone ${milestoneNumber} plan approved — work can begin`,
        description: `Client approved the scope and deliverables for "${milestone.title}".`,
      },
    });

    await notify({
      userId: caseRow.lawyer_id,
      type: 'milestone_plan_approved',
      title: `Milestone ${milestoneNumber} plan approved`,
      body: `Your client has approved the work plan for "${milestone.title}". You can now begin work.`,
      link: `/lawyer/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── reject_plan (client only) — pending_client_approval → plan_rejected ──
  if (action === 'reject_plan') {
    if (caseRow.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the client can reject the milestone plan.' }, { status: 403 });
    }
    if (milestone.status !== 'pending_client_approval') {
      return NextResponse.json(
        { error: `Can only reject plans in "pending_client_approval" status (current: "${milestone.status}").` },
        { status: 400 }
      );
    }

    const rejectReason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!rejectReason) {
      return NextResponse.json({ error: 'Please provide a reason for rejection.' }, { status: 400 });
    }

    const updated = await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: {
        status: 'plan_rejected',
        updated_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_plan_rejected',
        title: `Milestone ${milestoneNumber} plan rejected`,
        description: `Reason: ${rejectReason}`,
      },
    });

    await notify({
      userId: caseRow.lawyer_id,
      type: 'milestone_plan_rejected',
      title: `Milestone ${milestoneNumber} plan needs revision`,
      body: `Your client has rejected the work plan for "${milestone.title}". Reason: ${rejectReason}. Please revise and resubmit.`,
      link: `/lawyer/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── submit (lawyer only) — active → submitted ─────────────────────────────
  if (action === 'submit') {
    if (caseRow.lawyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the lawyer can submit a milestone.' }, { status: 403 });
    }
    if (milestone.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot submit a milestone with status "${milestone.status}". It must be active (plan approved).` },
        { status: 400 }
      );
    }
    if (!milestone.deliverables?.trim()) {
      return NextResponse.json(
        { error: 'Please describe the deliverables before submitting this milestone for approval.' },
        { status: 400 }
      );
    }

    const updated = await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: {
        status: 'submitted',
        submitted_at: now,
        updated_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_submitted',
        title: `Milestone ${milestoneNumber} submitted for approval`,
        description: milestone.deliverables ?? undefined,
      },
    });

    await notify({
      userId: caseRow.client_id,
      type: 'milestone_submitted',
      title: `Milestone ${milestoneNumber} ready for your approval`,
      body: `"${milestone.title}" has been marked complete by your advocate. Please review and approve to release payment.`,
      link: `/client/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── approve (client only) — submitted → approved ──────────────────────────
  if (action === 'approve') {
    if (caseRow.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the client can approve a milestone.' }, { status: 403 });
    }
    if (milestone.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Only submitted milestones can be approved.' },
        { status: 400 }
      );
    }

    const updated = await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: {
        status: 'approved',
        approved_at: now,
        updated_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_approved',
        title: `Milestone ${milestoneNumber} approved`,
        description: 'Client approved the milestone. Payment can now be released.',
      },
    });

    await notify({
      userId: caseRow.lawyer_id,
      type: 'milestone_approved',
      title: `Milestone ${milestoneNumber} approved`,
      body: `Your client has approved "${milestone.title}". Please wait for payment release.`,
      link: `/lawyer/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ milestone: updated });
  }

  // ── dispute (client only) — dispute this milestone ────────────────────────
  if (action === 'dispute') {
    if (caseRow.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the client can dispute a milestone.' }, { status: 403 });
    }
    if (!['submitted', 'active'].includes(milestone.status)) {
      return NextResponse.json(
        { error: 'Only active or submitted milestones can be disputed.' },
        { status: 400 }
      );
    }

    await prisma.milestone.update({
      where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
      data: { status: 'disputed', updated_at: now },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'milestone_disputed',
        title: `Milestone ${milestoneNumber} disputed`,
        description: body.reason ?? 'Client has raised a dispute on this milestone.',
      },
    });

    // The caller should also POST /api/cases/[id]/dispute to create a Dispute record.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
