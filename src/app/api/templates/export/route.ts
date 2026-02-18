import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { content, title } = await req.json();
  const blob = Buffer.from(`DOCX_PLACEHOLDER\n${title}\n${content}`);
  return new NextResponse(blob, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${title || 'draft'}.docx"` } });
}
