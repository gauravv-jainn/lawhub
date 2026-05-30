'use client';

import { useState } from 'react';

interface BankDetails {
  account_holder_name: string;
  bank_name:           string;
  account_number:      string;
  ifsc_code:           string;
  verified:            boolean;
  verified_at:         Date | null;
}

interface Payout {
  id:             string;
  amount:         number;
  status:         string;
  utr:            string | null;
  notes:          string | null;
  initiated_at:   string | null;
  completed_at:   string | null;
  failed_at:      string | null;
  failure_reason: string | null;
  created_at:     string;
}

interface Props {
  bankDetails:  BankDetails | null;
  payouts:      Payout[];
  totalEarned:  number;
  totalPaidOut: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    '#B8860B',
  processing: '#1A5276',
  completed:  '#1A6B3A',
  failed:     '#C0392B',
};

export default function LawyerPayoutsClient({ bankDetails, payouts, totalEarned, totalPaidOut }: Props) {
  const [showBankForm, setShowBankForm] = useState(!bankDetails);
  const [bankForm, setBankForm]         = useState({
    account_holder_name: bankDetails?.account_holder_name ?? '',
    bank_name:           bankDetails?.bank_name ?? '',
    account_number:      bankDetails?.account_number ?? '',
    ifsc_code:           bankDetails?.ifsc_code ?? '',
  });
  const [saving, setSaving]   = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState('');

  async function saveBankDetails() {
    setSaving(true);
    setBankError('');
    try {
      const res  = await fetch('/api/lawyer/payout-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm),
      });
      const data = await res.json() as { error?: unknown };
      if (!res.ok) {
        setBankError(typeof data.error === 'string' ? data.error : 'Validation failed. Check all fields.');
      } else {
        setBankSaved(true);
        setShowBankForm(false);
      }
    } catch {
      setBankError('Network error. Try again.');
    }
    setSaving(false);
  }

  const pending = totalEarned - totalPaidOut;

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>
        Payouts
      </h1>
      <p style={{ color: 'rgba(14,12,10,0.5)', fontSize: '13px', marginBottom: '32px' }}>
        Your earnings history and bank account for payouts.
      </p>

      {/* Earnings Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Earned', value: totalEarned, color: '#1A6B3A' },
          { label: 'Total Paid Out', value: totalPaidOut, color: '#1A5276' },
          { label: 'Pending Payout', value: pending, color: '#B8860B' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'white',
            border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color }}>
              ₹{(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Bank Details */}
      <div style={{
        background: 'white',
        border: '1px solid rgba(14,12,10,0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Bank Account</h2>
          {bankDetails && !showBankForm && (
            <button
              onClick={() => setShowBankForm(true)}
              style={{ background: 'none', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
            >
              Update
            </button>
          )}
        </div>

        {bankDetails && !showBankForm ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div><span style={{ color: 'rgba(14,12,10,0.5)' }}>Account Holder</span><br /><strong>{bankDetails.account_holder_name}</strong></div>
              <div><span style={{ color: 'rgba(14,12,10,0.5)' }}>Bank</span><br /><strong>{bankDetails.bank_name}</strong></div>
              <div><span style={{ color: 'rgba(14,12,10,0.5)' }}>Account Number</span><br /><strong>••••{bankDetails.account_number.slice(-4)}</strong></div>
              <div><span style={{ color: 'rgba(14,12,10,0.5)' }}>IFSC</span><br /><strong>{bankDetails.ifsc_code}</strong></div>
            </div>
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: bankDetails.verified ? 'rgba(26,107,58,0.08)' : 'rgba(184,134,11,0.08)',
              color: bankDetails.verified ? '#1A6B3A' : '#B8860B',
            }}>
              {bankDetails.verified ? '✓ Verified' : '⏳ Pending verification'}
            </div>
            {bankSaved && (
              <p style={{ color: '#1A6B3A', fontSize: '12px', marginTop: '8px' }}>
                ✓ Bank details updated — pending re-verification.
              </p>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { field: 'account_holder_name', label: 'Account Holder Name', placeholder: 'Full name on bank account' },
                { field: 'bank_name',           label: 'Bank Name',           placeholder: 'e.g. HDFC Bank' },
                { field: 'account_number',      label: 'Account Number',      placeholder: '9–18 digits' },
                { field: 'ifsc_code',           label: 'IFSC Code',           placeholder: 'e.g. HDFC0001234' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={bankForm[field as keyof typeof bankForm]}
                    onChange={e => setBankForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 10px', borderRadius: '6px',
                      border: '1px solid rgba(14,12,10,0.15)',
                      fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
            {bankError && <p style={{ color: 'var(--rust)', fontSize: '12px', marginBottom: '12px' }}>{bankError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              {bankDetails && (
                <button
                  onClick={() => { setShowBankForm(false); setBankError(''); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(14,12,10,0.15)', background: 'none', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveBankDetails}
                disabled={saving}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--teal)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Bank Details'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Payout History</h2>
        {payouts.length === 0 ? (
          <p style={{ color: 'rgba(14,12,10,0.4)', fontSize: '13px' }}>No payouts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payouts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(14,12,10,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>
                    ₹{(p.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>
                    {p.completed_at
                      ? `Completed ${new Date(p.completed_at).toLocaleDateString('en-IN')}`
                      : p.initiated_at
                        ? `Initiated ${new Date(p.initiated_at).toLocaleDateString('en-IN')}`
                        : new Date(p.created_at).toLocaleDateString('en-IN')}
                    {p.utr && ` · UTR: ${p.utr}`}
                  </div>
                  {p.failure_reason && (
                    <div style={{ fontSize: '11px', color: '#C0392B', marginTop: '2px' }}>
                      {p.failure_reason}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: `${STATUS_COLORS[p.status]}18`,
                  color: STATUS_COLORS[p.status],
                }}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
