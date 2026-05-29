/**
 * POST /api/proposals/accept
 * Client accepts a lawyer's proposal:
 * 1. Creates Case
 * 2. Auto-creates Milestone records (lawyer fills details after)
 * 3. Closes brief
 * 4. Rejects all other pending proposals on that brief
 * 5. Notifies lawyer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposalId } = (await req.json()) as { proposalId?: string };
  if (!proposalId) return NextResponse.json({ error: 'proposalId required' }, { status: 400 });

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      brief: {
        select: {
          id: true,
          title: true,
          client_id: true,
          pro_bono: true,
          status: true,
        },
      },
      lawyer: { select: { full_name: true } },
    },
  });

  if (!proposal) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  if (proposal.brief.client_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  if (proposal.brief.status !== 'open') {
    return NextResponse.json({ error: 'This brief is no longer open.' }, { status: 400 });
  }
  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'This proposal is no longer pending.' }, { status: 400 });
  }

  const milestoneCount = Math.max(1, Math.min(10, proposal.milestone_count ?? 1));
  const perMilestoneAmount = Math.round(proposal.proposed_fee / milestoneCount);

  // Atomic transaction: accept proposal, create case + milestones, close brief
  const { newCase } = await prisma.$transaction(async (tx) => {
    // 1. Accept this proposal
    await tx.proposal.update({
      where: { id: proposalId },
      data: { status: 'accepted' },
    });

    // 2. Reject all other pending proposals on this brief
    await tx.proposal.updateMany({
      where: {
        brief_id: proposal.brief_id,
        id: { not: proposalId },
        status: 'pending',
      },
      data: { status: 'rejected' },
    });

    // 3. Close the brief
    await tx.brief.update({
      where: { id: proposal.brief_id },
      data: { status: 'closed' },
    });

    // 4. Create the case
    const createdCase = await tx.case.create({
      data: {
        title: proposal.brief.title,
        brief_id: proposal.brief_id,
        client_id: proposal.brief.client_id,
        lawyer_id: proposal.lawyer_id,
        status: 'active',
        total_fee: proposal.proposed_fee,
        fee_structure: proposal.fee_structure ?? 'flat',
      },
    });

    // 5. Auto-create milestone placeholders in DRAFT state
    // Lawyer must define scope and submit plan for client approval before work begins.
    await tx.milestone.createMany({
      data: Array.from({ length: milestoneCount }, (_, i) => ({
        case_id: createdCase.id,
        number: i + 1,
        title: `Milestone ${i + 1}`,
        amount: perMilestoneAmount,
        status: 'draft',
        updated_at: new Date(),
      })),
    });

    // 6. Record case creation event
    await tx.caseEvent.create({
      data: {
        case_id: createdCase.id,
        actor_id: session.user.id,
        event_type: 'case_created',
        title: 'Case opened',
        description: `Proposal from Adv. ${proposal.lawyer.full_name} accepted. ${milestoneCount} milestone${milestoneCount > 1 ? 's' : ''} created.`,
      },
    });

    // 7. Update lawyer's total_cases count
    await tx.lawyerProfile.update({
      where: { id: proposal.lawyer_id },
      data: { total_cases: { increment: 1 } },
    });

    return { newCase: createdCase };
  });

  // Notify lawyer (with email — accepting a case is high-value)
  await notify({
    userId: proposal.lawyer_id,
    type: 'proposal_accepted',
    title: 'Your Proposal Was Accepted',
    body: `Your proposal for "${proposal.brief.title}" has been accepted. Please define your milestones to begin work.`,
    link: `/lawyer/cases/${newCase.id}`,
    sendEmail: true,
    emailData: {
      subject: 'Your Proposal Was Accepted',
    },
  });

  return NextResponse.json({ caseId: newCase.id });
}
