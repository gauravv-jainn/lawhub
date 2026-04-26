import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/internships/[id]/applications — enterprise sees all applicants
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const posting = await prisma.internshipPosting.findUnique({ where: { id: params.id } });
  if (!posting || posting.enterprise_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const applications = await prisma.internshipApplication.findMany({
    where: { posting_id: params.id },
    include: {
      applicant: { select: { id: true, full_name: true, email: true, phone: true, city: true, state: true, avatar_url: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json({ applications });
}

// PATCH /api/internships/[id]/applications — update applicant status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { application_id, status } = await req.json();
  const validStatuses = ['reviewed', 'shortlisted', 'rejected', 'accepted'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const application = await prisma.internshipApplication.update({
    where: { id: application_id },
    data: { status },
  });

  // Notify applicant
  const statusLabels: Record<string, string> = {
    reviewed: 'Your application has been reviewed.',
    shortlisted: 'Congratulations! You have been shortlisted.',
    rejected: 'Your application was not selected this time.',
    accepted: '🎉 You have been accepted for the internship!',
  };

  const posting = await prisma.internshipPosting.findUnique({ where: { id: params.id } });
  if (posting) {
    await prisma.notification.create({
      data: {
        user_id: application.applicant_id,
        type: 'internship_status',
        title: 'Application Update',
        body: statusLabels[status] || `Application status: ${status}`,
        link: `/student/internships`,
      },
    });
  }

  return NextResponse.json({ application });
}
