import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AdminPayoutsClient from './AdminPayoutsClient';

export default async function AdminPayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const [payouts, pendingBankDetails] = await Promise.all([
    prisma.payout.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        lawyer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            payout_bank_details: {
              select: {
                account_holder_name: true,
                bank_name: true,
                account_number: true,
                ifsc_code: true,
                verified: true,
              },
            },
          },
        },
      },
    }),
    prisma.payoutBankDetails.findMany({
      where: { verified: false },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
    }),
  ]);

  return (
    <AdminPayoutsClient
      payouts={payouts.map(p => ({
        id:             p.id,
        amount:         p.amount,
        status:         p.status,
        utr:            p.utr,
        notes:          p.notes,
        failure_reason: p.failure_reason,
        initiated_at:   p.initiated_at?.toISOString() ?? null,
        completed_at:   p.completed_at?.toISOString() ?? null,
        failed_at:      p.failed_at?.toISOString() ?? null,
        created_at:     p.created_at.toISOString(),
        lawyer: {
          id:        p.lawyer.id,
          full_name: p.lawyer.full_name,
          email:     p.lawyer.email,
          bank:      p.lawyer.payout_bank_details ? {
            account_holder_name: p.lawyer.payout_bank_details.account_holder_name,
            bank_name:           p.lawyer.payout_bank_details.bank_name,
            account_number:      p.lawyer.payout_bank_details.account_number,
            ifsc_code:           p.lawyer.payout_bank_details.ifsc_code,
            verified:            p.lawyer.payout_bank_details.verified,
          } : null,
        },
      }))}
      pendingBankDetails={pendingBankDetails.map(b => ({
        lawyer_id:           b.lawyer_id,
        account_holder_name: b.account_holder_name,
        bank_name:           b.bank_name,
        account_number:      b.account_number,
        ifsc_code:           b.ifsc_code,
        lawyer:              { id: b.user.id, full_name: b.user.full_name, email: b.user.email },
      }))}
    />
  );
}
