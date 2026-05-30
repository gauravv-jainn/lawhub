/**
 * POST /api/briefs/[id]/reopen
 *
 * Client reopens an expired, closed, or cancelled brief.
 * Resets status to "open" and extends expires_at by 30 days.
 * Allowed when brief is expired/closed AND there is no active case on this brief.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const REOPEN_DAYS = 30;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brief = await prisma.brief.findFirst({
    where: {
      id:        params.id,
      client_id: session.user.id,
    },
    select: {
      id:     true,
      status: true,
      title:  true,
    },
  });

  if (!brief) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });

  if (!['expired', 'closed'].includes(brief.status)) {
    return NextResponse.json(
      { error: `Only expired or closed briefs can be reopened (current status: ${brief.status}).` },
      { status: 400 }
    );
  }

  // Don't reopen if there's already an active or completed case from this brief
  const existingCase = await prisma.case.findFirst({
    where: {
      brief_id: params.id,
      status: { notIn: ['cancelled'] },
    },
    select: { id: true },
  });

  if (existingCase) {
    return NextResponse.json(
      { error: 'A case already exists for this brief and cannot be reopened.' },
      { status: 400 }
    );
  }

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + REOPEN_DAYS);

  await prisma.brief.update({
    where: { id: params.id },
    data:  {
      status:     'open',
      expires_at: newExpiry,
      updated_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true, expires_at: newExpiry.toISOString() });
}
