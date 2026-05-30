/**
 * GET  /api/admin/payouts  — list all payouts (with filter)
 * POST /api/admin/payouts  — initiate a payout to a lawyer
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeLedger } from '@/lib/ledger';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const initiateSchema = z.object({
  lawyer_id:  z.string().cuid(),
  amount:     z.number().int().positive(),
  notes:      z.string().max(500).optional(),
  payment_ids: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status');
  const lawyerId = searchParams.get('lawyer_id');
  const limit    = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
  const cursor   = searchParams.get('cursor');

  const payouts = await prisma.payout.findMany({
    where: {
      ...(status    ? { status: status as 'pending' | 'processing' | 'completed' | 'failed' } : {}),
      ...(lawyerId  ? { lawyer_id: lawyerId } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      lawyer: {
        select: {
          full_name: true,
          email:     true,
          payout_bank_details: {
            select: { account_holder_name: true, bank_name: true, ifsc_code: true, verified: true },
          },
        },
      },
    },
  });

  const hasNext   = payouts.length > limit;
  const page      = hasNext ? payouts.slice(0, limit) : payouts;
  const nextCursor = hasNext ? page[page.length - 1].id : null;

  return NextResponse.json({ payouts: page, nextCursor });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { lawyer_id, amount, notes, payment_ids } = parsed.data;

  // Verify bank details exist and are verified
  const bankDetails = await prisma.payoutBankDetails.findUnique({
    where: { lawyer_id },
    select: { verified: true, bank_name: true, ifsc_code: true },
  });

  if (!bankDetails) {
    return NextResponse.json(
      { error: 'Lawyer has not submitted bank details.' },
      { status: 400 }
    );
  }
  if (!bankDetails.verified) {
    return NextResponse.json(
      { error: 'Bank details must be verified before initiating a payout.' },
      { status: 400 }
    );
  }

  const payout = await prisma.payout.create({
    data: {
      lawyer_id,
      amount,
      status:       'pending',
      notes:        notes ?? null,
      payment_ids:  payment_ids ?? [],
      initiated_by: session.user.id,
      initiated_at: new Date(),
    },
  });

  // Find any case_id linked to these payments for ledger entries
  if (payment_ids && payment_ids.length > 0) {
    const payments = await prisma.payment.findMany({
      where: { id: { in: payment_ids } },
      select: { id: true, case_id: true, amount: true },
    });

    const caseGroups = new Map<string, { paymentId: string; amount: number }[]>();
    for (const p of payments) {
      if (!caseGroups.has(p.case_id)) caseGroups.set(p.case_id, []);
      caseGroups.get(p.case_id)!.push({ paymentId: p.id, amount: p.amount });
    }

    for (const [caseId, pmts] of caseGroups) {
      await writeLedger({
        caseId,
        eventType:   'payout_initiated',
        amount:      pmts.reduce((s, p) => s + p.amount, 0),
        description: `Payout initiated to lawyer: ₹${amount / 100}`,
        actorId:     session.user.id,
        metadata:    { payout_id: payout.id, bank: bankDetails.bank_name },
      });
    }
  }

  await prisma.adminLog.create({
    data: {
      admin_id:    session.user.id,
      action:      'initiate_payout',
      target_id:   payout.id,
      target_type: 'payout',
      notes:       notes,
      metadata:    { lawyer_id, amount },
    },
  });

  return NextResponse.json({ payout }, { status: 201 });
}
