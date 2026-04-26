import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatRelativeTime } from '@/lib/utils/formatDate';

export default async function ClientDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [briefs, cases, payments] = await Promise.all([
    prisma.brief.findMany({
      where: { client_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { _count: { select: { bids: true } } },
    }),
    prisma.case.findMany({
      where: { client_id: userId, status: 'active' },
      take: 3,
      include: {
        lawyer: { select: { full_name: true } },
        brief: { select: { title: true } },
      },
    }),
    prisma.payment.findMany({
      where: { client_id: userId },
      select: { amount: true, status: true },
    }),
  ]);

  const activeBriefs = briefs.filter(b => b.status === 'open').length;
  const totalProposals = briefs.reduce((sum, b) => sum + (b._count?.bids ?? 0), 0);
  const totalSpent = payments.filter(p => p.status === 'released').reduce((sum, p) => sum + p.amount, 0);

  const brifsWithProposals = briefs.filter(b => (b._count?.bids ?? 0) > 0 && b.status === 'open');

  return (
    <div className="page-container">
      {/* Page header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
            Overview of your legal matters and proposals
          </p>
        </div>
        <Link href="/client/briefs/new" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--gold)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          Post New Brief
        </Link>
      </div>

      {/* Alert: new proposals */}
      {brifsWithProposals.length > 0 && (
        <div style={{
          background: 'rgba(184,134,11,0.08)',
          border: '1px solid rgba(184,134,11,0.25)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.7)' }}>
            You have{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {brifsWithProposals.reduce((s, b) => s + (b._count?.bids ?? 0), 0)} new proposal{brifsWithProposals.reduce((s, b) => s + (b._count?.bids ?? 0), 0) !== 1 ? 's' : ''}
            </strong>{' '}
            waiting for review.{' '}
            <Link href="/client/proposals" style={{ color: 'var(--gold)', fontWeight: 500 }}>View all →</Link>
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="dash-stats-4">
        {[
          { label: 'Active Briefs', value: activeBriefs, icon: '📄', color: 'var(--teal)' },
          { label: 'Proposals Received', value: totalProposals, icon: '💬', color: 'var(--gold)' },
          { label: 'Active Cases', value: cases.length, icon: '⚖️', color: '#1A6B3A' },
          { label: 'Total Spent', value: formatCurrency(totalSpent), icon: '₹', color: 'var(--ink)' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'white',
            border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '28px',
              fontWeight: 700,
              color: stat.color,
              lineHeight: 1,
              marginBottom: '4px',
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid-2">
        {/* Active Briefs */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              My Briefs
            </h2>
            <Link href="/client/briefs" style={{ fontSize: '12px', color: 'var(--gold)' }}>View all →</Link>
          </div>

          {briefs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No briefs posted yet.</p>
              <Link href="/client/briefs/new" style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 500 }}>
                Post your first brief →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {briefs.slice(0, 3).map(brief => (
                <Link key={brief.id} href={`/client/briefs/${brief.id}`}
                  className="brief-card-link"
                  style={{
                    display: 'block',
                    padding: '14px',
                    border: '1px solid rgba(14,12,10,0.08)',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px', fontFamily: "'Cormorant Garamond', serif" }}>
                        {brief.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                        {brief.category} · {formatRelativeTime(brief.created_at.toISOString())}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <StatusBadge status={brief.status} />
                      {(brief._count?.bids ?? 0) > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 500 }}>
                          {brief._count?.bids} proposal{(brief._count?.bids ?? 0) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Cases */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              Active Cases
            </h2>
            <Link href="/client/cases" style={{ fontSize: '12px', color: 'var(--gold)' }}>View all →</Link>
          </div>

          {cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚖️</div>
              <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No active cases yet.</p>
              <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.3)' }}>Cases appear after you accept a proposal.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cases.map((c: any) => (
                <Link key={c.id} href={`/client/cases/${c.id}`}
                  style={{
                    display: 'block',
                    padding: '14px',
                    border: '1px solid rgba(14,12,10,0.08)',
                    borderRadius: '10px',
                    textDecoration: 'none',
                  }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px', fontFamily: "'Cormorant Garamond', serif" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                    Advocate: {c.lawyer?.full_name ?? 'Unknown'}
                  </div>
                  {c.next_hearing_date && (
                    <div style={{ fontSize: '11px', color: 'var(--teal)', marginTop: '4px' }}>
                      Next hearing: {c.next_hearing_date}
                    </div>
                  )}
                  {/* Milestone progress */}
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1, height: '4px', background: 'rgba(14,12,10,0.08)', borderRadius: '2px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(c.current_milestone / Math.max(c.milestone_count, 1)) * 100}%`,
                        background: 'var(--teal)',
                        borderRadius: '2px',
                      }} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', flexShrink: 0 }}>
                      Milestone {c.current_milestone}/{c.milestone_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/client/find-lawyers" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          border: '1px solid rgba(14,12,10,0.12)',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '13px',
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          🔍 Find an Advocate
        </Link>
        <Link href="/client/payments" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          border: '1px solid rgba(14,12,10,0.12)',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '13px',
          color: 'var(--ink)',
          fontWeight: 500,
        }}>
          💳 Payment History
        </Link>
      </div>

    </div>
  );
}
