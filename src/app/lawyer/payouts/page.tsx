import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import LawyerPayoutsClient from './LawyerPayoutsClient';

export default async function LawyerPayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') redirect('/auth/login');

  const [bankDetails, payouts, earnings] = await Promise.all([
    prisma.payoutBankDetails.findUnique({
      where: { lawyer_id: session.user.id },
      select: {
        account_holder_name: true,
        bank_name:           true,
        account_number:      true,
        ifsc_code:           true,
        verified:            true,
        verified_at:         true,
      },
    }),
    prisma.payout.findMany({
      where: { lawyer_id: session.user.id },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
    prisma.payment.aggregate({
      where: { lawyer_id: session.user.id, status: 'released' },
      _sum: { lawyer_final_amount: true },
    }),
  ]);

  const totalEarned = earnings._sum.lawyer_final_amount ?? 0;
  const totalPaidOut = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <LawyerPayoutsClient
      bankDetails={bankDetails}
      payouts={payouts.map(p => ({
        id:             p.id,
        amount:         p.amount,
        status:         p.status,
        utr:            p.utr,
        notes:          p.notes,
        initiated_at:   p.initiated_at?.toISOString() ?? null,
        completed_at:   p.completed_at?.toISOString() ?? null,
        failed_at:      p.failed_at?.toISOString() ?? null,
        failure_reason: p.failure_reason,
        created_at:     p.created_at.toISOString(),
      }))}
      totalEarned={totalEarned}
      totalPaidOut={totalPaidOut}
    />
  );
}
