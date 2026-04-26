import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lawyerId, action, reason } = await req.json();
    if (!lawyerId || !action) {
      return NextResponse.json({ error: 'lawyerId and action required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }
    if (action === 'reject' && !reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const status = action === 'approve' ? 'verified' : 'rejected';

    const updated = await prisma.lawyerProfile.update({
      where: { id: lawyerId },
      data: {
        verification_status: status,
        ...(action === 'reject' ? { rejection_reason: reason.trim() } : {}),
      },
    });

    return NextResponse.json({ lawyerProfile: updated });
  } catch (err) {
    console.error('[POST /api/admin/verify-lawyer]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
