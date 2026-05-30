/**
 * GET /api/cron/auto-close-cases
 *
 * Run on a schedule (e.g. every hour via Vercel Cron Jobs).
 * Finds all cases in "completion_requested" status where the 72-hour window
 * has passed and no dispute was raised, then auto-completes them.
 *
 * Security: CRON_SECRET must match Authorization header.
 * Vercel cron sends: Authorization: Bearer <CRON_SECRET>
 *
 * vercel.json config:
 * {
 *   "crons": [{ "path": "/api/cron/auto-close-cases", "schedule": "0 * * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
import { recalculateLawyerMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMPLETION_WINDOW_HOURS = 72;

export async function GET(req: NextRequest) {
  // Verify the request is from the cron scheduler
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // If no CRON_SECRET is configured, only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Cron not configured.' }, { status: 503 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - COMPLETION_WINDOW_HOURS);

  // Find all cases where completion was requested and the window has elapsed
  const staleCases = await prisma.case.findMany({
    where: {
      status: 'completion_requested',
      completion_requested_at: { lte: cutoff },
    },
    select: {
      id: true,
      title: true,
      client_id: true,
      lawyer_id: true,
      completion_requested_at: true,
    },
    take: 100, // process max 100 per run to avoid timeout
  });

  if (staleCases.length === 0) {
    return NextResponse.json({ ok: true, completed: 0, message: 'No cases to auto-close.' });
  }

  const results: Array<{ caseId: string; status: 'completed' | 'error'; error?: string }> = [];

  for (const c of staleCases) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.case.update({
          where: { id: c.id },
          data: { status: 'completed' },
        });

        await tx.caseEvent.create({
          data: {
            case_id:    c.id,
            event_type: 'case_auto_completed',
            title:      'Case automatically completed',
            description: `The 72-hour window after the advocate requested completion has elapsed with no dispute raised.`,
          },
        });
      });

      // Notify both parties
      await Promise.all([
        notify({
          userId: c.client_id,
          type: 'case_completed',
          title: 'Case Closed — No Dispute Raised',
          body: `"${c.title}" has been automatically closed as the 72-hour dispute window elapsed. The case is now complete.`,
          link: `/client/cases/${c.id}`,
          sendEmail: true,
        }),
        notify({
          userId: c.lawyer_id,
          type: 'case_completed',
          title: 'Case Automatically Completed',
          body: `"${c.title}" has been automatically completed — no dispute was raised by the client within the 72-hour window.`,
          link: `/lawyer/cases/${c.id}`,
          sendEmail: true,
        }),
      ]);

      void recalculateLawyerMetrics(c.lawyer_id);
      results.push({ caseId: c.id, status: 'completed' });
    } catch (err) {
      console.error(`[cron/auto-close] Failed to close case ${c.id}:`, err);
      results.push({ caseId: c.id, status: 'error', error: String(err) });
    }
  }

  const completedCount = results.filter(r => r.status === 'completed').length;
  const errorCount     = results.filter(r => r.status === 'error').length;

  console.log(`[cron/auto-close] Processed ${staleCases.length} cases: ${completedCount} completed, ${errorCount} errors`);

  return NextResponse.json({
    ok: true,
    processed: staleCases.length,
    completed: completedCount,
    errors: errorCount,
    results,
  });
}
