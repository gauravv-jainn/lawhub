import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { matterSchema } from '@/lib/validation/schemas';
import { logAudit } from '@/lib/audit';

export async function GET() { return NextResponse.json(await prisma.matter.findMany()); }
export async function POST(req: NextRequest) {
  const parsed = matterSchema.parse(await req.json());
  const firm = await prisma.firm.findFirst();
  const matter = await prisma.matter.create({ data: { ...parsed, firmId: firm!.id } });
  const user = await prisma.user.findFirst();
  if (user) await logAudit({ firmId: firm!.id, userId: user.id, action: 'CREATE', entityType: 'Matter', entityId: matter.id });
  return NextResponse.json(matter);
}
