import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import MessageThread from './MessageThread';
import ReleasePaymentButton from './ReleasePaymentButton';
import ReviewForm from '@/components/shared/ReviewForm';
import CaseSummaryAI from './CaseSummaryAI';

export default async function ClientCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [caseData, events, payments, messages, review] = await Promise.all([
    prisma.case.findFirst({
      where: { id: params.id, client_id: userId },
      include: {
        lawyer: { select: { full_name: true, avatar_url: true } },
        brief: { select: { title: true, category: true, court: true } },
      },
    }),
    prisma.caseEvent.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
    }),
    prisma.payment.findMany({
      where: { case_id: params.id },
      orderBy: { milestone_number: 'asc' },
    }),
    prisma.message.findMany({
      where: { case_id: params.id },
      orderBy: { created_at: 'asc' },
    }),
    prisma.review.findFirst({
      where: { case_id: params.id },
      select: { id: true },
    }),
  ]);

  if (!caseData) notFound();
  const c = caseData as any;

  const lawyerName = c.lawyer?.full_name ?? 'Unknown';
  const lawyerInitials = lawyerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const milestoneSteps = Array.from({ length: c.milestone_count }, (_: any, i: number) => i + 1);
  const hasReview = !!review;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
            {c.brief?.category}
          </span>
          <StatusBadge status={c.status} size="md" />
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          {c.title}
        </h1>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'rgba(14,12,10,0.45)', flexWrap: 'wrap' }}>
          <span>⚖️ {c.brief?.court}</span>
          <span>📅 Started {formatDate(c.created_at.toISOString())}</span>
          {c.next_hearing_date && <span style={{ color: 'var(--teal)', fontWeight: 500 }}>🗓 Next hearing: {c.next_hearing_date}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }} className="case-detail-grid">
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Milestone tracker */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Milestone Progress
            </h2>
            <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
              {milestoneSteps.map((ms: number, i: number) => {
                const done = ms <= c.current_milestone;
                const current = ms === c.current_milestone + 1;
                return (
                  <div key={ms} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${done ? 'var(--teal)' : current ? 'var(--gold)' : 'rgba(14,12,10,0.15)'}`,
                        background: done ? 'var(--teal)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done ? 'white' : current ? 'var(--gold)' : 'rgba(14,12,10,0.3)',
                        fontSize: '12px', fontWeight: 700,
                        transition: 'all 0.2s ease',
                      }}>
                        {done ? '✓' : ms}
                      </div>
                      <div style={{ fontSize: '10px', color: done ? 'var(--teal)' : 'rgba(14,12,10,0.4)', fontWeight: done ? 600 : 400 }}>
                        M{ms}
                      </div>
                    </div>
                    {i < milestoneSteps.length - 1 && (
                      <div style={{ flex: 1, height: '2px', background: done ? 'var(--teal)' : 'rgba(14,12,10,0.1)', margin: '0 4px', marginBottom: '18px' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Payment release buttons */}
            {payments.map((pmt: any) => {
              if (pmt.status === 'held') {
                return (
                  <div key={pmt.id} style={{ marginTop: '20px', padding: '14px', background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                        Milestone {pmt.milestone_number} payment in escrow
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
                        {formatCurrency(pmt.amount)} held securely
                      </div>
                    </div>
                    <ReleasePaymentButton paymentId={pmt.id} amount={pmt.amount} />
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Timeline */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Case Timeline
            </h2>
            <div style={{ position: 'relative' }}>
              {events.map((event: any, i: number) => (
                <div key={event.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < events.length - 1 ? '20px' : '0', position: 'relative' }}>
                  {i < events.length - 1 && (
                    <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '1px', background: 'rgba(14,12,10,0.1)' }} />
                  )}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--cream)', border: '2px solid rgba(14,12,10,0.12)',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px',
                  }}>
                    ·
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>{event.title}</div>
                    {event.description && <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginBottom: '4px' }}>{event.description}</div>}
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)' }}>{formatRelativeTime(event.created_at.toISOString())}</div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No timeline events yet.</p>
              )}
            </div>
          </div>

          {/* AI Case Analysis */}
          <CaseSummaryAI
            caseTitle={c.title}
            caseCategory={c.brief?.category ?? ''}
            events={events.map((e: any) => ({ title: e.title, description: e.description }))}
          />

          {/* Messages */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Messages
            </h2>
            <MessageThread caseId={params.id} userId={userId} userRole="client" initialMessages={messages as any} />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lawyer card */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your Advocate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                {lawyerInitials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{lawyerName}</div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>BCI Verified</div>
              </div>
            </div>
          </div>

          {/* Case details */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            {[
              { label: 'Total Fee', value: formatCurrency(c.total_fee) },
              { label: 'Fee Structure', value: c.fee_structure },
              { label: 'Milestones', value: `${c.current_milestone}/${c.milestone_count}` },
              { label: 'Status', value: <StatusBadge status={c.status} /> },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Payments summary */}
          {payments.length > 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Payments
              </div>
              {payments.map((pmt: any) => (
                <div key={pmt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)' }}>Milestone {pmt.milestone_number}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>{formatCurrency(pmt.amount)}</span>
                    <StatusBadge status={pmt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Review form — shown only when case is completed and no review yet */}
          {c.status === 'completed' && !hasReview && (
            <ReviewForm
              caseId={params.id}
              lawyerId={c.lawyer_id}
              lawyerName={lawyerName}
            />
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
