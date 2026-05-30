import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import WithdrawProposalButton from './WithdrawProposalButton';

export default async function LawyerProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const proposals = await prisma.proposal.findMany({
    where: { lawyer_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      brief: {
        select: {
          id: true, title: true, category: true, court: true,
          budget_min: true, budget_max: true,
          _count: { select: { proposals: true } },
        },
      },
    },
  });

  const pending   = proposals.filter((p) => p.status === 'pending');
  const accepted  = proposals.filter((p) => p.status === 'accepted');
  const rejected  = proposals.filter((p) => p.status === 'rejected');
  const withdrawn = proposals.filter((p) => p.status === 'withdrawn');

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px',
          }}
        >
          My Proposals
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {pending.length} pending · {accepted.length} accepted · {rejected.length} not selected
        </p>
      </div>

      {proposals.length === 0 ? (
        <div
          style={{
            background: 'white', border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '16px', padding: '64px', textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', marginBottom: '12px' }}>
            No proposals submitted yet.
          </p>
          <Link href="/lawyer/briefs" style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 500 }}>
            Browse Briefs →
          </Link>
        </div>
      ) : (
        <div>
          {[
            { label: 'Pending',       items: pending,   color: 'var(--gold)',          showWithdraw: true },
            { label: 'Accepted',      items: accepted,  color: '#1A6B3A',              showWithdraw: false },
            { label: 'Not Selected',  items: rejected,  color: 'var(--rust)',          showWithdraw: false },
            { label: 'Withdrawn',     items: withdrawn, color: 'rgba(14,12,10,0.4)',   showWithdraw: false },
          ].map(({ label, items, color, showWithdraw }) =>
            items.length > 0 ? (
              <div key={label} style={{ marginBottom: '32px' }}>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '20px', fontWeight: 600, color, marginBottom: '14px',
                  }}
                >
                  {label} ({items.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((proposal) => {
                    const brief = proposal.brief as any;
                    return (
                      <div
                        key={proposal.id}
                        style={{
                          background: 'white',
                          border: '1px solid rgba(14,12,10,0.08)',
                          borderRadius: '12px',
                          padding: '20px 24px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex', justifyContent: 'space-between',
                            gap: '16px', flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ marginBottom: '6px' }}>
                              <span
                                style={{
                                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                                  background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500,
                                }}
                              >
                                {brief?.category}
                              </span>
                            </div>
                            <h3
                              style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px',
                              }}
                            >
                              {brief?.title}
                            </h3>
                            <div
                              style={{
                                fontSize: '12px', color: 'rgba(14,12,10,0.45)',
                                display: 'flex', gap: '14px', flexWrap: 'wrap',
                              }}
                            >
                              <span>⚖️ {brief?.court}</span>
                              <span>
                                Budget: {formatCurrency(brief?.budget_min ?? 0)} – {formatCurrency(brief?.budget_max ?? 0)}
                              </span>
                              <span>{brief?._count?.proposals ?? 0} proposals total</span>
                              <span>Submitted {formatDate(proposal.created_at.toISOString())}</span>
                            </div>
                            {proposal.cover_letter && (
                              <p
                                style={{
                                  fontSize: '13px', color: 'rgba(14,12,10,0.55)',
                                  marginTop: '10px', lineHeight: 1.6,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {proposal.cover_letter}
                              </p>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'flex-end', gap: '10px', flexShrink: 0,
                            }}
                          >
                            <StatusBadge status={proposal.status} size="md" />
                            <div
                              style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: '20px', fontWeight: 700, color: 'var(--gold)',
                              }}
                            >
                              {formatCurrency(proposal.proposed_fee)}
                            </div>
                            {proposal.status === 'accepted' && (
                              <Link
                                href="/lawyer/cases"
                                style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 500, textDecoration: 'none' }}
                              >
                                Open Case →
                              </Link>
                            )}
                            {showWithdraw && (
                              <WithdrawProposalButton proposalId={proposal.id} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
