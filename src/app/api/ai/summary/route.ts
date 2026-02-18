import { NextRequest, NextResponse } from 'next/server';
import { generateCaseSummary } from '@/lib/ai/client';

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  const data = await generateCaseSummary(input);
  return NextResponse.json({ ...data, disclaimer: 'AI output is a drafting aid. Review and verify before use.' });
}
