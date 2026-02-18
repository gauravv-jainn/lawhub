import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { StubConnector } from '@/lib/sync/connectors';

export async function POST(req: NextRequest) {
  const csv = await req.text();
  const lines = csv.trim().split('\n').slice(1).map((line) => {
    const [caseNumber, nextHearingAt, status] = line.split(',');
    return { caseNumber, nextHearingAt, status };
  });
  for (const row of lines) {
    await prisma.matter.updateMany({ where: { caseNumber: row.caseNumber }, data: { nextHearingAt: row.nextHearingAt ? new Date(row.nextHearingAt) : null, status: (row.status as any) ?? undefined } });
  }
  const connector = new StubConnector();
  const stub = await connector.sync(lines);
  return NextResponse.json({ imported: lines.length, connector: stub, mode: 'CSV import + stub connector' });
}
