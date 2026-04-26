import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });

    // Verify the payment belongs to this client's case
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { case: { select: { client_id: true } } },
    });

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.case.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (payment.status !== 'held') {
      return NextResponse.json({ error: 'Payment cannot be released in its current state' }, { status: 400 });
    }

    // TDS logic (amounts in paise; ₹30,000 = 3,000,000 paise)
    const tds_applicable = payment.amount >= 3000000;
    const tds_amount = tds_applicable ? Math.round(payment.amount * 0.10) : 0;
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

    return NextResponse.json({ payment: updated });
  } catch (err) {
    console.error('[POST /api/payments/release]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
