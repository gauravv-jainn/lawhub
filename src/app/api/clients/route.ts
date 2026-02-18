import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { clientSchema } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/audit';

export async function GET() { const data = await prisma.client.findMany(); return NextResponse.json(data); }
export async function POST(req: NextRequest) {
  const parsed = clientSchema.parse(await req.json());
  const firm = await prisma.firm.findFirst();
  const client = await prisma.client.create({ data: { ...parsed, email: parsed.email || null, firmId: firm!.id } });
  const user = await prisma.user.findFirst();
  if (user) await logAudit({ firmId: firm!.id, userId: user.id, action: 'CREATE', entityType: 'Client', entityId: client.id });
  return NextResponse.json(client);
}
