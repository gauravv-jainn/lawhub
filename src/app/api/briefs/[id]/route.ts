/**
 * GET   /api/briefs/[id]  — brief detail (owner or lawyer viewing)
 * PATCH /api/briefs/[id]  — client edits brief (only while open, no accepted proposal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { briefEditSchema } from '@/lib/utils/validators';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brief = await prisma.brief.findUnique({
    where: { id: params.id },
    include: {
      documents: true,
      _count: { select: { proposals: true } },
    },
  });

  if (!brief) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });

  // Lawyers can see any open brief; owners can see their own regardless of status
  const isOwner  = brief.client_id === session.user.id;
  const isLawyer = session.user.role === 'lawyer';
  if (!isOwner && !isLawyer) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  return NextResponse.json({ brief });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only the brief owner can edit
  const brief = await prisma.brief.findFirst({
    where: { id: params.id, client_id: session.user.id },
    select: {
      id: true,
      status: true,
      expires_at: true,
      // Check if any proposal has been accepted (case exists)
      case: { select: { id: true } },
    },
  });

  if (!brief) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });

  // Briefs with an accepted case are locked
  if (brief.case) {
    return NextResponse.json(
      { error: 'This brief is locked — a proposal has already been accepted.' },
      { status: 400 }
    );
  }

  // Only open briefs can be edited
  if (brief.status !== 'open') {
    return NextResponse.json(
      { error: 'Only open briefs can be edited.' },
      { status: 400 }
    );
  }

  const body   = await req.json();
  const parsed = briefEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { title, description, budget_min, budget_max, urgency, extends_days } = parsed.data;

  // Compute new expiry if requested
  let newExpiry: Date | undefined;
  if (extends_days) {
    newExpiry = new Date(brief.expires_at);
    newExpiry.setDate(newExpiry.getDate() + extends_days);
    // Cap total expiry to 90 days from now
    const maxExpiry = new Date();
    maxExpiry.setDate(maxExpiry.getDate() + 90);
    if (newExpiry > maxExpiry) newExpiry = maxExpiry;
  }

  const updated = await prisma.brief.update({
    where: { id: params.id },
    data: {
      ...(title       ? { title }       : {}),
      ...(description ? { description } : {}),
      ...(budget_min  ? { budget_min }  : {}),
      ...(budget_max  ? { budget_max }  : {}),
      ...(urgency     ? { urgency }     : {}),
      ...(newExpiry   ? { expires_at: newExpiry } : {}),
      updated_at: new Date(),
    },
  });

  return NextResponse.json({ brief: updated });
}
