/**
 * GET /api/cases/[id]/milestones
 * Returns all milestones for a case (lawyer or client of that case).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: { id: true },
  });

  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const milestones = await prisma.milestone.findMany({
    where: { case_id: params.id },
    orderBy: { number: 'asc' },
    include: {
      attachments: true,
      payment: {
        select: { id: true, status: true, amount: true, razorpay_payment_id: true },
      },
    },
  });

  return NextResponse.json({ milestones });
}
