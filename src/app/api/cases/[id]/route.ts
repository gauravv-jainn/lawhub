/**
 * GET   /api/cases/[id]  — case detail (client or lawyer)
 * PATCH /api/cases/[id]  — case actions (hearing | request_completion | approve_completion | add_event)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

const COMPLETION_WINDOW_HOURS = 72; // client has 72h to approve/dispute before auto-complete

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    include: {
      brief:      { select: { title: true, category: true, court: true } },
      client:     { select: { full_name: true, avatar_url: true } },
      lawyer:     { select: { full_name: true, avatar_url: true } },
      milestones: {
        orderBy: { number: 'asc' },
        include: {
          attachments: true,
          payment: { select: { id: true, status: true, amount: true, razorpay_payment_id: true } },
        },
      },
      payments:   { orderBy: { milestone_number: 'asc' } },
      events:     { orderBy: { created_at: 'asc' } },
      dispute:    true,
    },
  });

  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  // Auto-complete: if completion was requested > COMPLETION_WINDOW_HOURS ago
  // and client hasn't responded, automatically complete the case.
  if (
    caseRow.status === 'completion_requested' &&
    caseRow.completion_requested_at
  ) {
    const deadline = new Date(caseRow.completion_requested_at);
    deadline.setHours(deadline.getHours() + COMPLETION_WINDOW_HOURS);

    if (new Date() >= deadline) {
      await prisma.case.update({
        where: { id: params.id },
        data: { status: 'completed' },
      });
      caseRow.status = 'completed'; // reflect in response
      await prisma.caseEvent.create({
        data: {
          case_id: params.id,
          event_type: 'case_auto_completed',
          title: 'Case automatically completed',
          description: `No dispute was raised within ${COMPLETION_WINDOW_HOURS} hours of the completion request.`,
        },
      });
    }
  }

  return NextResponse.json({ case: caseRow });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
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
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const body   = await req.json();
  const action = body.action as string;

  // ── set_hearing (lawyer or client) ───────────────────────────────────────
  if (action === 'set_hearing') {
    const date = typeof body.date === 'string' ? body.date : null;

    await prisma.case.update({
      where: { id: params.id },
      data: { next_hearing_date: date || null },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'hearing_set',
        title: date ? `Next hearing set: ${date}` : 'Hearing date cleared',
      },
    });

    // Email the other party about the hearing update
    const otherPartyId =
      session.user.id === caseRow.lawyer_id ? caseRow.client_id : caseRow.lawyer_id;

    if (date) {
      await notify({
        userId: otherPartyId,
        type: 'hearing_scheduled',
        title: 'Hearing Date Updated',
        body: `The next hearing date for "${caseRow.title}" has been set to ${date}.`,
        link: `/${session.user.role === 'lawyer' ? 'client' : 'lawyer'}/cases/${params.id}`,
        sendEmail: true,
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── request_completion (lawyer only) ─────────────────────────────────────
  if (action === 'request_completion') {
    if (caseRow.lawyer_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the lawyer can request case completion.' }, { status: 403 });
    }
    if (caseRow.status !== 'active') {
      return NextResponse.json({ error: `Case must be active to request completion (current: ${caseRow.status}).` }, { status: 400 });
    }

    // Ensure all milestones are either approved or paid (not still in draft/active/submitted)
    const incompleteCount = await prisma.milestone.count({
      where: {
        case_id: params.id,
        status: { notIn: ['approved', 'paid', 'cancelled'] },
      },
    });
    if (incompleteCount > 0) {
      return NextResponse.json(
        {
          error: `${incompleteCount} milestone(s) are not yet approved or paid. All milestones must be approved before requesting completion.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.case.update({
      where: { id: params.id },
      data: {
        status: 'completion_requested',
        completion_requested_at: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'completion_requested',
        title: 'Completion requested',
        description: `Your advocate has marked this case as complete. You have ${COMPLETION_WINDOW_HOURS} hours to approve or raise a dispute. If no action is taken, the case will close automatically.`,
      },
    });

    await notify({
      userId: caseRow.client_id,
      type: 'completion_requested',
      title: 'Your Advocate Has Marked the Case Complete',
      body: `"${caseRow.title}" has been marked complete. You have ${COMPLETION_WINDOW_HOURS} hours to approve or dispute. If you take no action, the case will close automatically.`,
      link: `/client/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ ok: true });
  }

  // ── approve_completion (client only) ────────────────────────────────────
  if (action === 'approve_completion') {
    if (caseRow.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the client can approve case completion.' }, { status: 403 });
    }
    if (caseRow.status !== 'completion_requested') {
      return NextResponse.json({ error: 'No pending completion request.' }, { status: 400 });
    }

    await prisma.case.update({
      where: { id: params.id },
      data: { status: 'completed' },
    });

    await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'case_completed',
        title: 'Case completed',
        description: 'Client confirmed case completion.',
      },
    });

    await notify({
      userId: caseRow.lawyer_id,
      type: 'case_completed',
      title: 'Case Completed',
      body: `"${caseRow.title}" has been confirmed as complete by your client.`,
      link: `/lawyer/cases/${params.id}`,
      sendEmail: true,
    });

    return NextResponse.json({ ok: true });
  }

  // ── add_event (lawyer or client) ────────────────────────────────────────
  if (action === 'add_event') {
    const title       = typeof body.title === 'string'       ? body.title.trim()       : '';
    const description = typeof body.description === 'string' ? body.description.trim() : undefined;

    if (!title) return NextResponse.json({ error: 'Event title is required.' }, { status: 400 });
    if (title.length > 200) return NextResponse.json({ error: 'Title too long.' }, { status: 400 });

    const event = await prisma.caseEvent.create({
      data: {
        case_id: params.id,
        actor_id: session.user.id,
        event_type: 'manual_note',
        title,
        description: description || null,
      },
    });

    return NextResponse.json({ ok: true, event });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
