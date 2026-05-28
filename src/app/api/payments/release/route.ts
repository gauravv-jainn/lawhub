import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// TDS Section 194J: 10% on professional fees ≥ ₹30,000
const TDS_THRESHOLD_PAISE = 3_000_000; // ₹30,000 in paise
const TDS_RATE = 0.10;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId } = await req.json() as { paymentId?: string };
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

    // Verify payment belongs to this client's case and is in held state
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        client_id: session.user.id, // ownership check
        status: 'held',
      },
      select: {
        id: true,
        amount: true,
        case_id: true,
        lawyer_id: true,
        milestone_number: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found, not yours, or not in held state' },
        { status: 404 }
      );
    }

    // TDS calculation (Section 194J) — server-side only, never trust client
    const tds_applicable = payment.amount >= TDS_THRESHOLD_PAISE;
    const tds_amount = tds_applicable ? Math.round(payment.amount * TDS_RATE) : 0;
    const lawyer_final_amount = payment.amount - tds_amount;

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'released',
        tds_applicable,
        tds_amount,
        lawyer_final_amount,
      },
    });

    // Notify lawyer of release
    await prisma.notification.create({
      data: {
        user_id: payment.lawyer_id,
        type: 'payment_released',
        title: 'Payment Released',
        body: `Milestone ${payment.milestone_number} payment has been released by your client.`,
        link: `/lawyer/cases/${payment.case_id}`,
      },
    });

    return NextResponse.json({ payment: updated });
  } catch (err: unknown) {
    console.error('[POST /api/payments/release]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
