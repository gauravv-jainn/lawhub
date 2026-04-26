import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// GET /api/network/connections — get current user's connections
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [sent, received] = await Promise.all([
      prisma.connection.findMany({
        where: { requester_id: session.user.id },
        include: {
          recipient: { select: { id: true, full_name: true, email: true, avatar_url: true, role: true, city: true, state: true } },
        },
      }),
      prisma.connection.findMany({
        where: { recipient_id: session.user.id },
        include: {
          requester: { select: { id: true, full_name: true, email: true, avatar_url: true, role: true, city: true, state: true } },
        },
      }),
    ]);

    return NextResponse.json({ sent, received });
  } catch (err) {
    console.error('[GET /api/network/connections]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/network/connections — send a connection request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipient_id } = await req.json();
    if (!recipient_id || recipient_id === session.user.id) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    // Check for existing connection (either direction)
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requester_id: session.user.id, recipient_id },
          { requester_id: recipient_id, recipient_id: session.user.id },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Connection already exists', connection: existing }, { status: 409 });
    }

    const connection = await prisma.connection.create({
      data: { requester_id: session.user.id, recipient_id, status: 'pending' },
    });

    // Notify recipient
    const sender = await prisma.user.findUnique({ where: { id: session.user.id }, select: { full_name: true } });
    await prisma.notification.create({
      data: {
        user_id: recipient_id,
        type: 'connection_request',
        title: 'New Connection Request',
        body: `${sender?.full_name} wants to connect with you on LawHub.`,
        link: '/network',
      },
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/network/connections]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
