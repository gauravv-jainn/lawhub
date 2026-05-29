'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  caseId: string;
  caseStatus: string;
  userRole: 'client' | 'lawyer';
  canApproveCompletion: boolean;
  canRaiseDispute: boolean;
  disputeActive: boolean;
}

type Panel = 'dispute' | 'cancel' | null;

export default function CaseActions({
  caseId,
  caseStatus,
  userRole,
  canApproveCompletion,
  canRaiseDispute,
  disputeActive,
}: Props) {
  const router             = useRouter();
  const [panel, setPanel]  = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState('');

  // Dispute form state
  const [disputeReason, setDisputeReason]           = useState('quality_issue');
  const [disputeDescription, setDisputeDescription] = useState('');

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  const isClosed = ['completed', 'cancelled', 'disputed'].includes(caseStatus);

  async function approveCompletion() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_completion' }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to approve completion.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function raiseDispute() {
    if (!disputeDescription.trim()) {
      setError('Please describe the issue in detail.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: disputeReason,
          description: disputeDescription.trim(),
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to raise dispute.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function cancelCase() {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/cases/${caseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to cancel case.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Nothing to show if case is closed and no special state
  if (isClosed && !canApproveCompletion) return null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(14,12,10,0.08)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(14,12,10,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '2px',
        }}
      >
        Case Actions
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--rust)',
          }}
        >
          {error}
        </div>
      )}

      {/* Approve case completion */}
      {canApproveCompletion && panel === null && (
        <div
          style={{
            padding: '14px',
            background: 'rgba(26,107,58,0.04)',
            border: '1px solid rgba(26,107,58,0.2)',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Your advocate has marked this case complete. Approving will close the case and allow any
            remaining approved payments to be released.
          </p>
          <button
            onClick={approveCompletion}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1A6B3A',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Confirming…' : '✓ Confirm Case Completion'}
          </button>
        </div>
      )}

      {/* Main action buttons */}
      {panel === null && !isClosed && (
        <>
          {canRaiseDispute && !disputeActive && (
            <button
              onClick={() => { setPanel('dispute'); setError(''); }}
              style={{
                width: '100%',
                padding: '9px',
                background: 'white',
                color: 'var(--rust)',
                border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              ⚠ Raise a Formal Dispute
            </button>
          )}

          {!disputeActive && (
            <button
              onClick={() => { setPanel('cancel'); setError(''); }}
              style={{
                width: '100%',
                padding: '9px',
                background: 'white',
                color: 'rgba(14,12,10,0.5)',
                border: '1px solid rgba(14,12,10,0.12)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Cancel Case
            </button>
          )}
        </>
      )}

      {/* Dispute panel */}
      {panel === 'dispute' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--rust)',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(192,57,43,0.12)',
            }}
          >
            Raise a Formal Dispute
          </div>

          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Reason
            </label>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--ink)',
                background: 'white',
              }}
            >
              <option value="quality_issue">Work quality not acceptable</option>
              <option value="non_delivery">Deliverables not submitted</option>
              <option value="misconduct">Professional misconduct</option>
              <option value="overcharge">Disputed billing / overcharge</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Describe the issue *
            </label>
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              placeholder="Please describe what went wrong in detail. Include dates, what was agreed, and what actually happened."
              rows={4}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--ink)',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', margin: 0, lineHeight: 1.5 }}>
            ⚠ Raising a dispute will freeze all payments on this case until our team reviews and resolves it.
            This is a formal process — please use it only if you cannot resolve the issue directly with your advocate.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={raiseDispute}
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px',
                background: 'var(--rust)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Submitting…' : 'Submit Dispute'}
            </button>
            <button
              onClick={() => { setPanel(null); setError(''); }}
              style={{
                padding: '9px 16px',
                background: 'white',
                color: 'rgba(14,12,10,0.5)',
                border: '1px solid rgba(14,12,10,0.12)',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel case panel */}
      {panel === 'cancel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(14,12,10,0.08)',
            }}
          >
            Cancel This Case
          </div>

          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Reason for cancellation *
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please explain why you are cancelling this case."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--ink)',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', margin: 0, lineHeight: 1.5 }}>
            Cancellation is permanent. Any payments currently held in escrow will be flagged for
            refund and reviewed by our team.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={cancelCase}
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px',
                background: 'rgba(14,12,10,0.07)',
                color: 'var(--ink)',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
            <button
              onClick={() => { setPanel(null); setError(''); }}
              style={{
                padding: '9px 16px',
                background: 'white',
                color: 'rgba(14,12,10,0.5)',
                border: '1px solid rgba(14,12,10,0.12)',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
