/**
 * GET /api/admin/disputes
 * Admin: list all disputes, paginated, filterable by status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const page   = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit  = 20;

  const where = status ? { status: status as never } : {};

  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        case:      { select: { id: true, title: true, total_fee: true } },
        raised_by: { select: { full_name: true, role: true } },
        admin:     { select: { full_name: true } },
      },
    }),
    prisma.dispute.count({ where }),
  ]);

  return NextResponse.json({ disputes, total, page, pages: Math.ceil(total / limit) });
}
