import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';
import DisputeResolutionPanel from './DisputeResolutionPanel';

export default async function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      case: {
        include: {
          client: { select: { id: true, full_name: true, email: true } },
          lawyer: { select: { id: true, full_name: true, email: true } },
          milestones: {
            orderBy: { number: 'asc' },
            include: { payment: true },
          },
          payments: { orderBy: { milestone_number: 'asc' } },
          messages: {
            orderBy: { created_at: 'asc' },
            include: { sender: { select: { full_name: true, role: true } } },
            take: 50,
          },
          events: { orderBy: { created_at: 'asc' } },
        },
      },
      raised_by: { select: { full_name: true, role: true } },
      admin:     { select: { full_name: true } },
      evidence: {
        orderBy: { created_at: 'asc' },
        include: { uploader: { select: { full_name: true, role: true } } },
      },
    },
  });

  if (!dispute) notFound();
  const c = dispute.case!;

  const heldPayments = c.payments.filter((p) => p.status === 'held');
  const totalHeld    = heldPayments.reduce((s, p) => s + p.amount, 0);
  const isResolved   = ['resolved_client', 'resolved_lawyer', 'partial_refund', 'settled'].includes(dispute.status);

  return (
    <div className="page-container">
      {/* Back */}
      <a
        href="/admin/disputes"
        style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
      >
        ← Back to Disputes
      </a>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
              background: 'rgba(192,57,43,0.08)', color: 'var(--rust)',
              textTransform: 'capitalize',
            }}
          >
            {dispute.status.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.35)' }}>
            Raised {formatRelativeTime(dispute.created_at.toISOString())} by{' '}
            {dispute.raised_by?.full_name} ({dispute.raised_by?.role})
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px',
          }}
        >
          Dispute: {c.title}
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.5)' }}>
          Reason: <strong style={{ textTransform: 'capitalize' }}>{dispute.reason.replace(/_/g, ' ')}</strong>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}
        className="dispute-grid"
      >
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Dispute description */}
          {dispute.description && (
            <div
              style={{
                background: 'rgba(192,57,43,0.04)',
                border: '1px solid rgba(192,57,43,0.15)',
                borderRadius: '12px', padding: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
                }}
              >
                Client's Statement
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink)', margin: 0, lineHeight: 1.7 }}>
                {dispute.description}
              </p>
            </div>
          )}

          {/* Evidence */}
          {dispute.evidence && dispute.evidence.length > 0 && (
            <div
              style={{
                background: 'white', border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '12px', padding: '20px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
                }}
              >
                Evidence ({dispute.evidence.length} file{dispute.evidence.length !== 1 ? 's' : ''})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dispute.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--cream)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                        {ev.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>
                        Uploaded by <strong>{ev.uploader.full_name}</strong>{' '}
                        <span style={{ textTransform: 'capitalize' }}>({ev.uploader.role})</span>
                        {' · '}{formatRelativeTime(ev.created_at.toISOString())}
                      </div>
                    </div>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px', fontWeight: 600,
                        color: 'var(--teal)', textDecoration: 'none',
                        padding: '5px 12px',
                        border: '1px solid rgba(26,107,58,0.25)',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      View ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
              }}
            >
              Milestones & Payments
            </h3>
            {c.milestones.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No milestones.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {c.milestones.map((ms) => (
                  <div
                    key={ms.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '12px',
                      padding: '12px 14px',
                      background: 'var(--cream)',
                      borderRadius: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                        {ms.number}. {ms.title}
                      </div>
                      {ms.deliverables && (
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>
                          {ms.deliverables.slice(0, 80)}{ms.deliverables.length > 80 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '11px', fontWeight: 600,
                        padding: '3px 8px', borderRadius: '10px',
                        background: 'rgba(14,12,10,0.06)',
                        color: 'rgba(14,12,10,0.5)',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ms.status}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(ms.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Case messages */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
              }}
            >
              Message Thread (last 50)
            </h3>
            {c.messages.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No messages.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {c.messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: msg.sender.role === 'lawyer' ? 'var(--teal)' : 'var(--gold)',
                        color: 'white', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {msg.sender.full_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginBottom: '3px' }}>
                        <strong>{msg.sender.full_name}</strong>{' '}
                        <span style={{ textTransform: 'capitalize' }}>({msg.sender.role})</span>{' '}
                        · {formatRelativeTime(msg.created_at.toISOString())}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Case timeline */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
              }}
            >
              Case Timeline
            </h3>
            {c.events.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: '12px', paddingBottom: '14px', position: 'relative' }}>
                {i < c.events.length - 1 && (
                  <div style={{ position: 'absolute', left: '10px', top: '22px', bottom: 0, width: '1px', background: 'rgba(14,12,10,0.08)' }} />
                )}
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--cream)', border: '2px solid rgba(14,12,10,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>·</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{ev.description}</div>}
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.3)' }}>{formatRelativeTime(ev.created_at.toISOString())}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Parties */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Parties</div>
            {[
              { label: 'Client', user: c.client },
              { label: 'Advocate', user: c.lawyer },
            ].map(({ label, user }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{user?.full_name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{user?.email}</div>
              </div>
            ))}
          </div>

          {/* Escrow summary */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Escrow Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)' }}>Total Case Fee</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(c.total_fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)' }}>Held in Escrow</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(totalHeld)}</span>
            </div>
            {heldPayments.map((p) => (
              <div key={p.id} style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginLeft: '8px', marginBottom: '4px' }}>
                Milestone {p.milestone_number}: {formatCurrency(p.amount)}
              </div>
            ))}
          </div>

          {/* Resolution panel */}
          <DisputeResolutionPanel
            disputeId={params.id}
            caseId={c.id}
            adminId={session.user.id}
            isAssigned={dispute.admin_id === session.user.id}
            currentStatus={dispute.status}
            heldPayments={heldPayments.map((p) => ({ id: p.id, milestoneNumber: p.milestone_number ?? 0, amount: p.amount }))}
            isResolved={isResolved}
            evidence={(dispute.evidence ?? []).map((ev) => ({
              id: ev.id,
              name: ev.name,
              url: ev.url,
              file_type: ev.file_type,
              created_at: ev.created_at.toISOString(),
              uploader: ev.uploader,
            }))}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dispute-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
