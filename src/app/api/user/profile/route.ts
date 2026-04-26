import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        city: true,
        state: true,
        role: true,
        avatar_url: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ profile: user });
  } catch (err) {
    console.error('[GET /api/user/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { full_name, phone, city, state } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        full_name: full_name.trim(),
        phone: phone ?? null,
        city: city ?? null,
        state: state ?? null,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        city: true,
        state: true,
        role: true,
        avatar_url: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error('[PATCH /api/user/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
