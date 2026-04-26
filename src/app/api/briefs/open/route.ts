import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/briefs/open — lawyers browse all open briefs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['lawyer', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const category = searchParams.get('category') ?? '';

    const briefs = await prisma.brief.findMany({
      where: {
        status: 'open',
        ...(q && {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }),
        ...(category && { category }),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        client: { select: { full_name: true, city: true, state: true } },
        _count: { select: { bids: true } },
      },
    });

    return NextResponse.json({ briefs });
  } catch (err) {
    console.error('[GET /api/briefs/open]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
