import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';

export default async function ClientPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const payments = await prisma.payment.findMany({
    where: { client_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      case: {
        select: {
          title: true,
          lawyer: { select: { full_name: true } },
        },
      },
    },
  });

  const allPayments = payments ?? [];
  const totalSpent = allPayments.filter(p => p.status === 'released').reduce((s: number, p: any) => s + p.amount, 0);
  const inEscrow = allPayments.filter(p => p.status === 'held').reduce((s: number, p: any) => s + p.amount, 0);
  const pending = allPayments.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Payments
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          All payments are held in escrow until you release them
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'var(--gold)' },
          { label: 'In Escrow', value: formatCurrency(inEscrow), color: '#9a710a' },
          { label: 'Pending', value: formatCurrency(pending), color: 'rgba(14,12,10,0.5)' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color: stat.color, marginBottom: '6px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* History */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
          Transaction History
        </h2>

        {allPayments.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', textAlign: 'center', padding: '32px' }}>
            No payments yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allPayments.map((pmt: any) => (
              <div key={pmt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--cream)', borderRadius: '8px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>
                    {pmt.case?.title} — Milestone {pmt.milestone_number}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)' }}>
                    Advocate: {pmt.case?.lawyer?.full_name} · {formatDate(pmt.created_at.toISOString())}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>
                    {formatCurrency(pmt.amount)}
                  </span>
                  <StatusBadge status={pmt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
