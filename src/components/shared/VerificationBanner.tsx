'use client';

import { useState } from 'react';

export default function VerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setSent(true);
      } else {
        setError(data.error ?? 'Failed to send. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSending(false);
  }

  return (
    <div
      style={{
        background: 'rgba(184,134,11,0.08)',
        borderBottom: '1px solid rgba(184,134,11,0.2)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '13px',
      }}
    >
      <span style={{ color: 'rgba(14,12,10,0.7)' }}>
        ⚠️ <strong>Verify your email address</strong> to unlock all features.
        Check your inbox for the verification link.
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {error && <span style={{ color: 'var(--rust)', fontSize: '12px' }}>{error}</span>}
        {sent ? (
          <span style={{ color: '#1A6B3A', fontSize: '12px', fontWeight: 500 }}>
            ✓ Email sent — check your inbox
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={sending}
            style={{
              background: 'var(--gold)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: sending ? 'default' : 'pointer',
              opacity: sending ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {sending ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
      </div>
    </div>
  );
}
