import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// GET /api/ngo/cases — list NGO's cases
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ngo') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cases = await prisma.nGOCase.findMany({
      where: { ngo_id: session.user.id },
      include: {
        lawyer: { select: { id: true, full_name: true, email: true, avatar_url: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ cases });
  } catch (err) {
    console.error('[GET /api/ngo/cases]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ngo/cases — create a new NGO case
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ngo') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, category, location } = await req.json();
    if (!title || !description || !category) {
      return NextResponse.json({ error: 'title, description and category are required' }, { status: 400 });
    }

    const newCase = await prisma.nGOCase.create({
      data: {
        ngo_id: session.user.id,
        title,
        description,
        category,
        location: location ?? null,
        status: 'open',
      },
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/ngo/cases]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
