'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type SetupStep = 'loading' | 'qr' | 'confirm' | 'codes' | 'error';

export default function Admin2FASetupPage() {
  const { update } = useSession();
  const router = useRouter();

  const [step, setStep]               = useState<SetupStep>('loading');
  const [secret, setSecret]           = useState('');
  const [uri, setUri]                 = useState('');
  const [totpInput, setTotpInput]     = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    fetch('/api/admin/2fa/setup')
      .then(r => r.json())
      .then((data: { secret?: string; uri?: string; error?: string }) => {
        if (data.error) {
          if (data.error.includes('already')) {
            router.replace('/admin/2fa/verify');
          } else {
            setError(data.error);
            setStep('error');
          }
        } else {
          setSecret(data.secret ?? '');
          setUri(data.uri ?? '');
          setStep('qr');
        }
      })
      .catch(() => {
        setError('Failed to load setup. Refresh and try again.');
        setStep('error');
      });
  }, [router]);

  async function confirmCode() {
    if (!/^\d{6}$/.test(totpInput)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpInput }),
      });
      const data = await res.json() as { recoveryCodes?: string[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Verification failed.');
      } else {
        setRecoveryCodes(data.recoveryCodes ?? []);
        await update(); // refresh JWT so twoFactorVerified becomes true
        setStep('codes');
      }
    } catch {
      setError('Network error. Try again.');
    }
    setSubmitting(false);
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (step === 'loading') {
    return <PageShell><p style={{ color: 'rgba(14,12,10,0.5)', fontSize: '14px' }}>Loading setup…</p></PageShell>;
  }

  if (step === 'error') {
    return (
      <PageShell>
        <p style={{ color: 'var(--rust)', fontSize: '14px' }}>{error}</p>
      </PageShell>
    );
  }

  if (step === 'codes') {
    return (
      <PageShell>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
          2FA Enabled
        </h1>
        <p style={{ color: 'rgba(14,12,10,0.6)', fontSize: '13px', marginBottom: '24px' }}>
          Save these recovery codes somewhere safe. Each code can only be used once.
          If you lose access to your authenticator, these codes are your only way in.
        </p>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px 20px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#f0f0f0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '24px',
        }}>
          {recoveryCodes.map(code => (
            <span key={code}>{code}</span>
          ))}
        </div>
        <button
          onClick={() => router.replace('/admin/dashboard')}
          style={{
            background: 'var(--teal)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to Dashboard
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
        Set Up Two-Factor Authentication
      </h1>
      <p style={{ color: 'rgba(14,12,10,0.6)', fontSize: '13px', marginBottom: '24px', maxWidth: '380px', textAlign: 'center' }}>
        Admin accounts require 2FA. Open Google Authenticator, Authy, or any TOTP app and add your account.
      </p>

      {step === 'qr' && (
        <>
          <div style={{ marginBottom: '20px', textAlign: 'left', width: '100%', maxWidth: '420px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Option 1 — Open in authenticator app
            </p>
            <a
              href={uri}
              style={{
                display: 'block',
                background: 'var(--teal)',
                color: 'white',
                borderRadius: '8px',
                padding: '10px 16px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Open Authenticator App
            </a>
          </div>

          <div style={{ marginBottom: '24px', textAlign: 'left', width: '100%', maxWidth: '420px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Option 2 — Enter secret manually
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{
                flex: 1,
                background: 'rgba(14,12,10,0.05)',
                border: '1px solid rgba(14,12,10,0.1)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '13px',
                letterSpacing: '0.05em',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}>
                {secret}
              </code>
              <button
                onClick={copySecret}
                style={{
                  background: copied ? '#1A6B3A' : 'rgba(14,12,10,0.08)',
                  color: copied ? 'white' : 'rgba(14,12,10,0.7)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '6px' }}>
              In your app: Add account → Enter setup key → paste the secret above.
              Account type: Time-based (TOTP), SHA1, 6 digits, 30s interval.
            </p>
          </div>

          <button
            onClick={() => { setStep('confirm'); setError(''); }}
            style={{
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            I've added the account →
          </button>
        </>
      )}

      {step === 'confirm' && (
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.6)', marginBottom: '16px', textAlign: 'center' }}>
            Enter the 6-digit code shown in your authenticator app to confirm setup.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={totpInput}
            onChange={e => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(14,12,10,0.2)',
              fontSize: '24px',
              letterSpacing: '0.3em',
              textAlign: 'center',
              fontFamily: 'monospace',
              marginBottom: '12px',
            }}
          />
          {error && (
            <p style={{ color: 'var(--rust)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setStep('qr'); setError(''); setTotpInput(''); }}
              style={{
                flex: 1,
                background: 'rgba(14,12,10,0.06)',
                color: 'rgba(14,12,10,0.7)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
            <button
              onClick={confirmCode}
              disabled={submitting || totpInput.length !== 6}
              style={{
                flex: 2,
                background: 'var(--teal)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Verifying…' : 'Confirm & Enable 2FA'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
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
        maxWidth: '500px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}
