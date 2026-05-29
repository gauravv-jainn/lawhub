import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import LawyerOnboarding from '@/components/shared/LawyerOnboarding';

export default async function LawyerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [lawyerProfile, bids, cases, payments, briefs] = await Promise.all([
    prisma.lawyerProfile.findUnique({ where: { id: userId } }),
    prisma.proposal.findMany({ where: { lawyer_id: userId }, select: { status: true } }),
    prisma.case.findMany({
      where: { lawyer_id: userId, status: 'active' },
      take: 5,
      include: {
        brief: { select: { title: true, category: true, court: true } },
        client: { select: { full_name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { lawyer_id: userId },
      select: { amount: true, status: true },
    }),
    prisma.brief.findMany({
      where: { status: 'open' },
      take: 3,
      include: { _count: { select: { proposals: true } } },
    }),
  ]);

  const profile = lawyerProfile;
  const openBids = bids.filter(b => b.status === 'pending').length;
  const totalEarned = payments.filter(p => p.status === 'released').reduce((s, p) => s + p.amount, 0);
  const inEscrow = payments.filter(p => p.status === 'held').reduce((s, p) => s + p.amount, 0);
  const avgRating = profile?.avg_rating ? profile.avg_rating.toFixed(1) : '—';

  const isPending  = profile?.verification_status === 'pending';
  const isVerified = profile?.verification_status === 'verified';
  const isRejected = profile?.verification_status === 'rejected';

  // Onboarding state
  const hasProposals = bids.length > 0;
  const hasCasesEver = cases.length > 0;

  return (
    <div className="page-container">
      {/* Verification warning */}
      {isPending && (
        <div style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>⏳</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Verification Pending</div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)' }}>
              Your account is under review. You&apos;ll be notified within 24 hours. You can browse briefs once verified.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            Advocate Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
            Your practice overview and performance
          </p>
        </div>
        {isVerified && (
          <Link href="/lawyer/briefs" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Browse Briefs →
          </Link>
        )}
      </div>

      {/* Onboarding checklist */}
      <LawyerOnboarding
        verificationStatus={profile?.verification_status as 'pending' | 'verified' | 'rejected' ?? 'pending'}
        hasProposals={hasProposals}
        hasCases={hasCasesEver}
      />

      {/* Stats */}
      <div className="dash-stats-4">
        {[
          { label: 'Earnings (FY)', value: formatCurrency(totalEarned), color: '#1A6B3A', icon: '₹' },
          { label: 'Active Cases', value: cases.length, color: 'var(--teal)', icon: '⚖️' },
          { label: 'Avg. Rating', value: avgRating === '—' ? '—' : `${avgRating} ★`, color: 'var(--gold)', icon: '⭐' },
          { label: 'Open Proposals', value: openBids, color: 'var(--ink)', icon: '📋' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid-2">
        {/* Matching briefs */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              New Matching Briefs
            </h2>
            <Link href="/lawyer/briefs" style={{ fontSize: '12px', color: 'var(--gold)' }}>View all →</Link>
          </div>

          {!isVerified ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>
              Complete verification to access briefs
            </div>
          ) : briefs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>
              No open briefs at the moment. Check back soon.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {briefs.map((brief: any) => (
                <Link key={brief.id} href={`/lawyer/briefs`}
                  style={{
                    display: 'block', padding: '14px', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '10px', textDecoration: 'none',
                    borderLeft: `3px solid ${brief.urgency === 'emergency' ? 'var(--rust)' : brief.urgency === 'urgent' ? '#9a710a' : 'rgba(14,12,10,0.08)'}`,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', fontFamily: "'Cormorant Garamond', serif", marginBottom: '2px' }}>
                        {brief.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                        {brief.category} · {(brief as any)._count?.proposals ?? 0} proposal{((brief as any)._count?.proposals ?? 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                      {formatCurrency(brief.budget_min)}–{formatCurrency(brief.budget_max)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active cases */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              Active Cases
            </h2>
            <Link href="/lawyer/cases" style={{ fontSize: '12px', color: 'var(--gold)' }}>View all →</Link>
          </div>

          {cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>
              No active cases yet. Submit proposals to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cases.map((c: any) => (
                <Link key={c.id} href={`/lawyer/cases/${c.id}`}
                  style={{ display: 'block', padding: '14px', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '10px', textDecoration: 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', fontFamily: "'Cormorant Garamond', serif", marginBottom: '4px' }}>{c.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                    Client: {c.client?.full_name} · {c.brief?.court}
                  </div>
                  {c.next_hearing_date && (
                    <div style={{ fontSize: '11px', color: 'var(--teal)', marginTop: '4px', fontWeight: 500 }}>
                      Next hearing: {c.next_hearing_date}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Earnings summary */}
      {inEscrow > 0 && (
        <div style={{ marginTop: '24px', padding: '20px 24px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>In Escrow</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 700, color: '#9a710a' }}>{formatCurrency(inEscrow)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>Net Received (10% fee deducted)</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 700, color: '#1A6B3A' }}>{formatCurrency(totalEarned * 0.9)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/lawyer/earnings" style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 500 }}>
              View Earnings Dashboard →
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
