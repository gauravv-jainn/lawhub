import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// GET /api/cases/[id]/messages — fetch all messages for a case
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const caseId = params.id;

    // Must be the client or lawyer on this case
    const caseRow = await prisma.case.findFirst({
      where: {
        id: caseId,
        OR: [{ client_id: userId }, { lawyer_id: userId }],
      },
      select: { id: true },
    });
    if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: { case_id: caseId },
      orderBy: { created_at: 'asc' },
      include: {
        sender: { select: { id: true, full_name: true, role: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_role: m.sender.role,
        content: m.content,
        created_at: m.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/cases/[id]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cases/[id]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const senderRole = session.user.role;
    const caseId = params.id;

    // Must be the client or lawyer on this case
    const caseRow = await prisma.case.findFirst({
      where: {
        id: caseId,
        OR: [{ client_id: userId }, { lawyer_id: userId }],
      },
      select: { id: true, client_id: true, lawyer_id: true, title: true },
    });
    if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const message = await prisma.message.create({
      data: {
        case_id: caseId,
        sender_id: userId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, full_name: true, role: true } },
      },
    });

    // Notify the other party — use session role, never client-supplied role
    const recipientId = userId === caseRow.client_id ? caseRow.lawyer_id : caseRow.client_id;
    await prisma.notification.create({
      data: {
        user_id: recipientId,
        type: 'new_message',
        title: 'New Message',
        body: `New message in case: ${caseRow.title}`,
        link: senderRole === 'client'
          ? `/lawyer/cases/${caseId}`
          : `/client/cases/${caseId}`,
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        sender_id: message.sender_id,
        sender_role: message.sender.role,
        content: message.content,
        created_at: message.created_at.toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/cases/[id]/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
