import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// DELETE /api/enterprise/associates/[id] — remove an associate
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const associate = await prisma.enterpriseAssociate.findUnique({ where: { id: params.id } });
  if (!associate || associate.enterprise_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.enterpriseAssociate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/enterprise/associates/[id] — update role
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await req.json();
  const associate = await prisma.enterpriseAssociate.findUnique({ where: { id: params.id } });
  if (!associate || associate.enterprise_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.enterpriseAssociate.update({
    where: { id: params.id },
    data: { role },
  });
  return NextResponse.json({ associate: updated });
}
