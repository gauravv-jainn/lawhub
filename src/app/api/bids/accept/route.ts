// Deprecated: use /api/proposals/accept instead
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/proposals/accept', req.url), { status: 307 });
}
