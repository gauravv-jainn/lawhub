import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/internships — public listing (filtered)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');
  const remote = searchParams.get('remote');
  const search = searchParams.get('q');

  const postings = await prisma.internshipPosting.findMany({
    where: {
      status: 'active',
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(remote === 'true' && { remote: true }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      enterprise: { select: { id: true, firm_name: true, firm_type: true, city: true, state: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json({ postings });
}

// POST /api/internships — create a posting (enterprise only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Only enterprises can post internships' }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, duration, stipend, skills, location, remote, openings, closes_at } = body;

  if (!title || !description || !duration) {
    return NextResponse.json({ error: 'title, description and duration are required' }, { status: 400 });
  }

  const posting = await prisma.internshipPosting.create({
    data: {
      enterprise_id: session.user.id,
      title,
      description,
      duration,
      stipend: stipend ?? null,
      skills: skills ?? [],
      location: location ?? null,
      remote: Boolean(remote),
      openings: Number(openings) || 1,
      closes_at: closes_at ? new Date(closes_at) : null,
      status: 'active',
    },
  });

  return NextResponse.json({ posting }, { status: 201 });
}
