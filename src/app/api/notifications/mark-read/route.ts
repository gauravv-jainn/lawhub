import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// PATCH /api/notifications/mark-read
// Body: { id?: string }  — omit id to mark ALL as read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));

  if (id) {
    await prisma.notification.updateMany({
      where: { id, user_id: session.user.id },
      data: { is_read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { user_id: session.user.id, is_read: false },
      data: { is_read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
