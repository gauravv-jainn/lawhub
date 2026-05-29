/**
 * POST /api/upload
 * General-purpose file upload endpoint for message attachments and milestone files.
 * Accepts multipart/form-data with a `file` field and optional `folder` field.
 * Returns { url, publicId, name }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadFileServer } from '@/lib/cloudinary-server';
export const dynamic = 'force-dynamic';

// 10 MB limit
const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const folder   = (formData.get('folder') as string | null)?.slice(0, 100) ?? 'lawhub/uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed.' }, { status: 400 });
    }

    const buffer   = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { url, publicId } = await uploadFileServer(buffer, safeName, folder);

    return NextResponse.json({ url, publicId, name: file.name });
  } catch (err) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
