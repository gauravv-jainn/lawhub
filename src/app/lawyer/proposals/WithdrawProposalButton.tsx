'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawProposalButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function withdraw() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/withdraw`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to withdraw proposal.');
        setConfirm(false);
      }
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <span style={{ fontSize: '11px', color: 'var(--rust)' }}>{error}</span>
    );
  }

  if (confirm) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          onClick={withdraw}
          disabled={loading}
          style={{
            padding: '5px 10px', background: 'var(--rust)', color: 'white',
            border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          style={{
            padding: '5px 8px', background: 'white', color: 'rgba(14,12,10,0.45)',
            border: '1px solid rgba(14,12,10,0.12)', borderRadius: '5px',
            fontSize: '11px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      style={{
        padding: '5px 10px', background: 'white', color: 'rgba(14,12,10,0.4)',
        border: '1px solid rgba(14,12,10,0.12)', borderRadius: '5px',
        fontSize: '11px', cursor: 'pointer',
      }}
    >
      Withdraw
    </button>
  );
}
