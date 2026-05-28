import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : null;
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);

    const notifications = await prisma.notification.findMany({
      where: {
        user_id: session.user.id,
        ...(since ? { created_at: { gt: since } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    console.error('[GET /api/notifications]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
