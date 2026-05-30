/**
 * GET /api/cron/expire-briefs
 *
 * Run daily via Vercel Cron Jobs.
 * Finds all open briefs whose expires_at has passed and marks them as "expired".
 * Notifies the client so they can repost if needed.
 *
 * vercel.json:
 * { "crons": [{ "path": "/api/cron/expire-briefs", "schedule": "0 2 * * *" }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Cron not configured.' }, { status: 503 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = new Date();

  const expiredBriefs = await prisma.brief.findMany({
    where: {
      status:     'open',
      expires_at: { lte: now },
    },
    select: {
      id:        true,
      title:     true,
      client_id: true,
    },
    take: 200,
  });

  if (expiredBriefs.length === 0) {
    return NextResponse.json({ ok: true, expired: 0, message: 'No briefs to expire.' });
  }

  const ids = expiredBriefs.map(b => b.id);

  await prisma.brief.updateMany({
    where: { id: { in: ids } },
    data:  { status: 'expired', updated_at: now },
  });

  // Notify each client
  for (const brief of expiredBriefs) {
    await notify({
      userId: brief.client_id,
      type:   'brief_expired',
      title:  'Brief Expired',
      body:   `"${brief.title}" has expired and is no longer visible to advocates. You can reopen it from your briefs page.`,
      link:   `/client/briefs`,
      sendEmail: false,
    });
  }

  console.log(`[cron/expire-briefs] Expired ${expiredBriefs.length} briefs`);

  return NextResponse.json({ ok: true, expired: expiredBriefs.length });
}
