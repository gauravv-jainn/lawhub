import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import EarningsChart from '@/components/lawyer/EarningsChart';

export default async function LawyerEarningsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const payments = await prisma.payment.findMany({
    where: { lawyer_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      case: {
        select: {
          title: true,
          client: { select: { full_name: true } },
        },
      },
    },
  });

  const allPayments = payments ?? [];
  const released = allPayments.filter(p => p.status === 'released');
  const held = allPayments.filter(p => p.status === 'held');
  const pending = allPayments.filter(p => p.status === 'pending');

  const totalEarned = released.reduce((s, p) => s + p.amount, 0);
  const netReceived = released.reduce((s: number, p: any) => s + (p.net_amount ?? 0), 0);
  const inEscrow = held.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.amount, 0);

  // Build monthly data for chart
  const monthlyData: Record<string, number> = {};
  released.forEach((p: any) => {
    const month = new Date(p.released_at ?? p.created_at).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    monthlyData[month] = (monthlyData[month] ?? 0) + (p.net_amount ?? 0);
  });
  const chartData = Object.entries(monthlyData).slice(-6).map(([month, amount]) => ({ month, amount: amount / 100 }));

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Earnings Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Platform fee: 10% deducted at settlement
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }} className="stats-grid">
        {[
          { label: 'Total Earned (Gross)', value: formatCurrency(totalEarned), color: 'var(--gold)' },
          { label: 'Net Received', value: formatCurrency(netReceived), color: '#1A6B3A' },
          { label: 'In Escrow', value: formatCurrency(inEscrow), color: '#9a710a' },
          { label: 'Pending', value: formatCurrency(pendingAmount), color: 'rgba(14,12,10,0.5)' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color: stat.color, marginBottom: '6px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
            Monthly Net Earnings (₹)
          </h2>
          <EarningsChart data={chartData} />
        </div>
      )}

      {/* Transaction table */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
          Payment History
        </h2>

        {allPayments.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', textAlign: 'center', padding: '32px' }}>
            No payments yet. Win a bid to get started.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.08)' }}>
                  {['Case', 'Milestone', 'Gross', 'Platform Fee', 'Net', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: 'rgba(14,12,10,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPayments.map((pmt: any) => (
                  <tr key={pmt.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.05)' }}>
                    <td style={{ padding: '12px', color: 'var(--ink)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pmt.case?.title}
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(14,12,10,0.55)' }}>M{pmt.milestone_number}</td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--ink)' }}>{formatCurrency(pmt.amount)}</td>
                    <td style={{ padding: '12px', color: 'var(--rust)' }}>-{formatCurrency(pmt.platform_fee ?? 0)}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1A6B3A' }}>{formatCurrency(pmt.net_amount ?? 0)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: pmt.status === 'released' ? 'rgba(26,107,58,0.1)' : pmt.status === 'held' ? 'rgba(212,160,23,0.1)' : 'rgba(14,12,10,0.06)', color: pmt.status === 'released' ? '#1A6B3A' : pmt.status === 'held' ? '#9a710a' : 'rgba(14,12,10,0.4)', fontWeight: 600 }}>
                        {pmt.status === 'held' ? 'In Escrow' : pmt.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(14,12,10,0.45)' }}>{formatDate(pmt.released_at ? pmt.released_at.toISOString() : pmt.created_at.toISOString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
