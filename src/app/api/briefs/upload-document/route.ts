import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadFileServer } from '@/lib/cloudinary-server';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const briefId = formData.get('briefId') as string | null;

    if (!file || !briefId) {
      return NextResponse.json({ error: 'Missing file or briefId' }, { status: 400 });
    }

    // Verify the brief belongs to the requesting client
    const brief = await prisma.brief.findFirst({
      where: { id: briefId, client_id: session.user.id },
    });
    if (!brief) {
      return NextResponse.json({ error: 'Brief not found or access denied' }, { status: 404 });
    }

    // Size check: 10MB max
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `briefs/${briefId}/${Date.now()}_${sanitizedName}`;

    const { url } = await uploadFileServer(buffer, publicId, 'lawhub/briefs');

    // Save to DB
    const doc = await prisma.briefDocument.create({
      data: {
        brief_id: briefId,
        name: file.name,
        url,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err: any) {
    console.error('Document upload error:', err);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
