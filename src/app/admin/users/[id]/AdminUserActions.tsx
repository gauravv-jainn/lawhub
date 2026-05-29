'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  isSuspended: boolean;
  userRole: string;
  userName: string;
}

export default function AdminUserActions({ userId, isSuspended, userRole, userName }: Props) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [reason, setReason]     = useState('');
  const [panel, setPanel]       = useState<'suspend' | 'reinstate' | null>(null);

  async function doAction(action: 'suspend' | 'reinstate') {
    if (action === 'suspend' && !reason.trim()) {
      setError('Reason is required for suspension.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? 'Action failed.');
        return;
      }
      setPanel(null);
      setReason('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: isSuspended ? 'rgba(26,107,58,0.03)' : 'rgba(192,57,43,0.03)',
        border: `1px solid ${isSuspended ? 'rgba(26,107,58,0.15)' : 'rgba(192,57,43,0.15)'}`,
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
          color: isSuspended ? '#1A6B3A' : 'var(--rust)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        Account Controls
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
        <>
          {isSuspended ? (
            <button
              onClick={() => { setPanel('reinstate'); setError(''); }}
              style={{
                width: '100%', padding: '10px',
                background: 'rgba(26,107,58,0.08)',
                color: '#1A6B3A',
                border: '1px solid rgba(26,107,58,0.2)',
                borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              ✓ Reinstate Account
            </button>
          ) : (
            <button
              onClick={() => { setPanel('suspend'); setError(''); }}
              disabled={userRole === 'admin'}
              style={{
                width: '100%', padding: '10px',
                background: 'rgba(192,57,43,0.06)',
                color: 'var(--rust)',
                border: '1px solid rgba(192,57,43,0.2)',
                borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: userRole === 'admin' ? 'not-allowed' : 'pointer',
                textAlign: 'left', opacity: userRole === 'admin' ? 0.5 : 1,
              }}
            >
              🚫 Suspend Account
            </button>
          )}
        </>
      )}

      {panel === 'suspend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Suspend {userName}
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', margin: 0, lineHeight: 1.5 }}>
            The user will be immediately blocked from logging in. All active sessions will expire.
          </p>
          <div>
            <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px' }}>
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Fraudulent activity reported by multiple users…"
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
              onClick={() => doAction('suspend')}
              disabled={loading}
              style={{
                flex: 1, padding: '9px', background: 'var(--rust)', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Suspending…' : 'Confirm Suspension'}
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

      {panel === 'reinstate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Reinstate {userName}
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', margin: 0, lineHeight: 1.5 }}>
            The user will be able to log in again immediately.
          </p>
          <div>
            <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px' }}>
              Note (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Reason for reinstatement…"
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
              onClick={() => doAction('reinstate')}
              disabled={loading}
              style={{
                flex: 1, padding: '9px', background: '#1A6B3A', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Reinstating…' : 'Confirm Reinstatement'}
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
