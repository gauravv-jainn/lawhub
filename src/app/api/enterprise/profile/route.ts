import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.enterpriseProfile.findUnique({ where: { id: session.user.id } });
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { full_name, phone, city, state, firm_name, website, description } = body;

  await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { full_name: full_name?.trim() || undefined, phone: phone ?? null },
    }),
    prisma.enterpriseProfile.update({
      where: { id: session.user.id },
      data: {
        firm_name: firm_name?.trim() || undefined,
        city: city ?? null,
        state: state ?? null,
        website: website ?? null,
        description: description ?? null,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
