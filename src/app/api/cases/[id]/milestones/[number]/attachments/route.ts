/**
 * POST   /api/cases/[id]/milestones/[number]/attachments
 * DELETE /api/cases/[id]/milestones/[number]/attachments/[attachmentId]
 *
 * POST: Upload a file attachment to a milestone.
 *   - Lawyer can attach on any non-paid/non-cancelled milestone.
 *   - Client can attach on submitted milestones (to provide context).
 *   - Expects multipart/form-data with field "file".
 *   - Uses Cloudinary for storage (server-side upload).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadFileServer } from '@/lib/cloudinary-server';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; number: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const milestoneNumber = parseInt(params.number, 10);
  if (isNaN(milestoneNumber)) return NextResponse.json({ error: 'Invalid milestone number.' }, { status: 400 });

  // Verify case membership
  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: { id: true, client_id: true, lawyer_id: true, status: true },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  if (['completed', 'cancelled'].includes(caseRow.status)) {
    return NextResponse.json({ error: 'Cannot upload to a closed case.' }, { status: 400 });
  }

  const milestone = await prisma.milestone.findUnique({
    where: { case_id_number: { case_id: params.id, number: milestoneNumber } },
    select: { id: true, status: true },
  });
  if (!milestone) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  if (['paid', 'cancelled'].includes(milestone.status)) {
    return NextResponse.json({ error: 'Cannot upload to a paid or cancelled milestone.' }, { status: 400 });
  }

  // Role-based upload permissions
  const isLawyer  = session.user.id === caseRow.lawyer_id;
  const isClient  = session.user.id === caseRow.client_id;

  // Clients can only attach when milestone is submitted (providing context for review)
  if (isClient && !['submitted', 'disputed'].includes(milestone.status)) {
    return NextResponse.json(
      { error: 'Clients can only upload attachments to submitted or disputed milestones.' },
      { status: 403 }
    );
  }
  // Lawyers can attach in any active state
  if (isLawyer && ['approved', 'paid'].includes(milestone.status)) {
    return NextResponse.json(
      { error: 'Cannot upload attachments to an approved or paid milestone.' },
      { status: 403 }
    );
  }

  // Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: PDF, images, Word documents, text files.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` },
      { status: 400 }
    );
  }

  // Check attachment count limit
  const existingCount = await prisma.milestoneAttachment.count({
    where: { milestone_id: milestone.id },
  });
  if (existingCount >= 10) {
    return NextResponse.json({ error: 'Maximum 10 attachments per milestone.' }, { status: 400 });
  }

  // Upload to Cloudinary
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  let uploadResult: { url: string; publicId: string };
  try {
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    uploadResult = await uploadFileServer(
      buffer,
      safeName,
      `lawhub/cases/${params.id}/milestones/${milestoneNumber}`
    );
  } catch (err) {
    console.error('[milestone/attachments] Cloudinary upload error:', err);
    return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 });
  }

  // Save to DB
  const attachment = await prisma.milestoneAttachment.create({
    data: {
      milestone_id: milestone.id,
      name:         file.name,
      url:          uploadResult.url,
      uploaded_by:  session.user.id,
    },
  });

  return NextResponse.json({ attachment }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; number: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { attachmentId } = (await req.json()) as { attachmentId?: string };
  if (!attachmentId) return NextResponse.json({ error: 'attachmentId required.' }, { status: 400 });

  const milestoneNumber = parseInt(params.number, 10);

  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: { id: true, lawyer_id: true },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const attachment = await prisma.milestoneAttachment.findFirst({
    where: {
      id: attachmentId,
      milestone: { case_id_number: { case_id: params.id, number: milestoneNumber } },
    },
  });
  if (!attachment) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });

  // Only the uploader or the lawyer can delete
  if (attachment.uploaded_by !== session.user.id && caseRow.lawyer_id !== session.user.id) {
    return NextResponse.json({ error: 'You can only delete your own attachments.' }, { status: 403 });
  }

  await prisma.milestoneAttachment.delete({ where: { id: attachmentId } });
  return NextResponse.json({ ok: true });
}
