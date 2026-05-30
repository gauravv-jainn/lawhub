import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=missing_token', req.url));
  }

  const user = await prisma.user.findUnique({
    where: { email_verification_token: token },
    select: {
      id: true,
      email_verified_at: true,
      email_verification_expires: true,
    },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=invalid_token', req.url));
  }

  if (user.email_verified_at) {
    return NextResponse.redirect(new URL('/auth/verify-email?status=already_verified', req.url));
  }

  if (user.email_verification_expires && user.email_verification_expires < new Date()) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=expired', req.url));
  }

  await prisma.user.update({
    where: { email_verification_token: token },
    data: {
      email_verified_at:          new Date(),
      email_verification_token:   null,
      email_verification_expires: null,
    },
  });

  return NextResponse.redirect(new URL('/auth/verify-email?status=verified', req.url));
}
