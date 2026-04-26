import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';

export default async function LawyerBidsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const bids = await prisma.bid.findMany({
    where: { lawyer_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      brief: {
        select: { title: true, category: true, court: true, budget_min: true, budget_max: true, client_id: true, _count: { select: { bids: true } } },
      },
    },
  });

  const allBids = bids ?? [];
  const pending = allBids.filter(b => b.status === 'pending');
  const won = allBids.filter(b => b.status === 'accepted');
  const lost = allBids.filter(b => b.status === 'rejected');
  const withdrawn = allBids.filter(b => b.status === 'withdrawn');

  function BidCard({ bid }: { bid: typeof allBids[0] }) {
    const brief = (bid as any).brief;
    return (
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                {brief?.category}
              </span>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
              {brief?.title}
            </h3>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>⚖️ {brief?.court}</span>
              <span>Budget: {formatCurrency(brief?.budget_min ?? 0)} – {formatCurrency(brief?.budget_max ?? 0)}</span>
              <span>{brief?._count?.bids ?? 0} total bids</span>
              <span>Submitted {formatDate(bid.created_at.toISOString())}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <StatusBadge status={bid.status} size="md" />
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatCurrency(bid.proposed_fee)}
            </div>
            {bid.status === 'accepted' && (
              <Link href="/lawyer/cases" style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 500 }}>
                Open Case →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Bids
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {pending.length} pending · {won.length} won · {lost.length} not selected
        </p>
      </div>

      {allBids.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No bids submitted yet.</p>
          <Link href="/lawyer/briefs" style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 500 }}>Browse Briefs →</Link>
        </div>
      ) : (
        <div>
          {[
            { label: 'Pending', items: pending, color: 'var(--gold)' },
            { label: 'Won', items: won, color: '#1A6B3A' },
            { label: 'Not Selected', items: lost, color: 'var(--rust)' },
            { label: 'Withdrawn', items: withdrawn, color: 'rgba(14,12,10,0.4)' },
          ].map(({ label, items, color }) =>
            items.length > 0 ? (
              <div key={label} style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color, marginBottom: '14px' }}>
                  {label} ({items.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map(bid => <BidCard key={bid.id} bid={bid} />)}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
