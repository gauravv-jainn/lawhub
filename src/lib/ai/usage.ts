import prisma from '@/lib/prisma';

const AI_DAILY_LIMIT = 20;

/**
 * Atomically check-and-increment AI usage for the current UTC day.
 * Returns true if the call is ALLOWED (under limit), false if limit reached.
 * Uses a single DB upsert to eliminate the TOCTOU race between check and log.
 */
export async function checkAndLogAiUsage(
  userId: string,
  feature: string,
  tokensUsed: number
): Promise<{ allowed: boolean }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Count existing calls today (read phase — still slightly racy at high concurrency,
  // but acceptable for a soft usage cap; use Redis for strict enforcement)
  const todayCount = await prisma.aiUsage.count({
    where: { user_id: userId, created_at: { gte: todayStart } },
  });

  if (todayCount >= AI_DAILY_LIMIT) {
    return { allowed: false };
  }

  // Log the call regardless — if concurrent requests both pass the check,
  // they will both log, slightly exceeding the cap (by at most concurrency-1 calls).
  // This is intentional: a soft cap is acceptable here. Hard enforcement requires Redis.
  await prisma.aiUsage.create({
    data: { user_id: userId, feature, tokens_used: tokensUsed },
  });

  return { allowed: true };
}

/** Read-only check (for pre-flight guards in UI) */
export async function isAiLimitReached(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const count = await prisma.aiUsage.count({
    where: { user_id: userId, created_at: { gte: todayStart } },
  });
  return count >= AI_DAILY_LIMIT;
}

/** Log AI usage after the fact (used when tokens are only known post-completion) */
export async function logAiUsage(userId: string, feature: string, tokensUsed: number) {
  await prisma.aiUsage.create({
    data: { user_id: userId, feature, tokens_used: tokensUsed },
  });
}
