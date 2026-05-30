/**
 * Recalculate and persist lawyer quality metrics from live case data.
 * Called after case completion, cancellation, or dispute resolution.
 * Non-blocking: errors are logged but never propagated.
 */
import prisma from '@/lib/prisma';

export async function recalculateLawyerMetrics(lawyerId: string): Promise<void> {
  try {
    const [allCases, disputedCount] = await Promise.all([
      prisma.case.findMany({
        where: { lawyer_id: lawyerId },
        select: { status: true },
      }),
      prisma.dispute.count({
        where: { case: { lawyer_id: lawyerId } },
      }),
    ]);

    const total     = allCases.length;
    const completed = allCases.filter(c => c.status === 'completed').length;
    const active    = allCases.filter(c => !['cancelled'].includes(c.status)).length;

    await prisma.lawyerProfile.update({
      where: { id: lawyerId },
      data: {
        total_cases:     total,
        completion_rate: active > 0 ? completed / active : 0,
        dispute_rate:    active > 0 ? disputedCount / active : 0,
      },
    });
  } catch (err) {
    console.error('[metrics] Failed to update lawyer metrics for', lawyerId, err);
  }
}
