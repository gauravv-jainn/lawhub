import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import RatingStars from '@/components/shared/RatingStars';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatRelativeTime } from '@/lib/utils/formatDate';

export default async function ClientProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const briefs = await prisma.brief.findMany({
    where: { client_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      bids: {
        include: {
          lawyer: {
            select: {
              full_name: true,
              lawyer_profile: {
                select: {
                  avg_rating: true,
                  review_count: true,
                  total_cases: true,
                  wins: true,
                  primary_court: true,
                  experience_years: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const allBriefs = (briefs ?? []) as any[];
  const briefsWithBids = allBriefs.filter(b => b.bids?.length > 0);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          All Proposals
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {briefsWithBids.reduce((s: number, b: any) => s + b.bids.length, 0)} total proposals across {briefsWithBids.length} brief{briefsWithBids.length !== 1 ? 's' : ''}
        </p>
      </div>

      {briefsWithBids.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', color: 'var(--ink)', marginBottom: '8px' }}>No proposals yet</h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', marginBottom: '20px' }}>
            Post a brief to start receiving proposals from verified advocates.
          </p>
          <Link href="/client/briefs/new" style={{ color: 'var(--gold)', fontSize: '14px', fontWeight: 500 }}>
            Post a Brief →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {briefsWithBids.map((brief: any) => (
            <div key={brief.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
                    {brief.title}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>
                    {brief.bids.length} proposal{brief.bids.length !== 1 ? 's' : ''} · {brief.category}
                  </div>
                </div>
                <Link href={`/client/briefs/${brief.id}`} style={{ fontSize: '12px', color: 'var(--gold)' }}>
                  View brief →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {brief.bids.map((bid: any) => {
                  const lawyerName = bid.lawyer?.full_name ?? 'Unknown';
                  const initials = lawyerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={bid.id} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: '2px' }}>{lawyerName}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)' }}>{bid.lawyer?.lawyer_profile?.primary_court} · {bid.lawyer?.lawyer_profile?.experience_years} yrs</div>
                            <RatingStars rating={bid.lawyer?.lawyer_profile?.avg_rating ?? 0} count={bid.lawyer?.lawyer_profile?.review_count} />
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(bid.proposed_fee)}</div>
                            <StatusBadge status={bid.status} />
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginTop: '6px' }}>
                          {formatRelativeTime(bid.created_at.toISOString())} · {bid.fee_structure} fee
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
