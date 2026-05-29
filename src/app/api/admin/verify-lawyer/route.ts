/**
 * POST /api/admin/verify-lawyer
 *
 * Admin approves, rejects, or resets a lawyer's verification.
 * - approve: verification_status → verified
 * - reject:  verification_status → rejected (reason required)
 * - reset_to_pending: re-opens review after rejection (for resubmission)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyLawyerSchema } from '@/lib/utils/validators';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = verifyLawyerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { lawyerId, action, reason } = parsed.data;

  if (action === 'reject' && !reason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
  }

  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { id: lawyerId },
    select: { id: true, user: { select: { full_name: true } } },
  });
  if (!lawyer) return NextResponse.json({ error: 'Lawyer not found.' }, { status: 404 });

  let newStatus: 'verified' | 'rejected' | 'pending';
  let notifType: string;
  let notifTitle: string;
  let notifBody: string;

  switch (action) {
    case 'approve':
      newStatus  = 'verified';
      notifType  = 'verification_approved';
      notifTitle = 'Verification Approved';
      notifBody  = 'Congratulations! Your BCI credentials have been verified. You can now browse briefs and submit proposals.';
      break;

    case 'reject':
      newStatus  = 'rejected';
      notifType  = 'verification_rejected';
      notifTitle = 'Verification Requires Attention';
      notifBody  = `Your verification was not approved. Reason: ${reason}. Please update your documents and resubmit.`;
      break;

    case 'reset_to_pending':
      newStatus  = 'pending';
      notifType  = 'verification_resubmitted';
      notifTitle = 'Verification Under Review';
      notifBody  = 'Your updated documents are under review. We\'ll notify you within 24 hours.';
      break;
  }

  await prisma.lawyerProfile.update({
    where: { id: lawyerId },
    data: {
      verification_status: newStatus!,
      ...(action === 'reject'          ? { rejection_reason: reason!.trim() }  : {}),
      ...(action === 'reset_to_pending' ? { rejection_reason: null }            : {}),
    },
  });

  // Notify lawyer — with email
  await notify({
    userId: lawyerId,
    type: notifType!,
    title: notifTitle!,
    body: notifBody!,
    link: '/lawyer/profile',
    sendEmail: true,
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
