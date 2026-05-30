import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import ReviewForm from '@/components/shared/ReviewForm';
import MilestonePanel from './MilestonePanel';
import CaseActions from './CaseActions';

const EVENT_ICONS: Record<string, string> = {
  case_created:            '🟢',
  case_completed:          '✅',
  case_auto_completed:     '✅',
  case_cancelled:          '❌',
  completion_requested:    '🔔',
  hearing_set:             '📅',
  milestone_paid:          '💰',
  payment_released:        '💸',
  dispute_resolved:        '⚖️',
  milestone_plan_submitted:'📋',
  milestone_plan_approved: '✅',
  milestone_plan_rejected: '❌',
  milestone_submitted:     '📤',
  milestone_approved:      '✔️',
  manual_note:             '📝',
};

export default async function ClientCaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [caseData, events, review] = await Promise.all([
    prisma.case.findFirst({
      where: { id: params.id, client_id: userId },
      include: {
        lawyer: { select: { id: true, full_name: true, avatar_url: true } },
        brief: { select: { title: true, category: true, court: true } },
        milestones: {
          orderBy: { number: 'asc' },
          include: {
            payment: { select: { id: true, status: true, amount: true } },
            attachments: true,
          },
        },
        payments: { orderBy: { milestone_number: 'asc' } },
        dispute: true,
      },
    }),
    prisma.caseEvent.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
      include: { actor: { select: { full_name: true, role: true } } },
    }),
    prisma.review.findFirst({
      where: { case_id: params.id },
      select: { id: true },
    }),
  ]);

  if (!caseData) notFound();
  const c = caseData;

  const lawyerName     = c.lawyer?.full_name ?? 'Unknown';
  const lawyerInitials = lawyerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const hasReview      = !!review;
  const totalPaid      = c.payments.filter((p) => p.status === 'released').reduce((s, p) => s + p.amount, 0);
  const totalHeld      = c.payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.amount, 0);

  const canApproveCompletion = c.status === 'completion_requested';
  const canRaiseDispute      = ['active', 'completion_requested'].includes(c.status) && !c.dispute;

  // Compute completion deadline countdown
  let completionDeadline: string | null = null;
  if (c.status === 'completion_requested' && c.completion_requested_at) {
    const deadline = new Date(c.completion_requested_at);
    deadline.setHours(deadline.getHours() + 72);
    const hoursLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3_600_000));
    completionDeadline = hoursLeft > 0 ? `${hoursLeft}h remaining to respond` : 'Window closing soon';
  }

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
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'rgba(14,12,10,0.45)', flexWrap: 'wrap' }}>
          <span>⚖️ {c.brief?.court}</span>
          <span>📅 Started {formatDate(c.created_at.toISOString())}</span>
          {c.next_hearing_date && (
            <span style={{ color: 'var(--teal)', fontWeight: 500 }}>
              🗓 Next hearing: {c.next_hearing_date}
            </span>
          )}
        </div>
      </div>

      {/* Completion request banner */}
      {c.status === 'completion_requested' && (
        <div
          style={{
            background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
              Your advocate has marked this case complete
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '4px' }}>
              Review the work and approve below, or raise a dispute if you have concerns.
              {completionDeadline && (
                <span style={{ color: 'var(--rust)', fontWeight: 600, marginLeft: '6px' }}>
                  ⏱ {completionDeadline}
                </span>
              )}
            </div>
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
            Status:{' '}
            <strong style={{ textTransform: 'capitalize' }}>
              {c.dispute.status.replace(/_/g, ' ')}
            </strong>
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
            userRole="client"
            caseStatus={c.status}
            disputeActive={!!c.dispute}
          />

          {/* Case Timeline — source of truth, replaces chat */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '24px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: '18px',
                fontWeight: 600, color: 'var(--ink)', marginBottom: '4px',
              }}
            >
              Case Timeline
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginBottom: '20px' }}>
              All case activity is recorded here. For communications, use phone or email with your advocate.
            </p>
            <div style={{ position: 'relative' }}>
              {events.length === 0 && (
                <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>
                  No timeline events yet.
                </p>
              )}
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
                      justifyContent: 'center', fontSize: '11px',
                    }}
                  >
                    {EVENT_ICONS[event.event_type] ?? '·'}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>
                      {event.title}
                    </div>
                    {event.actor && (
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '2px', textTransform: 'capitalize' }}>
                        by {event.actor.full_name} ({event.actor.role})
                      </div>
                    )}
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
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lawyer card */}
          <div
            style={{
              background: 'white', border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px', padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your Advocate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px', height: '42px', borderRadius: '50%', background: 'var(--teal)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700,
                }}
              >
                {lawyerInitials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{lawyerName}</div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>BCI Verified</div>
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
              { label: 'Total Fee',   value: formatCurrency(c.total_fee) },
              { label: 'Paid Out',    value: formatCurrency(totalPaid) },
              { label: 'In Escrow',   value: formatCurrency(totalHeld) },
              { label: 'Fee Type',    value: c.fee_structure },
              { label: 'Status',      value: <StatusBadge status={c.status} /> },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: '12px', marginBottom: '12px',
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

          {/* Case actions */}
          <CaseActions
            caseId={params.id}
            caseStatus={c.status}
            userRole="client"
            canApproveCompletion={canApproveCompletion}
            canRaiseDispute={canRaiseDispute}
            disputeActive={!!c.dispute}
          />

          {/* Review — only when completed and no review yet */}
          {c.status === 'completed' && !hasReview && (
            <ReviewForm caseId={params.id} lawyerId={c.lawyer_id} lawyerName={lawyerName} />
          )}
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
