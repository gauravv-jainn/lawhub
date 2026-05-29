/**
 * GET /api/cron/hearing-reminders
 *
 * Runs daily at 8 AM IST. Sends T-7 / T-3 / T-1 / overdue hearing reminders
 * to both client and lawyer for every active case with a next_hearing_date set.
 *
 * Deduplication: checks if a notification of the same type was already sent
 * today for this case — skips if so (prevents duplicate sends on retry).
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

// Days-before-hearing → reminder tier
const REMINDER_TIERS = [
  { daysOut: 7, type: 'hearing_reminder_7d', label: '7 days' },
  { daysOut: 3, type: 'hearing_reminder_3d', label: '3 days' },
  { daysOut: 1, type: 'hearing_reminder_1d', label: 'tomorrow' },
  { daysOut: 0, type: 'hearing_reminder_today', label: 'today' },
] as const;

const OVERDUE_TYPE = 'hearing_overdue';

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function parseHearingDate(raw: string): Date | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all active cases with a hearing date set
  const cases = await prisma.case.findMany({
    where: {
      status:            { in: ['active', 'completion_requested'] },
      next_hearing_date: { not: null },
    },
    select: {
      id:                true,
      title:             true,
      next_hearing_date: true,
      client_id:         true,
      lawyer_id:         true,
    },
  });

  let sent    = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of cases) {
    if (!c.next_hearing_date) continue;

    const hearingDate = parseHearingDate(c.next_hearing_date);
    if (!hearingDate) continue;
    hearingDate.setHours(0, 0, 0, 0);

    const daysUntil = daysBetween(today, hearingDate);

    // Determine which tier this case falls into
    const tier = REMINDER_TIERS.find((t) => t.daysOut === daysUntil);
    const isOverdue = daysUntil < 0;

    const notifType = tier?.type ?? (isOverdue ? OVERDUE_TYPE : null);
    if (!notifType) continue; // Not a reminder day — skip

    const title = tier
      ? `Hearing in ${tier.label} — ${c.title}`
      : `Hearing date passed — ${c.title}`;

    const hearingStr = hearingDate.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const body = tier
      ? `Your court hearing is scheduled for ${hearingStr} (${tier.label}). Please ensure all documents and preparation are complete.`
      : `Your hearing date of ${hearingStr} has passed. Please update the next hearing date or mark the matter as complete.`;

    // Check dedup: was this notification type already sent today for this case?
    const todayStart = new Date(today);
    const todayEnd   = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    for (const userId of [c.client_id, c.lawyer_id]) {
      try {
        const alreadySent = await prisma.notification.findFirst({
          where: {
            user_id:    userId,
            type:       notifType,
            link:       { contains: c.id },
            created_at: { gte: todayStart, lt: todayEnd },
          },
        });

        if (alreadySent) {
          skipped++;
          continue;
        }

        const isLawyer = userId === c.lawyer_id;

        await notify({
          userId,
          type:  notifType,
          title,
          body,
          link:  `/${isLawyer ? 'lawyer' : 'client'}/cases/${c.id}`,
          sendEmail: daysUntil <= 1 || isOverdue, // email only for T-1, T-0, overdue
          emailData: isOverdue ? undefined : {
            caseTitle:   c.title,
            hearingDate: hearingStr,
            daysOut:     tier?.daysOut,
          },
        });

        sent++;
      } catch (err) {
        console.error(`[hearing-reminders] Error for case ${c.id} user ${userId}:`, err);
        errors.push(`${c.id}:${userId}`);
      }
    }
  }

  return NextResponse.json({
    ok:      true,
    cases:   cases.length,
    sent,
    skipped,
    errors:  errors.length,
    errorIds: errors,
  });
}
