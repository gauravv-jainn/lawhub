/**
 * GET /api/cases/[id]/events
 * Returns case events for the activity stream.
 * Accessible to case members and admins.
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

  const isAdmin = session.user.role === 'admin';

  // Verify access: must be a member of the case or admin
  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      ...(isAdmin ? {} : {
        OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
      }),
    },
    select: { id: true },
  });

  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }

  const events = await prisma.caseEvent.findMany({
    where:   { case_id: params.id },
    orderBy: { created_at: 'asc' },
    select: {
      id:          true,
      event_type:  true,
      title:       true,
      description: true,
      created_at:  true,
    },
  });

  return NextResponse.json({ events });
}
