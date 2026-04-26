import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminRevenuePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const payments = await prisma.payment.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      case: {
        select: {
          title: true,
          client: { select: { full_name: true } },
          lawyer: { select: { full_name: true } },
        },
      },
    },
  });

  const allPayments = (payments ?? []) as any[];
  const released = allPayments.filter(p => p.status === 'released');
  const totalRevenue = released.reduce((s: number, p: any) => s + (p.platform_fee ?? 0), 0);
  const totalGMV = allPayments.filter(p => p.status !== 'refunded').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        Revenue Analytics
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Revenue (10% fee)</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 700, color: '#1A6B3A' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total GMV (Fees Facilitated)</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 700, color: 'var(--gold)' }}>
            {formatCurrency(totalGMV)}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
          All Transactions
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.08)' }}>
                {['Case', 'Client', 'Advocate', 'Amount', 'Platform Fee', 'Net', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', color: 'rgba(14,12,10,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPayments.map((pmt: any) => (
                <tr key={pmt.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.05)' }}>
                  <td style={{ padding: '10px 12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)', fontWeight: 500 }}>
                    {pmt.case?.title}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'rgba(14,12,10,0.55)' }}>{pmt.case?.client?.full_name}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(14,12,10,0.55)' }}>{pmt.case?.lawyer?.full_name}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatCurrency(pmt.amount)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--rust)' }}>{formatCurrency(pmt.platform_fee ?? 0)}</td>
                  <td style={{ padding: '10px 12px', color: '#1A6B3A', fontWeight: 600 }}>{formatCurrency(pmt.net_amount ?? 0)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '100px', fontWeight: 600, background: pmt.status === 'released' ? 'rgba(26,107,58,0.1)' : 'rgba(14,12,10,0.06)', color: pmt.status === 'released' ? '#1A6B3A' : 'rgba(14,12,10,0.4)' }}>
                      {pmt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
