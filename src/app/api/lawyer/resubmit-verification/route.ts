/**
 * POST /api/lawyer/resubmit-verification
 *
 * Rejected lawyers re-upload their documents and request re-review.
 * Accepts new document URLs (already uploaded to Cloudinary by the client)
 * and a note describing the changes made.
 *
 * Transitions verification_status: rejected → pending
 * Notifies admin(s) via notification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const resubmitSchema = z.object({
  bci_doc_url:    z.string().url().optional().nullable(),
  aadhaar_doc_url: z.string().url().optional().nullable(),
  degree_doc_url: z.string().url().optional().nullable(),
  note:           z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') {
    return NextResponse.json({ error: 'Only lawyers may use this endpoint.' }, { status: 403 });
  }

  const profile = await prisma.lawyerProfile.findUnique({
    where:  { id: session.user.id },
    select: { id: true, verification_status: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Lawyer profile not found.' }, { status: 404 });
  }

  if (profile.verification_status !== 'rejected') {
    return NextResponse.json(
      { error: 'Only rejected applications can be resubmitted.' },
      { status: 400 }
    );
  }

  const body   = await req.json();
  const parsed = resubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { bci_doc_url, aadhaar_doc_url, degree_doc_url, note } = parsed.data;

  // At least one document must be provided or updated
  if (!bci_doc_url && !aadhaar_doc_url && !degree_doc_url) {
    return NextResponse.json(
      { error: 'Please upload at least one updated document.' },
      { status: 400 }
    );
  }

  // Update profile: set status to pending + update provided doc URLs + clear rejection reason
  await prisma.lawyerProfile.update({
    where: { id: session.user.id },
    data:  {
      verification_status: 'pending',
      rejection_reason:    null,
      resubmission_note:   note?.trim() || null,
      ...(bci_doc_url     ? { bci_doc_url }     : {}),
      ...(aadhaar_doc_url ? { aadhaar_doc_url } : {}),
      ...(degree_doc_url  ? { degree_doc_url }  : {}),
    },
  });

  // Notify all admins — find admin users and notify each
  const admins = await prisma.user.findMany({
    where:  { role: 'admin' },
    select: { id: true },
  });

  await Promise.allSettled(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          user_id: admin.id,
          type:    'lawyer_resubmitted',
          title:   'Lawyer Resubmitted Verification',
          body:    `A rejected lawyer has resubmitted their verification documents for re-review.${note ? ` Note: ${note}` : ''}`,
          link:    `/admin/lawyers`,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
