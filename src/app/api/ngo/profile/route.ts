import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ngo')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { full_name: true, email: true, phone: true },
    }),
    prisma.nGOProfile.findUnique({ where: { id: session.user.id } }),
  ]);

  return NextResponse.json({ user, profile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ngo')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { full_name, phone, city, state, org_name, website, description, cause_areas } = body;

  await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { full_name: full_name?.trim() || undefined, phone: phone ?? null },
    }),
    prisma.nGOProfile.update({
      where: { id: session.user.id },
      data: {
        org_name: org_name?.trim() || undefined,
        city: city ?? null,
        state: state ?? null,
        website: website ?? null,
        description: description ?? null,
        cause_areas: Array.isArray(cause_areas) ? cause_areas : undefined,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
