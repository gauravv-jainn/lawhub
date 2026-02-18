import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { themePreference } = await req.json();
  const user = await prisma.user.update({ where: { id: session.user.id }, data: { themePreference } as any, select: { themePreference: true } });
  return NextResponse.json(user);
}
