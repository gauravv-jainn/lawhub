import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const createBriefSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  category: z.string().min(1, 'Category is required'),
  court: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  urgency: z.enum(['standard', 'urgent', 'emergency']).optional(),
  description: z.string().min(50, 'Description must be at least 50 characters').max(10000),
  structured_summary: z.unknown().optional().nullable(),
  budget_min: z.coerce.number().min(500000, 'Minimum budget is ₹5,000').optional().nullable(),
  budget_max: z.coerce.number().min(500000, 'Maximum budget is ₹5,000').optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Accept optional cursor for pagination
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

  try {
    const briefs = await prisma.brief.findMany({
      where: { client_id: session.user.id },
      orderBy: { created_at: 'desc' },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: { select: { bids: true } },
        documents: { select: { id: true, name: true, url: true } },
      },
    });

    const hasNext = briefs.length > limit;
    const page = hasNext ? briefs.slice(0, limit) : briefs;
    const nextCursor = hasNext ? page[page.length - 1].id : null;

    return NextResponse.json({ briefs: page, nextCursor });
  } catch (err: unknown) {
    console.error('[GET /api/briefs]', err);
    return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['client', 'ngo'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

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
  } = parsed.data;

  try {
    const brief = await prisma.brief.create({
      data: {
        client_id: session.user.id,
        title: title.trim(),
        category,
        court: court || null,
        city: city || null,
        state: state || null,
        urgency: urgency ?? 'standard',
        description,
        structured_summary: structured_summary != null ? (structured_summary as Prisma.InputJsonValue) : Prisma.DbNull,
        budget_min: budget_min ?? null,
        budget_max: budget_max ?? null,
        status: 'open',
      },
    });

    // Bulk-insert admin notifications in a single query (no sequential loop)
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          user_id: admin.id,
          type: 'new_brief',
          title: 'New Brief Posted',
          body: `A new brief "${brief.title}" was posted.`,
          link: `/admin/briefs`,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ brief }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/briefs]', err);
    return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });
  }
}
