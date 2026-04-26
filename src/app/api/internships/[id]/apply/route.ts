import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/internships/[id]/apply
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['student', 'lawyer'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Only students and lawyers can apply' }, { status: 403 });
  }

  const posting = await prisma.internshipPosting.findUnique({ where: { id: params.id } });
  if (!posting || posting.status !== 'active') {
    return NextResponse.json({ error: 'Posting not found or closed' }, { status: 404 });
  }

  // Check duplicate
  const existing = await prisma.internshipApplication.findUnique({
    where: { posting_id_applicant_id: { posting_id: params.id, applicant_id: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'You have already applied' }, { status: 409 });
  }

  const { cover_letter, resume_url } = await req.json();
  if (!cover_letter) {
    return NextResponse.json({ error: 'Cover letter is required' }, { status: 400 });
  }

  const application = await prisma.internshipApplication.create({
    data: {
      posting_id: params.id,
      applicant_id: session.user.id,
      cover_letter,
      resume_url: resume_url ?? null,
      status: 'pending',
    },
  });

  // Notify enterprise
  await prisma.notification.create({
    data: {
      user_id: posting.enterprise_id,
      type: 'internship_application',
      title: 'New Internship Application',
      body: `A new application was received for "${posting.title}".`,
      link: `/enterprise/internships/${params.id}`,
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}

// GET /api/internships/[id]/apply — check if current user already applied
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ applied: false });

  const existing = await prisma.internshipApplication.findUnique({
    where: { posting_id_applicant_id: { posting_id: params.id, applicant_id: session.user.id } },
  });

  return NextResponse.json({ applied: !!existing, application: existing });
}
