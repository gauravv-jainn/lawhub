'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function ReleasePaymentButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRelease = async () => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/payments/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    });

    setLoading(false);
    if (res.ok) {
      setShowConfirm(false);
      router.refresh();
    } else {
      setError('Failed to release payment. Please try again.');
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          background: 'var(--law-green, #1A6B3A)',
          color: 'white', border: 'none', padding: '8px 16px',
          borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
        }}
      >
        Release Payment
      </button>
    );
  }

  return (
    <div style={{
      marginTop: '12px',
      padding: '14px', background: 'rgba(26,107,58,0.06)',
      border: '1px solid rgba(26,107,58,0.2)', borderRadius: '8px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
        Release {formatCurrency(amount)} to your advocate?
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.5 }}>
        This will transfer the held funds to your advocate. This action <strong>cannot be undone</strong>.
      </div>
      {error && <div style={{ fontSize: '12px', color: 'var(--rust)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setShowConfirm(false)}
          style={{ padding: '7px 14px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: 'rgba(14,12,10,0.6)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleRelease}
          disabled={loading}
          style={{ padding: '7px 16px', background: '#1A6B3A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Processing…' : 'Yes, Release Funds'}
        </button>
      </div>
    </div>
  );
}
