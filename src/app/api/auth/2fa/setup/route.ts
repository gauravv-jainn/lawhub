/**
 * GET /api/auth/2fa/setup
 * Generate (or return existing pending) TOTP secret for non-admin users.
 * Called once when the user first visits /auth/2fa/setup.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  generateTotpSecret,
  getTotpUri,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/totp';
export const dynamic = 'force-dynamic';

const ADMIN_ROLE = 'admin';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === ADMIN_ROLE) {
    // Admins use /api/admin/2fa/setup; unauthenticated users are rejected
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // If already fully set up, deny re-setup without explicit reset
  const existing = await prisma.userTwoFA.findUnique({
    where: { user_id: userId },
    select: { totp_secret: true, setup_completed_at: true, enabled: true },
  });

  if (existing?.setup_completed_at && existing.enabled) {
    return NextResponse.json({ error: '2FA is already configured.' }, { status: 409 });
  }

  // Reuse pending secret or generate fresh
  let secret: string;
  if (existing?.totp_secret && !existing.setup_completed_at) {
    secret = existing.totp_secret;
  } else {
    secret = generateTotpSecret();
    const recoveryCodes = generateRecoveryCodes(8);
    const hashedCodes = recoveryCodes.map(hashRecoveryCode);

    await prisma.userTwoFA.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        totp_secret: secret,
        backup_codes: hashedCodes,
        enabled: false,
      },
      update: {
        totp_secret: secret,
        backup_codes: hashedCodes,
        enabled: false,
        setup_completed_at: null,
      },
    });
  }

  const appName = 'LawHub';
  const uri = getTotpUri(secret, session.user.email ?? '', appName);

  return NextResponse.json({ secret, uri });
}
