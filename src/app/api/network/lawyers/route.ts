import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// GET /api/network/lawyers — browse verified lawyer directory
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);

  const practice_area = searchParams.get('area');
  const state = searchParams.get('state');
  const search = searchParams.get('q');
  const only_advice = searchParams.get('only_advice') === 'true';

  const lawyers = await prisma.user.findMany({
    where: {
      role: 'lawyer',
      lawyer_profile: {
        verification_status: 'verified',
        ...(practice_area && { practice_areas: { has: practice_area } }),
        ...(only_advice && { only_legal_advice: true }),
      },
      ...(state && { state }),
      ...(search && {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { lawyer_profile: { primary_court: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    select: {
      id: true,
      full_name: true,
      city: true,
      state: true,
      avatar_url: true,
      lawyer_profile: {
        select: {
          id: true,
          experience_years: true,
          practice_areas: true,
          primary_court: true,
          avg_rating: true,
          review_count: true,
          total_cases: true,
          lawyer_type: true,
          only_legal_advice: true,
          bio: true,
        },
      },
    },
    orderBy: [
      { lawyer_profile: { avg_rating: 'desc' } },
      { lawyer_profile: { total_cases: 'desc' } },
    ],
    take: 60,
  });

  // Attach connection status if logged in
  let connectionMap: Record<string, { id: string; status: string }> = {};
  if (session?.user) {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requester_id: session.user.id },
          { recipient_id: session.user.id },
        ],
      },
    });
    for (const c of connections) {
      const otherId = c.requester_id === session.user.id ? c.recipient_id : c.requester_id;
      connectionMap[otherId] = { id: c.id, status: c.status };
    }
  }

  const lawyersWithConnection = lawyers.map(l => ({
    ...l,
    connection: connectionMap[l.id] ?? null,
  }));

  return NextResponse.json({ lawyers: lawyersWithConnection });
}
