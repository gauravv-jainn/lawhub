/**
 * PATCH /api/admin/briefs/[id]
 *
 * Admin actions on briefs:
 *   close  — force-close a brief (spam, abuse, duplicate)
 *   reopen — reopen a brief that was incorrectly closed
 *
 * Logs every action to AdminLog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

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

  if (!action || !['close', 'reopen'].includes(action)) {
    return NextResponse.json({ error: 'action must be "close" or "reopen".' }, { status: 400 });
  }

  const brief = await prisma.brief.findUnique({
    where:  { id: params.id },
    select: {
      id: true, title: true, status: true,
      client_id: true,
      client: { select: { full_name: true } },
    },
  });

  if (!brief) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });

  if (action === 'close') {
    if (brief.status === 'closed') {
      return NextResponse.json({ error: 'Brief is already closed.' }, { status: 409 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason is required when closing a brief.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.brief.update({
        where: { id: params.id },
        data:  { status: 'closed', updated_at: new Date() },
      });

      await tx.adminLog.create({
        data: {
          admin_id:    session.user.id,
          action:      'close_brief',
          target_id:   params.id,
          target_type: 'brief',
          notes:       reason!.trim(),
          metadata:    {
            briefTitle: brief.title,
            clientName: brief.client.full_name,
            clientId:   brief.client_id,
          },
        },
      });
    });

    return NextResponse.json({ ok: true, status: 'closed' });
  }

  // action === 'reopen'
  if (brief.status === 'open') {
    return NextResponse.json({ error: 'Brief is already open.' }, { status: 409 });
  }

  // Only closed (not auto-expired) briefs should be manually reopened
  await prisma.$transaction(async (tx) => {
    await tx.brief.update({
      where: { id: params.id },
      data:  {
        status: 'open',
        // Extend expiry 30 days from now
        expires_at: new Date(Date.now() + 30 * 86_400_000),
        updated_at: new Date(),
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id:    session.user.id,
        action:      'reopen_brief',
        target_id:   params.id,
        target_type: 'brief',
        notes:       reason?.trim() ?? 'Admin reopened brief.',
        metadata:    { briefTitle: brief.title, clientId: brief.client_id },
      },
    });
  });

  return NextResponse.json({ ok: true, status: 'open' });
}
