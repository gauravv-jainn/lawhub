'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface HeldPayment {
  id: string;
  milestoneNumber: number;
  amount: number;
}

interface Props {
  caseId: string;
  caseStatus: string;
  heldPayments: HeldPayment[];
}

type Panel = 'force_cancel' | 'release' | 'refund' | null;

export default function AdminCaseActions({ caseId, caseStatus, heldPayments }: Props) {
  const router = useRouter();
  const [panel, setPanel]   = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [reason, setReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(heldPayments[0]?.id ?? '');

  const isClosed = ['completed', 'cancelled'].includes(caseStatus);

  async function callCase(body: object) {
    const res = await fetch(`/api/admin/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? 'Request failed.');
    }
    return res.json();
  }

  async function doAction() {
    setLoading(true);
    setError('');
    try {
      if (panel === 'force_cancel') {
        if (!reason.trim()) { setError('Reason is required.'); return; }
        await callCase({ action: 'force_cancel', reason: reason.trim() });
      } else if (panel === 'release') {
        if (!selectedPayment) { setError('Select a payment.'); return; }
        await callCase({ action: 'release_payment', paymentId: selectedPayment, reason: reason.trim() });
      } else if (panel === 'refund') {
        if (!selectedPayment) { setError('Select a payment.'); return; }
        await callCase({ action: 'refund_payment', paymentId: selectedPayment, reason: reason.trim() });
      }
      setPanel(null);
      setReason('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function forceComplete() {
    setLoading(true);
    setError('');
    try {
      await callCase({ action: 'force_complete', reason: 'Admin override' });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(192,57,43,0.03)',
        border: '1px solid rgba(192,57,43,0.15)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'var(--rust)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        Admin Override Controls
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

      {panel === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!isClosed && (
            <>
              <button
                onClick={forceComplete}
                disabled={loading}
                style={{
                  width: '100%', padding: '9px',
                  background: 'rgba(26,107,58,0.08)',
                  color: '#1A6B3A',
                  border: '1px solid rgba(26,107,58,0.2)',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', opacity: loading ? 0.6 : 1,
                  textAlign: 'left',
                }}
              >
                Force Complete Case
              </button>
              <button
                onClick={() => { setPanel('force_cancel'); setError(''); }}
                style={{
                  width: '100%', padding: '9px',
                  background: 'rgba(192,57,43,0.06)',
                  color: 'var(--rust)',
                  border: '1px solid rgba(192,57,43,0.2)',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                Force Cancel Case
              </button>
            </>
          )}
          {heldPayments.length > 0 && (
            <>
              <button
                onClick={() => { setPanel('release'); setError(''); }}
                style={{
                  width: '100%', padding: '9px',
                  background: 'rgba(13,115,119,0.06)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(13,115,119,0.2)',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                Override: Release Payment
              </button>
              <button
                onClick={() => { setPanel('refund'); setError(''); }}
                style={{
                  width: '100%', padding: '9px',
                  background: 'rgba(184,134,11,0.06)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(184,134,11,0.2)',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                Override: Refund Payment
              </button>
            </>
          )}
        </div>
      )}

      {panel !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
            {panel.replace(/_/g, ' ')}
          </div>

          {(panel === 'release' || panel === 'refund') && heldPayments.length > 1 && (
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'block', marginBottom: '6px' }}>Select payment</label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px',
                  border: '1px solid rgba(14,12,10,0.15)',
                  borderRadius: '6px', fontSize: '13px',
                  color: 'var(--ink)', background: 'white',
                }}
              >
                {heldPayments.map((p) => (
                  <option key={p.id} value={p.id}>
                    Milestone {p.milestoneNumber} — {formatCurrency(p.amount)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'block', marginBottom: '6px' }}>
              Reason{panel === 'force_cancel' ? ' *' : ' (optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain the reason for this admin action…"
              style={{
                width: '100%', padding: '8px 10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '6px', fontSize: '13px', color: 'var(--ink)',
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={doAction}
              disabled={loading}
              style={{
                flex: 1, padding: '9px',
                background: 'var(--ink)', color: 'white',
                border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Processing…' : 'Confirm'}
            </button>
            <button
              onClick={() => { setPanel(null); setError(''); setReason(''); }}
              style={{
                padding: '9px 14px', background: 'white', color: 'rgba(14,12,10,0.5)',
                border: '1px solid rgba(14,12,10,0.12)', borderRadius: '6px',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
