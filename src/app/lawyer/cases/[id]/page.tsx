import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import MessageThread from '@/app/client/cases/[id]/MessageThread';
import MilestonePanel from '@/app/client/cases/[id]/MilestonePanel';
import CaseManagePanel from './CaseManagePanel';

export default async function LawyerCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [caseData, events, messages] = await Promise.all([
    prisma.case.findFirst({
      where: { id: params.id, lawyer_id: userId },
      include: {
        client: { select: { id: true, full_name: true } },
        brief:  { select: { title: true, category: true, court: true } },
        milestones: {
          orderBy: { number: 'asc' },
          include: {
            payment:     { select: { id: true, status: true, amount: true } },
            attachments: true,
          },
        },
        payments: { orderBy: { milestone_number: 'asc' } },
        dispute:  true,
      },
    }),
    prisma.caseEvent.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
    }),
    prisma.message.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
      include: { sender: { select: { id: true, full_name: true, role: true } } },
    }),
  ]);

  if (!caseData) notFound();
  const c = caseData as typeof caseData & {
    milestones: NonNullable<typeof caseData>['milestones'];
  };

  const clientName     = c.client?.full_name ?? 'Unknown';
  const clientInitials = clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const totalReleased = c.payments.filter((p) => p.status === 'released').reduce((s, p) => s + p.amount, 0);
  const totalHeld     = c.payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount, 0);

  // TDS estimate for display (server-safe)
  const tdsThreshold = 3_000_000;
  const netEarnings  = c.payments
    .filter((p) => p.status === 'released')
    .reduce((s, p) => {
      const tds = p.amount >= tdsThreshold ? Math.round(p.amount * 0.1) : 0;
      return s + p.amount - tds;
    }, 0);

  const allMilestonesComplete = c.milestones.length > 0 &&
    c.milestones.every((m) => ['approved', 'paid', 'cancelled'].includes(m.status));

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
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
            fontFamily: "'Cormorant Garamond', serif", fontSize: '30px',
            fontWeight: 600, color: 'var(--ink)', marginBottom: '8px',
          }}
        >
          {c.title}
        </h1>
        <div
          style={{
            display: 'flex', gap: '20px', fontSize: '13px',
            color: 'rgba(14,12,10,0.45)', flexWrap: 'wrap',
          }}
        >
          <span>⚖️ {c.brief?.court}</span>
          <span>👤 Client: {clientName}</span>
          <span>📅 Started {formatDate(c.created_at.toISOString())}</span>
          {c.next_hearing_date && (
            <span style={{ color: 'var(--teal)', fontWeight: 500 }}>
              🗓 Next hearing: {c.next_hearing_date}
            </span>
          )}
        </div>
      </div>

      {/* Completion requested banner */}
      {c.status === 'completion_requested' && (
        <div
          style={{
            background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
            Completion request sent
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '4px' }}>
            You have requested case completion. The client has 72 hours to approve or raise a dispute.
            If no action is taken, the case will close automatically.
          </div>
        </div>
      )}

      {/* Dispute banner */}
      {c.dispute && (
        <div
          style={{
            background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--rust)' }}>
            Dispute in progress — payments are frozen
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '4px' }}>
            Status: <strong style={{ textTransform: 'capitalize' }}>{c.dispute.status.replace(/_/g, ' ')}</strong>
            {c.dispute.resolution && ` · ${c.dispute.resolution}`}
          </div>
        </div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}
        className="case-detail-grid"
      >
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Milestones */}
          <MilestonePanel
            caseId={params.id}
            milestones={c.milestones as any}
            userRole="lawyer"
            caseStatus={c.status}
            disputeActive={!!c.dispute}
          />

          {/* Case Timeline */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '24px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: '18px',
                fontWeight: 600, color: 'var(--ink)', marginBottom: '20px',
              }}
            >
              Case Timeline
            </h2>
            <div style={{ position: 'relative' }}>
              {events.map((event, i) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex', gap: '14px',
                    paddingBottom: i < events.length - 1 ? '20px' : '0',
                    position: 'relative',
                  }}
                >
                  {i < events.length - 1 && (
                    <div
                      style={{
                        position: 'absolute', left: '11px', top: '24px', bottom: 0,
                        width: '1px', background: 'rgba(14,12,10,0.1)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'var(--cream)', border: '2px solid rgba(14,12,10,0.12)',
                      flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '10px',
                    }}
                  >
                    ·
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginBottom: '4px' }}>
                        {event.description}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)' }}>
                      {formatRelativeTime(event.created_at.toISOString())}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No events yet.</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '24px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: '18px',
                fontWeight: 600, color: 'var(--ink)', marginBottom: '20px',
              }}
            >
              Messages with Client
            </h2>
            <MessageThread
              caseId={params.id}
              userId={userId}
              userRole="lawyer"
              initialMessages={messages as any}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Client card */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <div
              style={{
                fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '14px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              Client
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'var(--gold)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700,
                }}
              >
                {clientInitials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{clientName}</div>
              </div>
            </div>
          </div>

          {/* Case financials */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            {[
              { label: 'Total Fee',    value: formatCurrency(c.total_fee) },
              { label: 'Released',     value: formatCurrency(totalReleased) },
              { label: 'In Escrow',    value: formatCurrency(totalHeld) },
              { label: 'Net Received', value: formatCurrency(netEarnings) },
              { label: 'Fee Type',     value: c.fee_structure },
              { label: 'Status',       value: <StatusBadge status={c.status} /> },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: '10px', marginBottom: '10px',
                  borderBottom: '1px solid rgba(14,12,10,0.06)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Management panel */}
          <CaseManagePanel
            caseId={params.id}
            caseStatus={c.status}
            nextHearingDate={c.next_hearing_date}
            allMilestonesComplete={allMilestonesComplete}
            disputeActive={!!c.dispute}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .case-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
