/**
 * POST /api/proposals/[id]/withdraw
 * Lawyer withdraws a pending proposal before it is accepted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: {
      id: params.id,
      lawyer_id: session.user.id,
    },
    select: { id: true, status: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  }
  if (proposal.status !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending proposals can be withdrawn.' },
      { status: 400 }
    );
  }

  await prisma.proposal.update({
    where: { id: params.id },
    data: {
      status: 'withdrawn',
      withdrawn_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
