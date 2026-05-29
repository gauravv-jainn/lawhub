'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface HeldPayment {
  id: string;
  milestoneNumber: number;
  amount: number;
}

interface Evidence {
  id: string;
  name: string;
  url: string;
  file_type: string;
  created_at: string;
  uploader: { full_name: string; role: string };
}

interface Props {
  disputeId: string;
  caseId: string;
  adminId: string;
  isAssigned: boolean;
  currentStatus: string;
  heldPayments: HeldPayment[];
  isResolved: boolean;
  evidence: Evidence[];
}

type Resolution = 'resolved_client' | 'resolved_lawyer' | 'partial_refund' | 'settled';

const RESOLUTION_OPTIONS: {
  value: Resolution;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: 'resolved_client',
    label: 'Favour Client',
    desc: 'Full refund of all held payments via Razorpay',
    color: 'var(--rust)',
  },
  {
    value: 'resolved_lawyer',
    label: 'Favour Advocate',
    desc: 'Release all held payments to advocate (minus TDS if applicable)',
    color: 'var(--teal)',
  },
  {
    value: 'partial_refund',
    label: 'Partial Refund',
    desc: 'Split held payments — specify client refund percentage below',
    color: '#8B6914',
  },
  {
    value: 'settled',
    label: 'Mutual Settlement',
    desc: 'Parties agreed — release payments to advocate',
    color: 'rgba(14,12,10,0.6)',
  },
];

