import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// GET /api/cases/[id]/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const caseRow = await prisma.case.findFirst({
      where: { id: params.id, OR: [{ client_id: session.user.id }, { lawyer_id: session.user.id }] },
      select: { id: true },
    });
    if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
      include: { sender: { select: { id: true, full_name: true, role: true } } },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id:         m.id,
        sender_id:  m.sender_id,
        sender:     { full_name: m.sender.full_name, role: m.sender.role },
        content:    m.content,
        file_url:   (m as any).file_url  ?? null,
        file_name:  (m as any).file_name ?? null,
        created_at: m.created_at.toISOString(),
        read_at:    null,
      })),
    });
  } catch (err) {
    console.error('[GET /api/cases/[id]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cases/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId    = session.user.id;
    const senderRole = session.user.role;

    const caseRow = await prisma.case.findFirst({
      where: { id: params.id, OR: [{ client_id: userId }, { lawyer_id: userId }] },
      select: { id: true, client_id: true, lawyer_id: true, title: true },
    });
    if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const content   = typeof body.content  === 'string' ? body.content.trim() : '';
    const file_url  = typeof body.file_url  === 'string' ? body.file_url.trim()  : null;
    const file_name = typeof body.file_name === 'string' ? body.file_name.trim() : null;

    if (!content && !file_url) {
      return NextResponse.json({ error: 'content or file required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        case_id:   params.id,
        sender_id: userId,
        content:   content || (file_name ?? ''),
        // These fields were added in the consolidation migration:
        ...(file_url  ? { file_url }  : {}),
        ...(file_name ? { file_name } : {}),
      } as any,
      include: { sender: { select: { id: true, full_name: true, role: true } } },
    });

    // Notify the other party
    const recipientId = userId === caseRow.client_id ? caseRow.lawyer_id : caseRow.client_id;
    await prisma.notification.create({
      data: {
        user_id: recipientId,
        type:    'new_message',
        title:   'New Message',
        body:    `New message in case: ${caseRow.title}`,
        link:    senderRole === 'client'
          ? `/lawyer/cases/${params.id}`
          : `/client/cases/${params.id}`,
      },
    });

    return NextResponse.json({
      message: {
        id:         message.id,
        sender_id:  message.sender_id,
        sender:     { full_name: message.sender.full_name, role: message.sender.role },
        content:    message.content,
        file_url:   (message as any).file_url  ?? null,
        file_name:  (message as any).file_name ?? null,
        created_at: message.created_at.toISOString(),
        read_at:    null,
      },
    });
  } catch (err) {
    console.error('[POST /api/cases/[id]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
