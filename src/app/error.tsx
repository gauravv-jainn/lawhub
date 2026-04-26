'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '12px',
        }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.5)', lineHeight: 1.65, marginBottom: '32px' }}>
          An unexpected error occurred. Please try again, or return to the home page.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              background: 'var(--gold)', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
            Try Again
          </button>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'white', color: 'var(--ink)', padding: '10px 24px',
            border: '1px solid rgba(14,12,10,0.12)', borderRadius: '8px',
            textDecoration: 'none', fontSize: '13px', fontWeight: 500,
          }}>
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
