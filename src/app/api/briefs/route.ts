/**
 * GET  /api/briefs  — client's own briefs list (paginated)
 * POST /api/briefs  — client/NGO posts a new brief
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const BRIEF_EXPIRY_DAYS = 30;

const createBriefSchema = z.object({
  title:              z.string().min(5, 'Title must be at least 5 characters').max(200),
  category:           z.string().min(1, 'Category is required'),
  court:              z.string().optional().nullable(),
  city:               z.string().optional().nullable(),
  state:              z.string().optional().nullable(),
  urgency:            z.enum(['standard', 'urgent', 'emergency']).optional(),
  description:        z.string().min(50, 'Description must be at least 50 characters').max(10_000),
  structured_summary: z.unknown().optional().nullable(),
  budget_min:         z.coerce.number().min(500_000, 'Minimum budget is ₹5,000').optional().nullable(),
  budget_max:         z.coerce.number().min(500_000, 'Maximum budget is ₹5,000').optional().nullable(),
  pro_bono:           z.boolean().optional().default(false),
});

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit  = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

  try {
    const briefs = await prisma.brief.findMany({
      where: { client_id: session.user.id },
      orderBy: { created_at: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: { select: { proposals: true } },
        documents: { select: { id: true, name: true, url: true } },
      },
    });

    const hasNext  = briefs.length > limit;
    const page     = hasNext ? briefs.slice(0, limit) : briefs;
    const nextCursor = hasNext ? page[page.length - 1].id : null;

    return NextResponse.json({ briefs: page, nextCursor });
  } catch (err) {
    console.error('[GET /api/briefs]', err);
    return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['client', 'ngo'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Only clients and NGOs may post briefs.' }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    title, category, court, city, state, urgency,
    description, structured_summary, budget_min, budget_max, pro_bono,
  } = parsed.data;

  // NGO briefs can be pro bono (zero-fee). Regular clients cannot.
  const isProBono = session.user.role === 'ngo' && pro_bono === true;

  if (!isProBono && (!budget_min || !budget_max)) {
    return NextResponse.json({ error: 'Budget range is required for non-pro-bono briefs.' }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + BRIEF_EXPIRY_DAYS);

  try {
    const brief = await prisma.brief.create({
      data: {
        client_id: session.user.id,
        title: title.trim(),
        category,
        court:    court    || null,
        city:     city     || null,
        state:    state    || null,
        urgency:  urgency  ?? 'standard',
        description,
        structured_summary: structured_summary != null
          ? (structured_summary as Prisma.InputJsonValue)
          : Prisma.DbNull,
        budget_min: isProBono ? 0 : (budget_min ?? null),
        budget_max: isProBono ? 0 : (budget_max ?? null),
        pro_bono: isProBono,
        status: 'open',
        expires_at: expiresAt,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/briefs]', err);
    return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });
  }
}
