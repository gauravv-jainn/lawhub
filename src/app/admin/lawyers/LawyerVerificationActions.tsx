'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LawyerVerificationActions({ lawyerId }: { lawyerId: string }) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setLoading(true);
    await fetch('/api/admin/verify-lawyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyerId, action: 'approve' }),
    });
    router.refresh();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setLoading(true);
    await fetch('/api/admin/verify-lawyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lawyerId, action: 'reject', reason: rejectionReason }),
    });
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      {!showRejectForm ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleApprove} disabled={loading}
            style={{ background: '#1A6B3A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            ✓ Approve
          </button>
          <button onClick={() => setShowRejectForm(true)} disabled={loading}
            style={{ background: 'var(--rust)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            ✗ Reject
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '240px' }}>
          <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            rows={2}
            style={{ padding: '8px', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '6px', fontSize: '12px', resize: 'none', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleReject} disabled={loading || !rejectionReason.trim()}
              style={{ flex: 1, background: 'var(--rust)', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
              Confirm Reject
            </button>
            <button onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
              style={{ padding: '8px', background: 'none', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
