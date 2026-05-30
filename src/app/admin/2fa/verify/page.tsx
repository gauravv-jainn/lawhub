'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Admin2FAVerifyPage() {
  const { update } = useSession();
  const router = useRouter();

  const [mode, setMode]           = useState<'totp' | 'recovery'>('totp');
  const [input, setInput]         = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function verify() {
    setError('');
    if (mode === 'totp' && !/^\d{6}$/.test(input)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (mode === 'recovery' && input.trim().length < 8) {
      setError('Enter a valid recovery code.');
      return;
    }

    setSubmitting(true);
    try {
      const body = mode === 'totp'
        ? { token: input }
        : { recoveryCode: input.trim().toUpperCase() };

      const res  = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string; codesRemaining?: number };

      if (!res.ok) {
        setError(data.error ?? 'Verification failed.');
      } else {
        await update(); // triggers JWT callback → sets twoFactorVerified: true
        router.replace('/admin/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSubmitting(false);
  }

  function switchMode() {
    setMode(m => m === 'totp' ? 'recovery' : 'totp');
    setInput('');
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid rgba(14,12,10,0.1)',
        padding: '40px',
        maxWidth: '380px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
          Two-Factor Authentication
        </h1>
        <p style={{ color: 'rgba(14,12,10,0.6)', fontSize: '13px', marginBottom: '28px', textAlign: 'center' }}>
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Enter one of your saved recovery codes.'}
        </p>

        <input
          key={mode}
          type={mode === 'totp' ? 'text' : 'text'}
          inputMode={mode === 'totp' ? 'numeric' : 'text'}
          pattern={mode === 'totp' ? '\\d{6}' : undefined}
          maxLength={mode === 'totp' ? 6 : 20}
          value={input}
          onChange={e => {
            const v = mode === 'totp'
              ? e.target.value.replace(/\D/g, '').slice(0, 6)
              : e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
            setInput(v);
          }}
          onKeyDown={e => { if (e.key === 'Enter') void verify(); }}
          placeholder={mode === 'totp' ? '000000' : 'XXXXXXXX'}
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px',
            borderRadius: '8px',
            border: error ? '1px solid var(--rust)' : '1px solid rgba(14,12,10,0.2)',
            fontSize: mode === 'totp' ? '28px' : '18px',
            letterSpacing: mode === 'totp' ? '0.35em' : '0.1em',
            textAlign: 'center',
            fontFamily: 'monospace',
            marginBottom: '12px',
            outline: 'none',
          }}
        />

        {error && (
          <p style={{ color: 'var(--rust)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>
        )}

        <button
          onClick={verify}
          disabled={submitting || (mode === 'totp' ? input.length !== 6 : input.length < 8)}
          style={{
            width: '100%',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            marginBottom: '16px',
          }}
        >
          {submitting ? 'Verifying…' : 'Verify'}
        </button>

        <button
          onClick={switchMode}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(14,12,10,0.5)',
            fontSize: '12px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {mode === 'totp' ? 'Use a recovery code instead' : 'Use authenticator app instead'}
        </button>
      </div>
    </div>
  );
}
