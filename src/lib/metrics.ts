/**
 * Recalculate and persist lawyer quality metrics from live case data.
 * Called after case completion, cancellation, or dispute resolution.
 * Non-blocking: errors are logged but never propagated.
 */
import prisma from '@/lib/prisma';

export async function recalculateLawyerMetrics(lawyerId: string): Promise<void> {
  try {
    const [total, completed, active, disputedCount] = await Promise.all([
      prisma.case.count({ where: { lawyer_id: lawyerId } }),
      prisma.case.count({ where: { lawyer_id: lawyerId, status: 'completed' } }),
      prisma.case.count({ where: { lawyer_id: lawyerId, status: { not: 'cancelled' } } }),
      prisma.dispute.count({ where: { case: { lawyer_id: lawyerId } } }),
    ]);

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
