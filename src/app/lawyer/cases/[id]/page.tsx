import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import MessageThread from '@/app/client/cases/[id]/MessageThread';
import RequestPaymentButton from './RequestPaymentButton';
import SuggestArgumentsAI from './SuggestArgumentsAI';
import CaseManagePanel from './CaseManagePanel';

export default async function LawyerCaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [caseData, events, payments, messages] = await Promise.all([
    prisma.case.findFirst({
      where: { id: params.id, lawyer_id: userId },
      include: {
        client: { select: { full_name: true } },
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
  ]);

  if (!caseData) notFound();
  const c = caseData as any;

  const clientName = c.client?.full_name ?? 'Unknown';
  const clientInitials = clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

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
          <span>👤 Client: {clientName}</span>
          <span>📅 Started {formatDate(c.created_at.toISOString())}</span>
          {c.next_hearing_date && <span style={{ color: 'var(--teal)', fontWeight: 500 }}>🗓 Next: {c.next_hearing_date}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }} className="case-detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Milestone */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Milestones
            </h2>
            <div style={{ display: 'flex', gap: '0', alignItems: 'center', marginBottom: '20px' }}>
              {Array.from({ length: c.milestone_count }, (_: any, i: number) => i + 1).map((ms: number, i: number) => {
                const done = ms <= c.current_milestone;
                const current = ms === c.current_milestone + 1;
                return (
                  <div key={ms} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: `2px solid ${done ? 'var(--teal)' : current ? 'var(--gold)' : 'rgba(14,12,10,0.15)'}`,
                        background: done ? 'var(--teal)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done ? 'white' : current ? 'var(--gold)' : 'rgba(14,12,10,0.3)',
                        fontSize: '12px', fontWeight: 700,
                      }}>
                        {done ? '✓' : ms}
                      </div>
                    </div>
                    {i < c.milestone_count - 1 && (
                      <div style={{ flex: 1, height: '2px', background: done ? 'var(--teal)' : 'rgba(14,12,10,0.1)', margin: '0 4px', marginBottom: '18px' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {c.status === 'active' && c.current_milestone < c.milestone_count && (
              <RequestPaymentButton
                caseId={c.id}
                nextMilestone={c.current_milestone + 1}
                totalFee={c.total_fee}
                milestoneCount={c.milestone_count}
              />
            )}

            {payments.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.map((pmt: any) => (
                  <div key={pmt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', background: 'var(--cream)', borderRadius: '6px' }}>
                    <span>Milestone {pmt.milestone_number}</span>
                    <span>{formatCurrency(pmt.net_amount)} net</span>
                    <StatusBadge status={pmt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Case Timeline
            </h2>
            {events.map((event: any, i: number) => (
              <div key={event.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < events.length - 1 ? '20px' : '0', position: 'relative' }}>
                {i < events.length - 1 && <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '1px', background: 'rgba(14,12,10,0.1)' }} />}
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--cream)', border: '2px solid rgba(14,12,10,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>·</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>{event.title}</div>
                  {event.description && <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginBottom: '4px' }}>{event.description}</div>}
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)' }}>{formatRelativeTime(event.created_at.toISOString())}</div>
                </div>
              </div>
            ))}
            {events.length === 0 && <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)' }}>No events yet.</p>}
          </div>

          {/* AI Legal Arguments */}
          <SuggestArgumentsAI
            caseType={c.brief?.category ?? 'General'}
            caseFacts={`${c.title}. Client: ${clientName}. Court: ${c.brief?.court ?? 'N/A'}. ${events.slice(0, 3).map((e: any) => e.title).join('. ')}`}
          />

          {/* Messages */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Messages with Client
            </h2>
            <MessageThread caseId={params.id} userId={userId} userRole="lawyer" initialMessages={messages as any} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Client card */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gold)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{clientInitials}</div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>{clientName}</div>
            </div>
          </div>
          {/* Case details */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            {[
              { label: 'Total Fee', value: formatCurrency(c.total_fee) },
              { label: 'Your Earning', value: formatCurrency(c.total_fee * 0.9) + ' (net)' },
              { label: 'Fee Structure', value: c.fee_structure },
              { label: 'Milestones', value: `${c.current_milestone}/${c.milestone_count}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(14,12,10,0.06)', fontSize: '12px' }}>
                <span style={{ color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Management actions */}
          <CaseManagePanel
            caseId={c.id}
            currentMilestone={c.current_milestone}
            milestoneCount={c.milestone_count}
            status={c.status}
            nextHearingDate={c.next_hearing_date}
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
