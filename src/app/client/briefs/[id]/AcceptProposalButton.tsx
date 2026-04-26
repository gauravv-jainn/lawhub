'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptProposalButton({ briefId, bidId }: { briefId: string; bidId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!confirm('Accept this proposal? This will engage the advocate and close bidding on your brief.')) return;
    setLoading(true);

    const res = await fetch('/api/bids/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidId }),
    });

    if (!res.ok) {
      setLoading(false);
      alert('Failed to accept proposal. Please try again.');
      return;
    }

    const { caseId } = await res.json();
    router.push(`/client/cases/${caseId}`);
    router.refresh();
  };

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      style={{
        background: 'var(--teal)',
        color: 'white',
        border: 'none',
        padding: '9px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Processing…' : '✓ Accept Proposal'}
    </button>
  );
}
