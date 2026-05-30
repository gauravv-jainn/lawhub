/**
 * POST /api/auth/2fa/verify
 * Verify TOTP (or recovery code) at login for non-admin users.
 * Updates last_verified_at so session.update() picks up twoFactorVerified = true.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyTotp, verifyAndConsumeRecoveryCode } from '@/lib/totp';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { token?: string; recoveryCode?: string };
  const { token, recoveryCode } = body;

  const userId = session.user.id;

  const record = await prisma.userTwoFA.findUnique({
    where: { user_id: userId },
    select: { totp_secret: true, backup_codes: true, enabled: true, setup_completed_at: true },
  });

  if (!record?.enabled || !record.setup_completed_at) {
    return NextResponse.json({ error: '2FA is not configured.' }, { status: 400 });
  }

  // Recovery code path
  if (recoveryCode) {
    const codes = record.backup_codes as string[];
    const remaining = verifyAndConsumeRecoveryCode(recoveryCode.trim(), codes);
    if (!remaining) {
      return NextResponse.json({ error: 'Invalid recovery code.' }, { status: 400 });
    }
    await prisma.userTwoFA.update({
      where: { user_id: userId },
      data: { backup_codes: remaining, last_verified_at: new Date() },
    });
    return NextResponse.json({ ok: true, codesRemaining: remaining.length });
  }

  // TOTP path
  if (!token || !/^\d{6}$/.test(token)) {
    return NextResponse.json(
      { error: 'Provide a 6-digit TOTP code or a recovery code.' },
      { status: 400 },
    );
  }

  const valid = verifyTotp(token, record.totp_secret);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect code. Try again.' }, { status: 400 });
  }

  await prisma.userTwoFA.update({
    where: { user_id: userId },
    data: { last_verified_at: new Date() },
  });

  return NextResponse.json({ ok: true });
}
