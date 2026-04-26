import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatRange } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelativeTime, formatTimeLeft } from '@/lib/utils/formatDate';
import ProposalCard from './ProposalCard';
import LegalSectionsCard from '@/components/shared/LegalSectionsCard';

export default async function BriefDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [brief, bids, docs] = await Promise.all([
    prisma.brief.findFirst({
      where: { id: params.id, client_id: userId },
    }),
    prisma.bid.findMany({
      where: { brief_id: params.id },
      orderBy: { created_at: 'desc' },
      include: {
        lawyer: {
          select: {
            full_name: true,
            avatar_url: true,
            lawyer_profile: {
              select: {
                experience_years: true,
                practice_areas: true,
                avg_rating: true,
                review_count: true,
                total_cases: true,
                wins: true,
                primary_court: true,
                bci_number: true,
              },
            },
          },
        },
      },
    }),
    prisma.briefDocument.findMany({
      where: { brief_id: params.id },
    }),
  ]);

  if (!brief) notFound();

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
            {brief.category}
          </span>
          <StatusBadge status={brief.urgency} />
          <StatusBadge status={brief.status} size="md" />
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '34px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          {brief.title}
        </h1>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: 'rgba(14,12,10,0.45)' }}>
          <span>⚖️ {brief.court}</span>
          <span>📍 {brief.city}, {brief.state}</span>
          <span>📅 Posted {formatDate(brief.created_at.toISOString())}</span>
          {brief.closes_at && <span style={{ color: brief.status === 'open' ? 'var(--rust)' : 'inherit' }}>⏰ {formatTimeLeft(brief.closes_at.toISOString())}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }} className="brief-detail-grid">
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Description */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Matter Description
            </h2>
            <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(14,12,10,0.7)', whiteSpace: 'pre-wrap' }}>
              {brief.description}
            </p>
            {brief.structured_summary && (
              <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(13,115,119,0.05)', borderRadius: '8px', border: '1px solid rgba(13,115,119,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--teal)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  ✨ AI Structured Summary
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--ink)' }}>
                  {typeof brief.structured_summary === 'string'
                    ? brief.structured_summary
                    : JSON.stringify(brief.structured_summary, null, 2)}
                </p>
              </div>
            )}
          </div>

          {/* Documents */}
          {docs.length > 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
                Supporting Documents ({docs.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docs.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--cream)', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)', textDecoration: 'none' }}>
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{doc.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>Uploaded {formatRelativeTime(doc.created_at.toISOString())}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Legal Sections */}
          <LegalSectionsCard structuredSummary={brief.structured_summary} />

          {/* Proposals */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                Proposals Received ({bids.length})
              </h2>
            </div>

            {bids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>
                No proposals yet. Advocates are reviewing your brief.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bids.map((bid: any, i: number) => (
                  <ProposalCard
                    key={bid.id}
                    bid={bid}
                    index={i}
                    briefStatus={brief.status}
                    briefId={brief.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Budget */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Budget Range
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatRange(brief.budget_min ?? 0, brief.budget_max ?? 0)}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            {[
              { label: 'Proposals', value: bids.length },
              { label: 'Status', value: <StatusBadge status={brief.status} /> },
              { label: 'Urgency', value: <StatusBadge status={brief.urgency} /> },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .brief-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
