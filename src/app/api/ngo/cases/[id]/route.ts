import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// PATCH /api/ngo/cases/[id] — update status or assign lawyer
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ngo') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ngoCase = await prisma.nGOCase.findUnique({ where: { id: params.id } });
    if (!ngoCase || ngoCase.ngo_id !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await prisma.nGOCase.update({
      where: { id: params.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.lawyer_id !== undefined && { lawyer_id: body.lawyer_id }),
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
      },
    });

    return NextResponse.json({ case: updated });
  } catch (err) {
    console.error('[PATCH /api/ngo/cases/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ngo/cases/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ngo') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ngoCase = await prisma.nGOCase.findUnique({ where: { id: params.id } });
    if (!ngoCase || ngoCase.ngo_id !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.nGOCase.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/ngo/cases/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
