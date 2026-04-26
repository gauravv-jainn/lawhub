import prisma from '@/lib/prisma';

/** Returns true if the user has hit the 20-calls/day AI limit */
export async function isAiLimitReached(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.aiUsage.count({
    where: {
      user_id: userId,
      created_at: { gte: todayStart },
    },
  });

  return count >= 20;
}

/** Log one AI call */
export async function logAiUsage(userId: string, feature: string, tokensUsed: number) {
  await prisma.aiUsage.create({
    data: { user_id: userId, feature, tokens_used: tokensUsed },
  });
}
