'use client';

import { useState } from 'react';

interface Bank {
  account_holder_name: string;
  bank_name:           string;
  account_number:      string;
  ifsc_code:           string;
  verified:            boolean;
}

interface Payout {
  id:             string;
  amount:         number;
  status:         string;
  utr:            string | null;
  notes:          string | null;
  failure_reason: string | null;
  initiated_at:   string | null;
  completed_at:   string | null;
  failed_at:      string | null;
  created_at:     string;
  lawyer: {
    id:        string;
    full_name: string;
    email:     string;
    bank:      Bank | null;
  };
}

interface PendingBank {
  lawyer_id:           string;
  account_holder_name: string;
  bank_name:           string;
  account_number:      string;
  ifsc_code:           string;
  lawyer:              { id: string; full_name: string; email: string };
}

interface Props {
  payouts:             Payout[];
  pendingBankDetails:  PendingBank[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#B8860B',
  processing: '#1A5276',
  completed:  '#1A6B3A',
  failed:     '#C0392B',
};

export default function AdminPayoutsClient({ payouts: initialPayouts, pendingBankDetails }: Props) {
  const [payouts, setPayouts]     = useState(initialPayouts);
  const [banks, setBanks]         = useState(pendingBankDetails);
  const [activePayoutId, setActivePayoutId] = useState<string | null>(null);
  const [utrInput, setUtrInput]   = useState('');
  const [failReason, setFailReason] = useState('');
  const [working, setWorking]     = useState(false);
  const [error, setError]         = useState('');

  async function updatePayout(id: string, body: Record<string, unknown>) {
    setWorking(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed');
      } else {
        setPayouts(prev => prev.map(p => {
          if (p.id !== id) return p;
          const now = new Date().toISOString();
          if (body.action === 'complete') return { ...p, status: 'completed', utr: body.utr as string, completed_at: now };
          if (body.action === 'fail')    return { ...p, status: 'failed', failure_reason: body.failure_reason as string, failed_at: now };
          if (body.action === 'retry')   return { ...p, status: 'pending', failure_reason: null, failed_at: null };
          return p;
        }));
        setActivePayoutId(null);
        setUtrInput('');
        setFailReason('');
      }
    } catch {
      setError('Network error');
    }
    setWorking(false);
  }

  async function verifyBank(lawyerId: string, action: 'verify' | 'reject') {
    setWorking(true);
    try {
      await fetch(`/api/admin/payout-bank/${lawyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setBanks(prev => prev.filter(b => b.lawyer_id !== lawyerId));
    } catch {
      // silently handled
    }
    setWorking(false);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 600, marginBottom: '32px' }}>
        Payout Management
      </h1>

      {/* Pending Bank Verifications */}
      {banks.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            Bank Details Pending Verification ({banks.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {banks.map(b => (
              <div key={b.lawyer_id} style={{
                background: 'white', border: '1px solid rgba(184,134,11,0.3)',
                borderRadius: '10px', padding: '16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{b.lawyer.full_name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)' }}>{b.lawyer.email}</div>
                  <div style={{ fontSize: '12px', marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    <span><strong>Bank:</strong> {b.bank_name}</span>
                    <span><strong>IFSC:</strong> {b.ifsc_code}</span>
                    <span><strong>Account:</strong> ••••{b.account_number.slice(-4)}</span>
                    <span><strong>Holder:</strong> {b.account_holder_name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => void verifyBank(b.lawyer_id, 'reject')}
                    disabled={working}
                    style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #C0392B', background: 'none', color: '#C0392B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void verifyBank(b.lawyer_id, 'verify')}
                    disabled={working}
                    style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#1A6B3A', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout List */}
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Payouts</h2>
      {error && <p style={{ color: '#C0392B', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

      {payouts.length === 0 ? (
        <p style={{ color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>No payouts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payouts.map(p => (
            <div key={p.id} style={{
              background: 'white',
              border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>
                    {p.lawyer.full_name} — ₹{(p.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '2px' }}>
                    {p.lawyer.email} · {new Date(p.created_at).toLocaleDateString('en-IN')}
                    {p.utr && ` · UTR: ${p.utr}`}
                  </div>
                  {p.failure_reason && (
                    <div style={{ fontSize: '12px', color: '#C0392B', marginTop: '4px' }}>✗ {p.failure_reason}</div>
                  )}
                  {p.lawyer.bank && (
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '4px' }}>
                      {p.lawyer.bank.bank_name} · IFSC: {p.lawyer.bank.ifsc_code} · ••••{p.lawyer.bank.account_number.slice(-4)}
                      {' '}{p.lawyer.bank.verified ? '✓' : '⚠️ unverified'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: `${STATUS_COLORS[p.status]}18`,
                    color: STATUS_COLORS[p.status],
                  }}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                  {p.status === 'pending' && (
                    <button
                      onClick={() => setActivePayoutId(p.id === activePayoutId ? null : p.id)}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(14,12,10,0.15)', background: 'none', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Actions
                    </button>
                  )}
                  {p.status === 'failed' && (
                    <button
                      onClick={() => void updatePayout(p.id, { action: 'retry' })}
                      disabled={working}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#1A5276', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {/* Inline action panel */}
              {activePayoutId === p.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(14,12,10,0.06)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', marginBottom: '4px' }}>UTR Number</label>
                    <input
                      type="text"
                      value={utrInput}
                      onChange={e => setUtrInput(e.target.value)}
                      placeholder="e.g. HDFC0012345678"
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid rgba(14,12,10,0.15)', fontSize: '13px', width: '200px' }}
                    />
                  </div>
                  <button
                    onClick={() => void updatePayout(p.id, { action: 'complete', utr: utrInput })}
                    disabled={working || !utrInput.trim()}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1A6B3A', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark Completed
                  </button>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', marginBottom: '4px' }}>Failure Reason</label>
                    <input
                      type="text"
                      value={failReason}
                      onChange={e => setFailReason(e.target.value)}
                      placeholder="e.g. Incorrect IFSC"
                      style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid rgba(14,12,10,0.15)', fontSize: '13px', width: '200px' }}
                    />
                  </div>
                  <button
                    onClick={() => void updatePayout(p.id, { action: 'fail', failure_reason: failReason })}
                    disabled={working || !failReason.trim()}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#C0392B', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark Failed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
