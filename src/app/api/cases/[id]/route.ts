import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// PATCH /api/cases/[id]
// Body: { action: 'set_hearing' | 'advance_milestone' | 'complete' | 'add_event', ...payload }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;
  const caseId = params.id;

  // Fetch the case — only the lawyer or client of that case can modify it
  const caseRow = await prisma.case.findFirst({
    where: {
      id: caseId,
      OR: [{ lawyer_id: userId }, { client_id: userId }],
    },
  });
  if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // ── Set/clear hearing date (lawyer or client) ──────────────────────────────
  if (action === 'set_hearing') {
    const { date } = body as { date: string };
    await prisma.case.update({
      where: { id: caseId },
      data: { next_hearing_date: date || null },
    });
    await prisma.caseEvent.create({
      data: {
        case_id: caseId,
        actor_id: userId,
        event_type: 'hearing_set',
        title: date ? `Next hearing set: ${date}` : 'Hearing date cleared',
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Advance milestone (lawyer only) ───────────────────────────────────────
  if (action === 'advance_milestone') {
    if (caseRow.lawyer_id !== userId)
      return NextResponse.json({ error: 'Only the lawyer can advance milestones' }, { status: 403 });
    if (caseRow.current_milestone >= caseRow.milestone_count)
      return NextResponse.json({ error: 'All milestones already complete' }, { status: 400 });

    const next = caseRow.current_milestone + 1;
    await prisma.case.update({
      where: { id: caseId },
      data: { current_milestone: next },
    });
    await prisma.caseEvent.create({
      data: {
        case_id: caseId,
        actor_id: userId,
        event_type: 'milestone_advanced',
        title: `Milestone ${next} marked complete`,
      },
    });
    return NextResponse.json({ ok: true, current_milestone: next });
  }

  // ── Mark case as completed (lawyer only) ──────────────────────────────────
  if (action === 'complete') {
    if (caseRow.lawyer_id !== userId)
      return NextResponse.json({ error: 'Only the lawyer can complete the case' }, { status: 403 });
    if (caseRow.status === 'completed')
      return NextResponse.json({ error: 'Case already completed' }, { status: 400 });

    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'completed' },
    });
    await prisma.caseEvent.create({
      data: {
        case_id: caseId,
        actor_id: userId,
        event_type: 'case_completed',
        title: 'Case marked as completed',
        description: 'The advocate has marked this case as complete.',
      },
    });
    // Notify client
    await prisma.notification.create({
      data: {
        user_id: caseRow.client_id,
        type: 'case_completed',
        title: 'Case Completed',
        body: `Your case "${caseRow.title}" has been marked as complete by your advocate.`,
        link: `/client/cases/${caseId}`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Add a manual case event / note (lawyer or client) ────────────────────
  if (action === 'add_event') {
    const { title, description } = body as { title: string; description?: string };
    if (!title?.trim())
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const event = await prisma.caseEvent.create({
      data: {
        case_id: caseId,
        actor_id: userId,
        event_type: 'manual_note',
        title: title.trim(),
        description: description?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, event });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
