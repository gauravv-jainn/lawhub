'use client';

import { useState } from 'react';

interface Props {
  briefId:     string;
  briefTitle:  string;
  status:      string;
}

export default function BriefModerationActions({ briefId, briefTitle, status }: Props) {
  const [loading, setLoading]     = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showModal, setShowModal] = useState<'close' | 'reopen' | null>(null);
  const [reason, setReason]       = useState('');
  const [error, setError]         = useState('');

  async function perform(action: 'close' | 'reopen') {
    if (action === 'close' && !reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/briefs/${briefId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Action failed.');
        return;
      }
      setCurrentStatus(action === 'close' ? 'closed' : 'open');
      setShowModal(null);
      setReason('');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px' }}>
        {currentStatus !== 'closed' && (
          <button
            onClick={() => { setShowModal('close'); setReason(''); setError(''); }}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(192,57,43,0.08)', color: '#c0392b',
              border: '1px solid rgba(192,57,43,0.2)', cursor: 'pointer',
            }}
          >
            Close
          </button>
        )}
        {currentStatus === 'closed' && (
          <button
            onClick={() => { setShowModal('reopen'); setReason(''); setError(''); }}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(26,107,58,0.08)', color: '#1A6B3A',
              border: '1px solid rgba(26,107,58,0.2)', cursor: 'pointer',
            }}
          >
            Reopen
          </button>
        )}
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(null); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
          }}
        >
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px 32px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
              {showModal === 'close' ? 'Close Brief' : 'Reopen Brief'}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.55)', marginBottom: '16px' }}>
              <strong>{briefTitle}</strong>
              <br />
              {showModal === 'close'
                ? 'This will prevent new proposals from being submitted.'
                : 'This will reopen the brief for 30 more days.'}
            </p>

            {showModal === 'close' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Duplicate brief, spam, inappropriate content…"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.15)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#c0392b' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', background: 'rgba(14,12,10,0.06)', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => perform(showModal)}
                disabled={loading}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: showModal === 'close' ? '#c0392b' : '#1A6B3A',
                  color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Processing…' : showModal === 'close' ? 'Close Brief' : 'Reopen Brief'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
