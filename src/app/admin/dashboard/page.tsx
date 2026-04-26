import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const oneDayAgo = new Date(Date.now() - 86400000);

  const [profiles, lawyers, briefs, bidsToday, payments] = await Promise.all([
    prisma.user.findMany({ select: { role: true } }),
    prisma.lawyerProfile.findMany({ select: { verification_status: true } }),
    prisma.brief.findMany({ select: { status: true } }),
    prisma.bid.count({ where: { created_at: { gte: oneDayAgo } } }),
    prisma.payment.findMany({ select: { amount: true, platform_fee: true, status: true } }),
  ]);

  const totalClients = profiles.filter(p => p.role === 'client').length;
  const totalLawyers = lawyers.length;
  const verifiedLawyers = lawyers.filter(l => l.verification_status === 'verified').length;
  const pendingLawyers = lawyers.filter(l => l.verification_status === 'pending').length;
  const openBriefs = briefs.filter(b => b.status === 'open').length;
  const totalRevenue = payments.filter(p => p.status === 'released').reduce((s: number, p: any) => s + (p.platform_fee ?? 0), 0);
  const gmv = payments.filter(p => p.status !== 'refunded').reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: 'Total Clients', value: totalClients, color: 'var(--teal)' },
    { label: 'Total Lawyers', value: `${verifiedLawyers} verified / ${pendingLawyers} pending`, color: 'var(--gold)' },
    { label: 'Open Briefs', value: openBriefs, color: 'var(--ink)' },
    { label: 'Bids Today', value: bidsToday, color: '#5b21b6' },
    { label: 'Platform Revenue', value: formatCurrency(totalRevenue), color: '#1A6B3A' },
    { label: 'Total GMV', value: formatCurrency(gmv), color: 'var(--gold)' },
  ];

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        Admin Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }} className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color: stat.color, marginBottom: '6px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {pendingLawyers > 0 && (
        <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
              {pendingLawyers} advocate{pendingLawyers !== 1 ? 's' : ''} awaiting verification
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '4px' }}>
              Review their documents and approve or reject their applications
            </div>
          </div>
          <a href="/admin/lawyers" style={{ background: 'var(--gold)', color: 'white', padding: '9px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Review Now →
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
