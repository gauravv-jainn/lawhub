/**
 * GET  /api/lawyer/payout-bank  — fetch current bank details
 * POST /api/lawyer/payout-bank  — create or update bank details (triggers re-verification)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const bankSchema = z.object({
  account_holder_name: z.string().min(2).max(100),
  bank_name:           z.string().min(2).max(100),
  account_number:      z.string().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  ifsc_code:           z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const details = await prisma.payoutBankDetails.findUnique({
    where: { lawyer_id: session.user.id },
    select: {
      account_holder_name: true,
      bank_name:           true,
      account_number:      true,
      ifsc_code:           true,
      verified:            true,
      verified_at:         true,
    },
  });

  return NextResponse.json({ details });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body   = await req.json();
  const parsed = bankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { account_holder_name, bank_name, account_number, ifsc_code } = parsed.data;

  const details = await prisma.payoutBankDetails.upsert({
    where: { lawyer_id: session.user.id },
    create: {
      lawyer_id:           session.user.id,
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      verified:            false,
    },
    update: {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      // Reset verification on any change
      verified:     false,
      verified_by:  null,
      verified_at:  null,
    },
  });

  return NextResponse.json({ details });
}
