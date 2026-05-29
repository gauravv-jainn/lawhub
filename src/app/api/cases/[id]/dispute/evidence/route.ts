/**
 * POST /api/cases/[id]/dispute/evidence
 * Upload evidence for an active dispute.
 * Files stored as Cloudinary "authenticated" type — accessible only via signed URL.
 *
 * GET /api/cases/[id]/dispute/evidence
 * List evidence for the dispute (metadata only — no raw URLs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadFileSecure } from '@/lib/cloudinary-server';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_SIZE_MB       = 15;
const MAX_SIZE_BYTES    = MAX_SIZE_MB * 1024 * 1024;
const MAX_PER_PARTY     = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify case membership
  const caseRow = await prisma.case.findFirst({
    where: {
      id: params.id,
      OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }],
    },
    select: { id: true, dispute: { select: { id: true, status: true } } },
  });
  if (!caseRow) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });

  const dispute = caseRow.dispute;
  if (!dispute) {
    return NextResponse.json({ error: 'No active dispute on this case.' }, { status: 404 });
  }
  if (!['open', 'under_review'].includes(dispute.status)) {
    return NextResponse.json(
      { error: `Evidence can only be uploaded to open or under-review disputes (current: ${dispute.status}).` },
      { status: 400 }
    );
  }

  // Per-party limit
  const existingCount = await prisma.disputeEvidence.count({
    where: { dispute_id: dispute.id, uploaded_by: session.user.id },
  });
  if (existingCount >= MAX_PER_PARTY) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PER_PARTY} evidence files per party per dispute.` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Accepted: PDF, images, Word documents, text files.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  let uploadResult: { url: string; publicId: string };
  try {
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    uploadResult = await uploadFileSecure(
      buffer,
      safeName,
      `lawhub/disputes/${dispute.id}`
    );
  } catch (err) {
    console.error('[dispute/evidence] Cloudinary upload error:', err);
    return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 });
  }

  const fileType = file.type.startsWith('image/') ? 'image' : 'document';

  const evidence = await prisma.disputeEvidence.create({
    data: {
      dispute_id:  dispute.id,
      uploaded_by: session.user.id,
      name:        file.name,
      url:         uploadResult.url,
      public_id:   uploadResult.publicId,
      file_size:   file.size,
      mime_type:   file.type,
      file_type:   fileType,
    },
  });

  // Record case event
  await prisma.caseEvent.create({
    data: {
      case_id:    params.id,
      actor_id:   session.user.id,
      event_type: 'dispute_evidence_uploaded',
      title:      'Evidence uploaded for dispute',
      description: `File: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
    },
  });

  // Never return the raw URL — client must use /api/files/url to download
  const { url: _url, ...safeEvidence } = evidence;
  return NextResponse.json({ evidence: safeEvidence }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'admin';

  const where: any = { id: params.id };
  if (!isAdmin) {
    where.OR = [{ client_id: session.user.id }, { lawyer_id: session.user.id }];
  }

  const caseRow = await prisma.case.findFirst({
    where,
    select: { id: true, dispute: { select: { id: true } } },
  });
  if (!caseRow?.dispute) {
    return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  }

  const evidence = await prisma.disputeEvidence.findMany({
    where: { dispute_id: caseRow.dispute.id },
    orderBy: { created_at: 'asc' },
    select: {
      id:          true,
      name:        true,
      file_type:   true,
      file_size:   true,
      mime_type:   true,
      created_at:  true,
      // public_id and url intentionally omitted — use /api/files/url to get signed URL
      uploader: { select: { full_name: true, role: true } },
    },
  });

  return NextResponse.json({ evidence });
}
