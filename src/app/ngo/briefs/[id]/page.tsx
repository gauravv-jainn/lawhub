import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import LegalSectionsCard from '@/components/shared/LegalSectionsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';

export default async function NGOBriefDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [brief, bids] = await Promise.all([
    prisma.brief.findFirst({ where: { id: params.id, client_id: userId } }),
    prisma.bid.findMany({
      where: { brief_id: params.id },
      orderBy: { created_at: 'desc' },
      include: {
        lawyer: {
          select: {
            full_name: true,
            lawyer_profile: {
              select: { experience_years: true, practice_areas: true, avg_rating: true, primary_court: true },
            },
          },
        },
      },
    }),
  ]);

  if (!brief) notFound();

  const URGENCY_BORDER: Record<string, string> = {
    emergency: 'var(--rust)', urgent: 'var(--gold)', standard: 'rgba(14,12,10,0.15)',
  };

  return (
    <div className="page-container">
      {/* Back */}
      <Link href="/ngo/briefs" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        ← Back to Briefs
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
            {brief.category}
          </span>
          <StatusBadge status={brief.urgency} />
          <StatusBadge status={brief.status} size="md" />
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          {brief.title}
        </h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'rgba(14,12,10,0.45)' }}>
          {brief.court && <span>⚖️ {brief.court}</span>}
          {brief.city && <span>📍 {brief.city}{brief.state ? `, ${brief.state}` : ''}</span>}
          <span>📅 Posted {formatDate(brief.created_at.toISOString())}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Description */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
            Matter Description
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(14,12,10,0.7)', whiteSpace: 'pre-wrap' }}>
            {brief.description}
          </p>
          {brief.budget_min && brief.budget_max && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(14,12,10,0.06)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '2px' }}>Budget Range</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>
                  ₹{(brief.budget_min / 100).toLocaleString('en-IN')} – ₹{(brief.budget_max / 100).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '2px' }}>Proposals Received</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
                  {bids.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Legal Sections */}
        <LegalSectionsCard structuredSummary={brief.structured_summary} />

        {/* Proposals */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
            Proposals Received ({bids.length})
          </h2>

          {bids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>
              No proposals yet. Advocates are reviewing your brief.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bids.map((bid: any) => (
                <div key={bid.id} style={{
                  background: 'var(--cream)', borderRadius: '10px', padding: '16px 20px',
                  borderLeft: `3px solid ${bid.status === 'accepted' ? 'var(--teal)' : 'rgba(14,12,10,0.12)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>
                        {bid.lawyer.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
                        {bid.lawyer.lawyer_profile?.experience_years}y exp
                        {bid.lawyer.lawyer_profile?.primary_court && ` · ${bid.lawyer.lawyer_profile.primary_court}`}
                      </div>
                      {bid.cover_letter && (
                        <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.65)', marginTop: '8px', lineHeight: 1.55 }}>
                          {bid.cover_letter.slice(0, 200)}{bid.cover_letter.length > 200 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>
                        ₹{(bid.proposed_fee / 100).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'capitalize' }}>
                        {bid.fee_structure}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <StatusBadge status={bid.status} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
