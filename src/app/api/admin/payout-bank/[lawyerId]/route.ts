/**
 * PATCH /api/admin/payout-bank/[lawyerId] — verify or reject a lawyer's bank details
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { lawyerId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action } = await req.json() as { action?: 'verify' | 'reject' };

  if (action !== 'verify' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "verify" or "reject"' }, { status: 400 });
  }

  const existing = await prisma.payoutBankDetails.findUnique({
    where: { lawyer_id: params.lawyerId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Bank details not found for this lawyer.' }, { status: 404 });
  }

  await prisma.payoutBankDetails.update({
    where: { lawyer_id: params.lawyerId },
    data: {
      verified:    action === 'verify',
      verified_by: session.user.id,
      verified_at: action === 'verify' ? new Date() : null,
    },
  });

  await prisma.notification.create({
    data: {
      user_id: params.lawyerId,
      type:    action === 'verify' ? 'bank_verified' : 'bank_rejected',
      title:   action === 'verify' ? 'Bank Details Verified' : 'Bank Details Rejected',
      body:    action === 'verify'
        ? 'Your bank account details have been verified. You are now eligible for payouts.'
        : 'Your bank account details could not be verified. Please update and resubmit.',
      link: '/lawyer/payouts',
    },
  });

  await prisma.adminLog.create({
    data: {
      admin_id:    session.user.id,
      action:      `bank_${action}`,
      target_id:   params.lawyerId,
      target_type: 'user',
    },
  });

  return NextResponse.json({ ok: true });
}
