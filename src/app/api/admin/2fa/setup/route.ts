/**
 * GET  /api/admin/2fa/setup — generate (or return existing pending) TOTP secret
 * POST /api/admin/2fa/setup — deprecated: use /confirm instead
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If already fully set up, deny re-setup without explicit reset
  const existing = await prisma.admin2FA.findUnique({
    where: { user_id: session.user.id },
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

    await prisma.admin2FA.upsert({
      where: { user_id: session.user.id },
      create: {
        user_id: session.user.id,
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

  const uri = getTotpUri(secret, session.user.email ?? '', 'LawHub Admin');

  return NextResponse.json({ secret, uri });
}
