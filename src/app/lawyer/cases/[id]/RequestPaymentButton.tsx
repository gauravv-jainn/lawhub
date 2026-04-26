'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface Props {
  caseId: string;
  nextMilestone: number;
  totalFee: number;
  milestoneCount: number;
}

export default function RequestPaymentButton({ caseId, nextMilestone, totalFee, milestoneCount }: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const milestoneAmount = Math.round(totalFee / milestoneCount);
  const platformFee = Math.round(milestoneAmount * 0.1);
  const netAmount = milestoneAmount - platformFee;

  const handleRequest = async () => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/payments/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, nextMilestone, milestoneAmount, platformFee, netAmount }),
    });

    setLoading(false);
    if (res.ok) {
      setShowConfirm(false);
      router.refresh();
    } else {
      setError('Failed to request payment. Please try again.');
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          background: 'var(--gold)', color: 'white', border: 'none',
          padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600,
        }}
      >
        Request Milestone {nextMilestone} Payment
      </button>
    );
  }

  return (
    <div style={{
      padding: '16px', background: 'rgba(184,134,11,0.06)',
      border: '1px solid rgba(184,134,11,0.25)', borderRadius: '10px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
        Request payment for Milestone {nextMilestone}?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Milestone Amount', value: formatCurrency(milestoneAmount) },
          { label: 'Platform Fee (10%)', value: formatCurrency(platformFee) },
          { label: 'Your Net', value: formatCurrency(netAmount) },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '8px 10px', background: 'white', borderRadius: '6px', border: '1px solid rgba(14,12,10,0.07)' }}>
            <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)', marginBottom: '3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)' }}>
        The client will be notified and asked to release this payment from escrow.
      </div>
      {error && <div style={{ fontSize: '12px', color: 'var(--rust)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setShowConfirm(false)}
          style={{ padding: '8px 14px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: 'rgba(14,12,10,0.6)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleRequest}
          disabled={loading}
          style={{ padding: '8px 18px', background: 'var(--gold)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Requesting…' : 'Yes, Request Payment'}
        </button>
      </div>
    </div>
  );
}
