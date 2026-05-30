import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/resend';
import { authRateLimit } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = await authRateLimit(req, 'resend-verification');
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      email_verified_at: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.email_verified_at) {
    return NextResponse.json({ error: 'Email is already verified.' }, { status: 400 });
  }

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verification_token:   token,
      email_verification_expires: expires,
    },
  });

  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(user.email, user.full_name, verificationUrl);
  } catch (err) {
    console.error('[resend-verification] Email send failed:', err);
    return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
