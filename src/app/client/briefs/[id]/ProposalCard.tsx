'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RatingStars from '@/components/shared/RatingStars';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface Bid {
  id: string;
  proposed_fee: number;
  fee_structure: string | null;
  cover_letter: string;
  strategy_text: string;
  relevant_experience: string | null;
  estimated_timeline: string | null;
  availability: string | null;
  milestone_count: number;
  status: string;
  created_at: string;
  lawyer: {
    full_name: string;
    lawyer_profile: {
      experience_years: number | null;
      practice_areas: string[];
      avg_rating: number | null;
      review_count: number | null;
      total_cases: number | null;
      wins: number | null;
      primary_court: string | null;
      bci_number: string | null;
    } | null;
  } | null;
}

interface Props {
  bid: Bid;
  index: number;
  briefStatus: string;
  briefId: string;
}

export default function ProposalCard({ bid, index, briefStatus, briefId }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const lawyerProfile = bid.lawyer?.lawyer_profile;
  const name = bid.lawyer?.full_name ?? 'Unknown Advocate';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const winRate = (lawyerProfile?.total_cases ?? 0) > 0
    ? Math.round(((lawyerProfile?.wins ?? 0) / (lawyerProfile?.total_cases ?? 1)) * 100)
    : 0;

  const avatarColors = ['var(--teal)', 'var(--ink)', '#5b21b6', '#b45309'];

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch('/api/bids/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidId: bid.id }),
    });
    if (!res.ok) { setAccepting(false); setShowConfirm(false); return; }
    const { caseId } = await res.json();
    router.push(`/client/cases/${caseId}`);
    router.refresh();
  }

  return (
    <div style={{
      border: `1px solid ${index === 0 ? 'rgba(184,134,11,0.35)' : 'rgba(14,12,10,0.09)'}`,
      borderRadius: '12px',
      background: index === 0 ? 'rgba(184,134,11,0.02)' : 'white',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* TOP MATCH banner */}
      {index === 0 && (
        <div style={{
          position: 'absolute', top: 0, right: '16px',
          background: 'var(--gold)', color: 'white',
          fontSize: '9px', fontWeight: 700, padding: '3px 10px',
          borderRadius: '0 0 8px 8px', letterSpacing: '0.06em',
        }}>TOP MATCH</div>
      )}

      {/* Summary row — always visible */}
      <div style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
            background: avatarColors[index % avatarColors.length],
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700,
          }}>{initials}</div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                BCI Verified
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '4px' }}>
              {lawyerProfile?.primary_court} · {lawyerProfile?.experience_years} yrs exp
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <RatingStars rating={lawyerProfile?.avg_rating ?? 0} count={lawyerProfile?.review_count ?? 0} />
              <span style={{ fontSize: '11px', color: '#1A6B3A', fontWeight: 500 }}>{winRate}% win rate</span>
              <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{lawyerProfile?.total_cases} cases</span>
            </div>
          </div>

          {/* Fee + status */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 700, color: 'var(--gold)' }}>
              {formatCurrency(bid.proposed_fee)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'capitalize', marginBottom: '4px' }}>
              {bid.fee_structure ?? 'flat'} fee
            </div>
            {bid.status !== 'pending' && <StatusBadge status={bid.status} size="md" />}
          </div>
        </div>

        {/* Preview text + expand toggle */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <p style={{ flex: 1, fontSize: '13px', lineHeight: 1.6, color: 'rgba(14,12,10,0.6)', margin: 0 }}>
            {expanded
              ? ''
              : `${(bid.cover_letter || bid.strategy_text).slice(0, 160)}${(bid.cover_letter || bid.strategy_text).length > 160 ? '…' : ''}`
            }
          </p>
          <span style={{
            flexShrink: 0, fontSize: '12px', color: 'var(--gold)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            {expanded ? '▲ Show less' : '▼ View full proposal'}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(14,12,10,0.07)', padding: '20px', background: 'var(--parchment, #faf8f3)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Cover letter / Strategy */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Proposal & Strategy
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.75, color: 'rgba(14,12,10,0.75)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {bid.cover_letter || bid.strategy_text}
            </p>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {bid.estimated_timeline && (
              <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
                <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>⏱ {bid.estimated_timeline}</div>
              </div>
            )}
            {bid.availability && (
              <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
                <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>📅 {bid.availability}</div>
              </div>
            )}
            {bid.fee_structure === 'milestone' && (
              <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
                <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestones</div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>🎯 {bid.milestone_count} milestones</div>
              </div>
            )}
            <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.08)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Practice Areas</div>
              <div style={{ fontSize: '12px', color: 'var(--ink)' }}>{(lawyerProfile?.practice_areas ?? []).join(', ') || '—'}</div>
            </div>
          </div>

          {/* Relevant experience */}
          {bid.relevant_experience && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Relevant Experience
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(14,12,10,0.7)', margin: 0 }}>
                {bid.relevant_experience}
              </p>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '4px' }}>
            {briefStatus === 'open' && bid.status === 'pending' && !showConfirm && (
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  background: 'var(--teal)', color: 'white', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600,
                }}
              >
                ✓ Accept This Proposal
              </button>
            )}

            {/* Inline confirmation */}
            {showConfirm && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '12px 16px', background: 'rgba(13,115,119,0.06)',
                border: '1px solid rgba(13,115,119,0.2)', borderRadius: '8px', flex: 1,
              }}>
                <span style={{ fontSize: '13px', color: 'var(--ink)', flex: 1 }}>
                  Accept {name}'s proposal for <strong>{formatCurrency(bid.proposed_fee)}</strong>? This will close bidding and create a case.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    style={{ padding: '7px 14px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: 'rgba(14,12,10,0.6)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    style={{ padding: '7px 16px', background: 'var(--teal)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: accepting ? 0.6 : 1 }}
                  >
                    {accepting ? 'Processing…' : 'Yes, Engage Advocate'}
                  </button>
                </div>
              </div>
            )}

            {bid.status !== 'pending' && <StatusBadge status={bid.status} size="md" />}
          </div>
        </div>
      )}
    </div>
  );
}
