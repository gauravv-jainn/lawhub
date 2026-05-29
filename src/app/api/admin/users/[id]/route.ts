/**
 * GET   /api/admin/users/[id]  — full user profile for admin
 * PATCH /api/admin/users/[id]  — suspend | reinstate user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      city: true,
      state: true,
      role: true,
      suspended: true,
      suspended_reason: true,
      suspended_at: true,
      created_at: true,
      lawyer_profile: {
        select: {
          bci_number: true,
          primary_court: true,
          experience_years: true,
          verification_status: true,
          avg_rating: true,
          review_count: true,
          total_cases: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Fetch case counts
  const [clientCases, lawyerCases, briefs, proposals] = await Promise.all([
    user.role === 'client' || user.role === 'enterprise' || user.role === 'ngo'
      ? prisma.case.count({ where: { client_id: params.id } })
      : Promise.resolve(0),
    user.role === 'lawyer'
      ? prisma.case.count({ where: { lawyer_id: params.id } })
      : Promise.resolve(0),
    prisma.brief.count({ where: { client_id: params.id } }),
    user.role === 'lawyer'
      ? prisma.proposal.count({ where: { lawyer_id: params.id } })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({ user, clientCases, lawyerCases, briefs, proposals });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { action, reason } = (await req.json()) as {
    action?: string;
    reason?: string;
  };

  if (!action) return NextResponse.json({ error: 'action required.' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, full_name: true, email: true, suspended: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (user.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot perform this action on your own account.' }, { status: 400 });
  }
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Cannot suspend another admin.' }, { status: 403 });
  }

  if (action === 'suspend') {
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason is required for suspension.' }, { status: 400 });
    }
    if (user.suspended) {
      return NextResponse.json({ error: 'User is already suspended.' }, { status: 409 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id },
        data: {
          suspended: true,
          suspended_reason: reason.trim(),
          suspended_at: now,
        },
      });

      await tx.adminLog.create({
        data: {
          admin_id:    session.user.id,
          action:      'suspend_user',
          target_id:   params.id,
          target_type: 'user',
          notes:       reason.trim(),
          metadata:    { userName: user.full_name, userRole: user.role },
        },
      });
    });

    // Notify the suspended user
    await notify({
      userId: params.id,
      type: 'account_suspended',
      title: 'Your Account Has Been Suspended',
      body: `Your LawHub account has been suspended. Reason: ${reason}. Contact support@lawhub.in to appeal.`,
      sendEmail: true,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === 'reinstate') {
    if (!user.suspended) {
      return NextResponse.json({ error: 'User is not suspended.' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id },
        data: {
          suspended: false,
          suspended_reason: null,
          suspended_at: null,
        },
      });

      await tx.adminLog.create({
        data: {
          admin_id:    session.user.id,
          action:      'reinstate_user',
          target_id:   params.id,
          target_type: 'user',
          notes:       reason?.trim() ?? 'Admin reinstated account.',
          metadata:    { userName: user.full_name, userRole: user.role },
        },
      });
    });

    await notify({
      userId: params.id,
      type: 'account_reinstated',
      title: 'Your Account Has Been Reinstated',
      body: 'Your LawHub account has been reinstated. You can now log in and continue using the platform.',
      sendEmail: true,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action. Valid: suspend, reinstate.' }, { status: 400 });
}
