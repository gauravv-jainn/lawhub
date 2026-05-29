/**
 * GET /api/files/url?id=...&type=milestone_attachment|dispute_evidence
 *
 * Returns a time-limited signed Cloudinary URL for a file.
 * Enforces access control: user must be a member of the related case/dispute.
 * Admins can access any file.
 *
 * Response: { url, filename, expiresAt, mimeType }
 * Signed URLs expire after 10 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateSignedDownloadUrl } from '@/lib/cloudinary-server';
export const dynamic = 'force-dynamic';

const URL_EXPIRY_SECONDS = 600; // 10 minutes

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id   = searchParams.get('id')?.trim();
  const type = searchParams.get('type')?.trim();

  if (!id || !type) {
    return NextResponse.json({ error: 'id and type are required.' }, { status: 400 });
  }

  if (!['milestone_attachment', 'dispute_evidence'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
  }

  const isAdmin = session.user.role === 'admin';

  // ── Milestone attachment ──────────────────────────────────────────────────
  if (type === 'milestone_attachment') {
    const attachment = await prisma.milestoneAttachment.findUnique({
      where: { id },
      include: {
        milestone: {
          select: {
            case_id: true,
            case: { select: { client_id: true, lawyer_id: true } },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    // Access control: must be a member of the case or admin
    const { client_id, lawyer_id } = attachment.milestone.case;
    if (!isAdmin && session.user.id !== client_id && session.user.id !== lawyer_id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // If we have a public_id, generate a signed URL; otherwise fall back to stored URL
    const url = attachment.public_id
      ? generateSignedDownloadUrl(attachment.public_id, URL_EXPIRY_SECONDS)
      : attachment.url;

    return NextResponse.json({
      url,
      filename:  attachment.name,
      mimeType:  attachment.mime_type ?? null,
      fileSize:  attachment.file_size ?? null,
      expiresAt: attachment.public_id
        ? new Date(Date.now() + URL_EXPIRY_SECONDS * 1000).toISOString()
        : null,
    });
  }

  // ── Dispute evidence ─────────────────────────────────────────────────────
  if (type === 'dispute_evidence') {
    const evidence = await prisma.disputeEvidence.findUnique({
      where: { id },
      include: {
        dispute: {
          select: {
            case_id: true,
            case: { select: { client_id: true, lawyer_id: true } },
          },
        },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const { client_id, lawyer_id } = evidence.dispute.case;
    if (!isAdmin && session.user.id !== client_id && session.user.id !== lawyer_id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const url = evidence.public_id
      ? generateSignedDownloadUrl(evidence.public_id, URL_EXPIRY_SECONDS)
      : evidence.url;

    return NextResponse.json({
      url,
      filename:  evidence.name,
      mimeType:  evidence.mime_type ?? null,
      fileSize:  evidence.file_size ?? null,
      expiresAt: evidence.public_id
        ? new Date(Date.now() + URL_EXPIRY_SECONDS * 1000).toISOString()
        : null,
    });
  }

  return NextResponse.json({ error: 'Unknown type.' }, { status: 400 });
}