export default function DisputeResolutionPanel({
  disputeId,
  caseId,
  adminId,
  isAssigned,
  currentStatus,
  heldPayments,
  isResolved,
  evidence,
}: Props) {
  const router = useRouter();
  const [loading, setLoading]         = useState<string | null>(null);
  const [error, setError]             = useState('');
  const [resolution, setResolution]   = useState<Resolution>('settled');
  const [resolutionNote, setNote]     = useState('');
  const [refundPct, setRefundPct]     = useState(50);
  const [showEvidence, setShowEvidence] = useState(false);

  async function callDispute(body: object) {
    const res = await fetch(`/api/admin/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(
        typeof d.error === 'object'
          ? JSON.stringify(d.error)
          : (d.error ?? 'Request failed.')
      );
    }
    return res.json();
  }

  async function assign() {
    setLoading('assign');
    setError('');
    try {
      await callDispute({ action: 'assign' });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function resolve() {
    if (!resolutionNote.trim()) {
      setError('Please add resolution notes before resolving.');
      return;
    }
    if (resolutionNote.trim().length < 10) {
      setError('Resolution notes must be at least 10 characters.');
      return;
    }
    setLoading('resolve');
    setError('');
    try {
      await callDispute({
        action:           'resolve',
        resolution,
        resolution_note:  resolutionNote.trim(),
        ...(resolution === 'partial_refund' ? { refund_percentage: refundPct } : {}),
      });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  // Preview amounts for partial refund
  const totalHeld     = heldPayments.reduce((s, p) => s + p.amount, 0);
  const clientGets    = Math.round(totalHeld * (refundPct / 100));
  const lawyerGets    = totalHeld - clientGets;

  if (isResolved) {
    return (
      <div
        style={{
          background: 'rgba(26,107,58,0.04)',
          border: '1px solid rgba(26,107,58,0.2)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A6B3A', marginBottom: '4px' }}>
          ✓ Dispute Resolved
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', textTransform: 'capitalize' }}>
          Outcome: {currentStatus.replace(/_/g, ' ')}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(14,12,10,0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(14,12,10,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        Admin Resolution
      </div>

      {error && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--rust)',
          }}
        >
          {error}
        </div>
      )}

      {/* Evidence toggle */}
      {evidence.length > 0 && (
        <div>
          <button
            onClick={() => setShowEvidence((v) => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'rgba(14,12,10,0.5)', padding: 0,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <span>{showEvidence ? '▾' : '▸'}</span>
            <span>{evidence.length} Evidence File{evidence.length !== 1 ? 's' : ''}</span>
          </button>

          {showEvidence && (
            <div
              style={{
                marginTop: '8px',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {evidence.map((ev, i) => (
                <div
                  key={ev.id}
                  style={{
                    padding: '9px 12px',
                    borderBottom: i < evidence.length - 1 ? '1px solid rgba(14,12,10,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: i % 2 === 0 ? 'white' : 'var(--cream)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                      {ev.uploader.full_name}{' '}
                      <span style={{ textTransform: 'capitalize' }}>({ev.uploader.role})</span>
                    </div>
                  </div>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      color: 'var(--teal)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign to self */}
      {!isAssigned && currentStatus === 'open' && (
        <button
          onClick={assign}
          disabled={loading === 'assign'}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--teal)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading === 'assign' ? 0.6 : 1,
          }}
        >
          {loading === 'assign' ? 'Assigning…' : 'Assign to Myself'}
        </button>
      )}

      {isAssigned && (
        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
          ✓ Assigned to you
        </div>
      )}

      {/* Resolution form — show once assigned or already under review */}
      {(isAssigned || currentStatus === 'under_review') && (
        <>
          {heldPayments.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.45)', marginBottom: '8px' }}>
                Payments in escrow:
              </div>
              {heldPayments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    fontSize: '12px',
                    color: 'rgba(14,12,10,0.55)',
                    padding: '4px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Milestone {p.milestoneNumber}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Outcome selector */}
          <div>
            <label
              style={{
                fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px',
              }}
            >
              Outcome
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {RESOLUTION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${resolution === opt.value ? 'rgba(14,12,10,0.2)' : 'rgba(14,12,10,0.08)'}`,
                    background: resolution === opt.value ? 'var(--cream)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value={opt.value}
                    checked={resolution === opt.value}
                    onChange={() => setResolution(opt.value)}
                    style={{ marginTop: '2px', accentColor: 'var(--ink)' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: opt.color }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Partial refund percentage input */}
          {resolution === 'partial_refund' && (
            <div
              style={{
                padding: '14px',
                background: 'rgba(139,105,20,0.05)',
                border: '1px solid rgba(139,105,20,0.2)',
                borderRadius: '8px',
              }}
            >
              <label
                style={{
                  fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  display: 'flex', justifyContent: 'space-between', marginBottom: '10px',
                }}
              >
                <span>Client Refund %</span>
                <span style={{ color: 'var(--ink)', fontSize: '13px' }}>{refundPct}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={refundPct}
                onChange={(e) => setRefundPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ink)', marginBottom: '10px' }}
              />
              {totalHeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: 'rgba(14,12,10,0.4)' }}>Client refund</div>
                    <div style={{ fontWeight: 700, color: 'var(--rust)' }}>{formatCurrency(clientGets)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'rgba(14,12,10,0.4)' }}>Advocate receives</div>
                    <div style={{ fontWeight: 700, color: 'var(--teal)' }}>{formatCurrency(lawyerGets)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution notes */}
          <div>
            <label
              style={{
                fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px',
              }}
            >
              Resolution Notes *
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the resolution decision. This message is sent to both parties."
              rows={4}
              style={{
                width: '100%', padding: '8px 10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '3px' }}>
              {resolutionNote.length}/10 characters minimum
            </div>
          </div>

          <button
            onClick={resolve}
            disabled={loading === 'resolve'}
            style={{
              width: '100%', padding: '11px',
              background: 'var(--ink)', color: 'white',
              border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600,
              cursor: loading === 'resolve' ? 'not-allowed' : 'pointer',
              opacity: loading === 'resolve' ? 0.6 : 1,
            }}
          >
            {loading === 'resolve' ? 'Resolving…' : 'Resolve Dispute'}
          </button>
        </>
      )}
    </div>
  );
}
