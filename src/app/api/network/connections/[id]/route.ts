import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// PATCH /api/network/connections/[id] — accept or reject
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status } = await req.json();
    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const connection = await prisma.connection.findUnique({ where: { id: params.id } });
    if (!connection || connection.recipient_id !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.connection.update({
      where: { id: params.id },
      data: { status },
    });

    if (status === 'accepted') {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { full_name: true } });
      await prisma.notification.create({
        data: {
          user_id: connection.requester_id,
          type: 'connection_accepted',
          title: 'Connection Accepted',
          body: `${user?.full_name} accepted your connection request.`,
          link: '/network',
        },
      });
    }

    return NextResponse.json({ connection: updated });
  } catch (err) {
    console.error('[PATCH /api/network/connections/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/network/connections/[id] — remove connection
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const connection = await prisma.connection.findUnique({ where: { id: params.id } });
    if (!connection || (connection.requester_id !== session.user.id && connection.recipient_id !== session.user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.connection.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/network/connections/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
