import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/enterprise/associates — list all associates for the enterprise
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const associates = await prisma.enterpriseAssociate.findMany({
    where: { enterprise_id: session.user.id },
    include: {
      lawyer: {
        include: {
          user: { select: { id: true, full_name: true, email: true, phone: true, avatar_url: true } },
        },
      },
    },
    orderBy: { joined_at: 'desc' },
  });

  return NextResponse.json({ associates });
}

// POST /api/enterprise/associates — invite a lawyer by BCI number or email
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { identifier, role } = await req.json(); // identifier = email or BCI number

  // Find lawyer by email
  const user = await prisma.user.findFirst({
    where: { email: identifier, role: 'lawyer' },
    include: { lawyer_profile: true },
  });

  if (!user || !user.lawyer_profile) {
    return NextResponse.json({ error: 'No verified lawyer found with that email' }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.enterpriseAssociate.findUnique({
    where: { lawyer_id: user.lawyer_profile.id },
  });
  if (existing) {
    return NextResponse.json({ error: 'This advocate is already a member of a firm' }, { status: 409 });
  }

  const associate = await prisma.enterpriseAssociate.create({
    data: {
      enterprise_id: session.user.id,
      lawyer_id: user.lawyer_profile.id,
      role: role ?? 'associate',
    },
  });

  // Notify the lawyer
  await prisma.notification.create({
    data: {
      user_id: user.id,
      type: 'enterprise_invite',
      title: 'Added to a Firm',
      body: `You have been added as ${role ?? 'associate'} to a law firm on LawHub.`,
      link: '/lawyer/profile',
    },
  });

  return NextResponse.json({ associate }, { status: 201 });
}
