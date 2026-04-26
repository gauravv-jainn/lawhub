import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/student/applications — current user's internship applications
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const applications = await prisma.internshipApplication.findMany({
    where: { applicant_id: session.user.id },
    include: {
      posting: {
        include: {
          enterprise: { select: { id: true, firm_name: true, firm_type: true, city: true, state: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json({ applications });
}
