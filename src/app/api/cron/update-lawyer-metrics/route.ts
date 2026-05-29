/**
 * GET /api/cron/update-lawyer-metrics
 *
 * Runs daily. Recomputes quality metrics for all verified lawyers:
 *   completion_rate  = completed_cases / total_cases_with_any_outcome
 *   dispute_rate     = cases_with_disputes / total_cases
 *   response_rate    = estimated from message activity (% of client messages that
 *                      got a lawyer reply within 48 h) — approximated as:
 *                      cases_with_any_lawyer_message / total_cases_assigned
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all verified lawyers with profiles
  const lawyers = await prisma.user.findMany({
    where: {
      role: 'lawyer',
      lawyer_profile: { verification_status: 'verified' },
    },
    select: {
      id: true,
      lawyer_profile: { select: { id: true } },
    },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const lawyer of lawyers) {
    if (!lawyer.lawyer_profile) continue;

    try {
      // All cases assigned to this lawyer
      const [totalCases, completedCases, disputedCases, casesWithMessages] =
        await Promise.all([
          prisma.case.count({ where: { lawyer_id: lawyer.id } }),
          prisma.case.count({ where: { lawyer_id: lawyer.id, status: 'completed' } }),
          // Cases that had a dispute raised (regardless of current status)
          prisma.case.count({
            where: {
              lawyer_id: lawyer.id,
              dispute: { isNot: null },
            },
          }),
          // Cases where lawyer sent at least 1 message (proxy for response rate)
          prisma.case.count({
            where: {
              lawyer_id: lawyer.id,
              messages: {
                some: { sender_id: lawyer.id },
              },
            },
          }),
        ]);

      if (totalCases === 0) continue;

      // Compute rates (0–1.0)
      const completion_rate = completedCases / totalCases;
      const dispute_rate    = disputedCases / totalCases;
      const response_rate   = casesWithMessages / totalCases;

      await prisma.lawyerProfile.update({
        where: { id: lawyer.lawyer_profile.id },
        data: {
          completion_rate:  Math.round(completion_rate * 100) / 100,
          dispute_rate:     Math.round(dispute_rate * 100) / 100,
          response_rate:    Math.round(response_rate * 100) / 100,
        },
      });

      updated++;
    } catch (err) {
      console.error(`[update-lawyer-metrics] Failed for lawyer ${lawyer.id}:`, err);
      errors.push(lawyer.id);
    }
  }

  return NextResponse.json({
    ok:         true,
    processed:  lawyers.length,
    updated,
    errors:     errors.length,
    errorIds:   errors,
  });
}
