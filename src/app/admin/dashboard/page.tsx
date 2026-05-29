import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const oneDayAgo = new Date(Date.now() - 86_400_000);

  const [
    totalClients,
    verifiedLawyers,
    pendingLawyers,
    openBriefs,
    proposalsToday,
    openDisputes,
    revenueResult,
    gmvResult,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'client' } }),
    prisma.lawyerProfile.count({ where: { verification_status: 'verified' } }),
    prisma.lawyerProfile.count({ where: { verification_status: 'pending' } }),
    prisma.brief.count({ where: { status: 'open' } }),
    prisma.proposal.count({ where: { created_at: { gte: oneDayAgo } } }),
    prisma.dispute.count({ where: { status: { in: ['open', 'under_review'] } } }),
    prisma.payment.aggregate({
      where: { status: 'released' },
      _sum: { platform_fee: true },
    }),
    prisma.payment.aggregate({
      where: { status: { not: 'refunded' } },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.platform_fee ?? 0;
  const gmv          = gmvResult._sum.amount ?? 0;

  const stats = [
    { label: 'Total Clients',    value: totalClients,                                      color: 'var(--teal)' },
    { label: 'Total Lawyers',    value: `${verifiedLawyers} verified / ${pendingLawyers} pending`, color: 'var(--gold)' },
    { label: 'Open Briefs',      value: openBriefs,                                        color: 'var(--ink)' },
    { label: 'Proposals Today',  value: proposalsToday,                                    color: '#5b21b6' },
    { label: 'Platform Revenue', value: formatCurrency(totalRevenue),                      color: '#1A6B3A' },
    { label: 'Total GMV',        value: formatCurrency(gmv),                               color: 'var(--gold)' },
  ];

  return (
    <div className="page-container">
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '32px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '32px',
        }}
      >
        Admin Dashboard
      </h1>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}
        className="stats-grid"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'white',
              border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '26px',
                fontWeight: 700,
                color: stat.color,
                marginBottom: '6px',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Open disputes alert */}
        {openDisputes > 0 && (
          <div
            style={{
              background: 'rgba(192,57,43,0.05)',
              border: '1px solid rgba(192,57,43,0.2)',
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--rust)' }}>
                ⚠ {openDisputes} open dispute{openDisputes !== 1 ? 's' : ''} require attention
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '4px' }}>
                Review and resolve disputes to unfreeze escrow payments
              </div>
            </div>
            <a
              href="/admin/disputes"
              style={{
                background: 'var(--rust)',
                color: 'white',
                padding: '9px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Review Disputes →
            </a>
          </div>
        )}

        {/* Pending lawyer verifications */}
        {pendingLawyers > 0 && (
          <div
            style={{
              background: 'rgba(212,160,23,0.06)',
              border: '1px solid rgba(212,160,23,0.2)',
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                {pendingLawyers} advocate{pendingLawyers !== 1 ? 's' : ''} awaiting verification
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '4px' }}>
                Review their documents and approve or reject their applications
              </div>
            </div>
            <a
              href="/admin/lawyers"
              style={{
                background: 'var(--gold)',
                color: 'white',
                padding: '9px 20px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Review Now →
            </a>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
