import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deleteFileServer } from '@/lib/cloudinary-server';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { documentId } = await req.json() as { documentId?: string };
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

    // Fetch doc and verify ownership before touching Cloudinary
    const doc = await prisma.briefDocument.findFirst({
      where: { id: documentId },
      include: { brief: { select: { client_id: true } } },
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const isOwner = doc.brief.client_id === session.user.id;
    const isAdmin = session.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/<cloud>/<type>/upload/v<ver>/<folder>/<filename>
    const match = doc.url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) {
      return NextResponse.json({ error: 'Cannot parse document URL' }, { status: 400 });
    }
    const publicId = match[1];

    // Delete from Cloudinary then remove DB record atomically
    await deleteFileServer(publicId);
    await prisma.briefDocument.delete({ where: { id: documentId } });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[DELETE /api/files/delete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
