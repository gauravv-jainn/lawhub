import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EnterpriseDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [profile, recentBriefs, activeCases, pendingProposals, totalPayments] = await Promise.all([
    prisma.enterpriseProfile.findUnique({ where: { id: userId } }),
    prisma.brief.findMany({
      where: { client_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { _count: { select: { proposals: true } } },
    }),
    prisma.case.count({
      where: { client_id: userId, status: { in: ['active', 'completion_requested'] } },
    }),
    prisma.proposal.count({
      where: { brief: { client_id: userId }, status: 'pending' },
    }),
    prisma.payment.aggregate({
      where: { client_id: userId, status: 'released' },
      _sum: { amount: true },
    }),
  ]);

  const openBriefs = recentBriefs.filter(b => b.status === 'open').length;
  const totalSpent = Math.round((totalPayments._sum.amount ?? 0) / 100);

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    open:    { bg: 'rgba(13,115,119,0.1)',  text: 'var(--teal)' },
    closed:  { bg: 'rgba(14,12,10,0.06)',   text: 'rgba(14,12,10,0.4)' },
    awarded: { bg: 'rgba(26,107,58,0.1)',   text: '#1A6B3A' },
    expired: { bg: 'rgba(192,57,43,0.08)', text: 'var(--rust)' },
  };

  const URGENCY_COLOR: Record<string, string> = {
    emergency: 'var(--rust)',
    urgent:    'var(--gold)',
    standard:  'var(--teal)',
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)' }}>
                {profile?.firm_name ?? 'Firm Overview'}
              </h1>
              {profile?.verification_status === 'verified' && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(26,107,58,0.1)', color: '#1A6B3A' }}>
                  ✓ Verified
                </span>
              )}
              {profile?.verification_status === 'pending' && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,160,23,0.1)', color: 'var(--gold)' }}>
                  ⏳ Under Review
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
              {profile?.city}{profile?.city && profile?.state ? ', ' : ''}{profile?.state}
              {profile?.firm_type && (
                <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                  · {profile.firm_type.replace('_', ' ')}
                </span>
              )}
            </p>
          </div>
          <Link href="/client/briefs/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            + Post a Brief
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="dash-stats-3">
        {[
          { label: 'Open Briefs',        value: openBriefs,   icon: '📄', color: 'rgba(52,73,94,0.08)',    href: '/client/briefs' },
          { label: 'Pending Proposals',  value: pendingProposals, icon: '⚖️', color: 'rgba(184,134,11,0.08)', href: '/client/briefs' },
          { label: 'Active Cases',       value: activeCases,  icon: '📁', color: 'rgba(13,115,119,0.08)',   href: '/client/cases' },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginTop: '4px' }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-grid-2">

        {/* Recent Briefs */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              Recent Briefs
            </h2>
            <Link href="/client/briefs" style={{ fontSize: '12px', color: 'var(--gold)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {recentBriefs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(14,12,10,0.35)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              No briefs posted yet.{' '}
              <Link href="/client/briefs/new" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Post your first →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentBriefs.map(b => {
                const sc = STATUS_COLOR[b.status] ?? STATUS_COLOR.open;
                const borderColor = URGENCY_COLOR[b.urgency ?? 'standard'] ?? 'var(--teal)';
                return (
                  <Link key={b.id} href={`/client/briefs/${b.id}`}
                    style={{ display: 'block', padding: '12px', borderRadius: '8px', background: 'var(--cream)', textDecoration: 'none', borderLeft: `3px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>
                          {b.category} · {b._count.proposals} proposal{b._count.proposals !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, marginLeft: '8px', flexShrink: 0, textTransform: 'capitalize' }}>
                        {b.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions + Financials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick Actions */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { href: '/client/briefs/new', icon: '✏️', label: 'Post a brief',     desc: 'Describe your legal matter' },
                { href: '/client/briefs',     icon: '📄', label: 'My briefs',        desc: 'Review proposals received' },
                { href: '/client/cases',      icon: '📁', label: 'Active cases',     desc: 'Track ongoing legal matters' },
                { href: '/client/payments',   icon: '💳', label: 'Payments',         desc: 'Milestones and escrow status' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'var(--cream)', textDecoration: 'none' }}>
                  <span style={{ fontSize: '18px' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{a.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          {totalSpent > 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
                Financials
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', background: 'var(--cream)' }}>
                <span style={{ fontSize: '13px', color: 'rgba(14,12,10,0.5)' }}>Total Legal Spend</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
                  ₹{totalSpent.toLocaleString('en-IN')}
                </span>
              </div>
              <Link href="/client/payments"
                style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--gold)', textDecoration: 'none' }}>
                View payment history →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
