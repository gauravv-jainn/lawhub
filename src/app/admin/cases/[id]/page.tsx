import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';
import AdminCaseActions from './AdminCaseActions';

export default async function AdminCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const caseRow = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      brief:  { select: { title: true, category: true } },
      client: { select: { id: true, full_name: true, email: true } },
      lawyer: { select: { id: true, full_name: true, email: true } },
      milestones: {
        orderBy: { number: 'asc' },
        include: { payment: true, attachments: true },
      },
      payments: { orderBy: { milestone_number: 'asc' } },
      events: {
        orderBy: { created_at: 'asc' },
        include: { actor: { select: { full_name: true, role: true } } },
      },
      dispute: true,
    },
  });

  if (!caseRow) notFound();
  const c = caseRow;

  const heldPayments     = c.payments.filter((p) => p.status === 'held');
  const releasedPayments = c.payments.filter((p) => p.status === 'released');
  const totalHeld        = heldPayments.reduce((s, p) => s + p.amount, 0);
  const totalReleased    = releasedPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="page-container">
      <a
        href="/admin/cases"
        style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
      >
        ← Back to Cases
      </a>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
              background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500,
            }}
          >
            {c.brief?.category}
          </span>
          <StatusBadge status={c.status} size="md" />
          {c.dispute && (
            <span
              style={{
                fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
                background: 'rgba(192,57,43,0.1)', color: 'var(--rust)', fontWeight: 600,
              }}
            >
              ⚠ Dispute Active
            </span>
          )}
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px',
          }}
        >
          {c.title}
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)' }}>
          Started {formatDate(c.created_at.toISOString())} · Case ID: {c.id}
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}
        className="case-admin-grid"
      >
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Milestones + payments */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
              Milestones & Payments
            </h3>
            {c.milestones.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No milestones defined.</p>
            ) : (
              c.milestones.map((ms) => (
                <div
                  key={ms.id}
                  style={{
                    padding: '12px 14px', marginBottom: '8px',
                    background: 'var(--cream)', borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                        {ms.number}. {ms.title}
                      </div>
                      {ms.deliverables && (
                        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '2px' }}>
                          {ms.deliverables.slice(0, 100)}{ms.deliverables.length > 100 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(14,12,10,0.07)', color: 'rgba(14,12,10,0.55)', textTransform: 'capitalize' }}>
                        {ms.status}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>
                        {formatCurrency(ms.amount)}
                      </span>
                    </div>
                  </div>
                  {ms.payment && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'flex', gap: '12px' }}>
                      <span>Payment: <strong style={{ textTransform: 'capitalize' }}>{ms.payment.status}</strong></span>
                      <span>{formatCurrency(ms.payment.amount)}</span>
                      <span>ID: {ms.payment.id.slice(0, 8)}…</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Case Timeline */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
              Case Timeline
            </h3>
            {c.events.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No events yet.</p>
            ) : c.events.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: '12px', paddingBottom: '14px', position: 'relative' }}>
                {i < c.events.length - 1 && (
                  <div style={{ position: 'absolute', left: '10px', top: '22px', bottom: 0, width: '1px', background: 'rgba(14,12,10,0.08)' }} />
                )}
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--cream)', border: '2px solid rgba(14,12,10,0.1)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{ev.description}</div>}
                  {'actor' in ev && ev.actor && (
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '2px' }}>
                      by {(ev.actor as { full_name: string }).full_name}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.3)' }}>{formatRelativeTime(ev.created_at.toISOString())}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Parties */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Parties</div>
            {[{ label: 'Client', user: c.client }, { label: 'Advocate', user: c.lawyer }].map(({ label, user }) => (
              <div key={label} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{user?.full_name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{user?.email}</div>
                <a href={`/admin/users/${user?.id}`} style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>
                  View profile →
                </a>
              </div>
            ))}
          </div>

          {/* Financials */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Financials</div>
            {[
              { label: 'Total Fee',       value: formatCurrency(c.total_fee) },
              { label: 'In Escrow',       value: formatCurrency(totalHeld) },
              { label: 'Released',        value: formatCurrency(totalReleased) },
              { label: 'Fee Structure',   value: c.fee_structure },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Admin override actions */}
          <AdminCaseActions
            caseId={params.id}
            caseStatus={c.status}
            heldPayments={heldPayments.map((p) => ({
              id: p.id,
              milestoneNumber: p.milestone_number ?? 0,
              amount: p.amount,
            }))}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .case-admin-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
