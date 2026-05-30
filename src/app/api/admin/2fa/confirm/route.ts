/**
 * POST /api/admin/2fa/confirm
 * Verify TOTP and complete 2FA setup. Returns plaintext recovery codes (shown once).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyTotp, generateRecoveryCodes, hashRecoveryCode } from '@/lib/totp';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { token?: string };
  const { token } = body;
  if (!token || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token format. Enter the 6-digit code.' }, { status: 400 });
  }

  const record = await prisma.admin2FA.findUnique({
    where: { user_id: session.user.id },
    select: { totp_secret: true, setup_completed_at: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'Start setup first.' }, { status: 400 });
  }
  if (record.setup_completed_at) {
    return NextResponse.json({ error: '2FA is already configured.' }, { status: 409 });
  }

  const valid = verifyTotp(token, record.totp_secret);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect code. Check your authenticator and try again.' }, { status: 400 });
  }

  // Generate fresh recovery codes to return to the user (plaintext, shown once)
  const recoveryCodes = generateRecoveryCodes(8);
  const hashedCodes   = recoveryCodes.map(hashRecoveryCode);

  await prisma.admin2FA.update({
    where: { user_id: session.user.id },
    data: {
      backup_codes:       hashedCodes,
      enabled:            true,
      setup_completed_at: new Date(),
      last_verified_at:   new Date(),
    },
  });

  return NextResponse.json({ recoveryCodes });
}
