/**
 * POST /api/proposals
 * Lawyer submits a professional proposal on an open brief.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { proposalSubmitSchema } from '@/lib/utils/validators';
import { isPrismaUniqueError } from '@/lib/utils/errors';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Only verified lawyers may submit proposals.' }, { status: 401 });
  }

  // Verify lawyer is actually verified before allowing proposals
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { id: session.user.id },
    select: { verification_status: true },
  });
  if (!lawyerProfile || lawyerProfile.verification_status !== 'verified') {
    return NextResponse.json(
      { error: 'Your account must be verified before submitting proposals.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = proposalSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    brief_id,
    proposed_fee,
    fee_structure,
    milestone_count,
    strategy_text,
    cover_letter,
    relevant_experience,
    availability,
    estimated_timeline,
  } = parsed.data;

  // ── Rate limit: max 5 proposals per 24 hours ─────────────────────────────
  const recentCount = await prisma.proposal.count({
    where: {
      lawyer_id:  session.user.id,
      created_at: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentCount >= 5) {
    return NextResponse.json(
      { error: 'You can submit a maximum of 5 proposals per 24 hours. Please review and personalise before resubmitting.' },
      { status: 429 }
    );
  }

  // ── Duplicate cover letter detection (copy-paste spam prevention) ────────
  const recentProposals = await prisma.proposal.findMany({
    where: { lawyer_id: session.user.id },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { cover_letter: true, brief_id: true },
  });
  const isDuplicateLetter = recentProposals.some(
    (p) => p.brief_id !== brief_id && p.cover_letter.trim() === cover_letter.trim()
  );
  if (isDuplicateLetter) {
    return NextResponse.json(
      { error: 'Your cover letter appears identical to a previous proposal. Please personalise it for this brief to show genuine interest.' },
      { status: 400 }
    );
  }

  // Brief must exist, be open, and not expired
  const brief = await prisma.brief.findFirst({
    where: {
      id: brief_id,
      status: 'open',
      expires_at: { gt: new Date() },
    },
    select: {
      id: true,
      client_id: true,
      title: true,
      client: { select: { email: true, full_name: true } },
    },
  });

  if (!brief) {
    return NextResponse.json(
      { error: 'This brief is no longer accepting proposals.' },
      { status: 404 }
    );
  }
  if (brief.client_id === session.user.id) {
    return NextResponse.json({ error: 'You cannot submit a proposal on your own brief.' }, { status: 403 });
  }

  try {
    const proposal = await prisma.proposal.create({
      data: {
        brief_id,
        lawyer_id: session.user.id, // ALWAYS from session — never from body
        proposed_fee: Number(proposed_fee),
        fee_structure: fee_structure ?? 'flat',
        milestone_count: Number(milestone_count ?? 1),
        strategy_text,
        cover_letter,
        relevant_experience: relevant_experience ?? null,
        availability: availability ?? 'Immediately',
        estimated_timeline,
        status: 'pending',
      },
      include: {
        lawyer: { select: { full_name: true } },
      },
    });

    // Notify client — with email
    await notify({
      userId: brief.client_id,
      type: 'new_proposal',
      title: 'New Proposal Received',
      body: `Adv. ${proposal.lawyer.full_name} submitted a proposal on "${brief.title}"`,
      link: `/client/briefs/${brief_id}`,
      sendEmail: true,
      emailData: {
        lawyerName: proposal.lawyer.full_name,
        briefTitle: brief.title,
        proposedFee: proposed_fee,
        briefId: brief_id,
      },
    });

    return NextResponse.json({ proposal });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json(
        { error: 'You have already submitted a proposal for this brief.' },
        { status: 409 }
      );
    }
    console.error('[POST /api/proposals]', err);
    return NextResponse.json({ error: 'Failed to submit proposal.' }, { status: 500 });
  }
}
