import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BriefBrowser from './BriefBrowser';

export default async function LawyerBriefsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [lawyerProfile, lawyerUser] = await Promise.all([
    prisma.lawyerProfile.findUnique({
      where: { id: userId },
      select: { verification_status: true, practice_areas: true, id: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    }),
  ]);

  if (lawyerProfile?.verification_status !== 'verified') {
    return (
      <div style={{ padding: '32px', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Browse Briefs
        </h1>
        <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: 'var(--ink)', marginBottom: '8px' }}>
            Verification Pending
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.65 }}>
            Your account is under review by our verification team. Once approved, you&apos;ll have full access to all client briefs. This usually takes 24 hours.
          </p>
        </div>
      </div>
    );
  }

  const [briefs, myBids] = await Promise.all([
    prisma.brief.findMany({
      where: { status: 'open' },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { bids: true } },
        client: { select: { full_name: true } },
      },
    }),
    prisma.bid.findMany({
      where: { lawyer_id: userId },
      select: { brief_id: true },
    }),
  ]);

  const biddedBriefIds = new Set((myBids ?? []).map((b: any) => b.brief_id));

  // Map _count.bids → bid_count, and include client_name for AI drafting
  const briefsWithCount = (briefs ?? []).map((b: any) => ({
    ...b,
    bid_count: b._count?.bids ?? 0,
    client_name: b.client?.full_name ?? null,
  }));

  return (
    <BriefBrowser
      briefs={briefsWithCount}
      biddedBriefIds={biddedBriefIds}
      lawyerId={userId}
      lawyerName={lawyerUser?.full_name ?? ''}
    />
  );
}
