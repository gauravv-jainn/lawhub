// Deprecated: use /api/proposals instead
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Forward to new proposals endpoint
  const body = await req.text();
  return NextResponse.redirect(new URL('/api/proposals', req.url), { status: 307 });
}
