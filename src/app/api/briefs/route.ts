import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const briefs = await prisma.brief.findMany({
      where: { client_id: session.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { bids: true } },
        documents: { select: { id: true, name: true, url: true } },
      },
    });
    return NextResponse.json({ briefs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['client', 'ngo'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    category,
    court,
    city,
    state,
    urgency,
    description,
    structured_summary,
    budget_min,
    budget_max,
  } = body;

  if (!title || !category || !description) {
    return NextResponse.json({ error: 'Title, category, and description are required' }, { status: 400 });
  }

  if (description.length < 50) {
    return NextResponse.json({ error: 'Description must be at least 50 characters' }, { status: 400 });
  }

  try {
    const brief = await prisma.brief.create({
      data: {
        client_id: session.user.id,
        title: title.trim(),
        category,
        court: court || null,
        city: city || null,
        state: state || null,
        urgency: urgency || 'standard',
        description,
        structured_summary: structured_summary || null,
        budget_min: budget_min ? Number(budget_min) : null,
        budget_max: budget_max ? Number(budget_max) : null,
        status: 'open',
      },
    });

    // Notify admin of new brief
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          user_id: admin.id,
          type: 'new_brief',
          title: 'New Brief Posted',
          body: `A new brief "${brief.title}" was posted and needs review.`,
          link: `/admin/briefs`,
        },
      });
    }

    return NextResponse.json({ brief }, { status: 201 });
  } catch (err: any) {
    console.error('Brief creation error:', err);
    return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });
  }
}
