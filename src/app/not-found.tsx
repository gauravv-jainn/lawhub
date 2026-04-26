import Link from 'next/link';

export default function NotFound() {
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
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '96px',
          fontWeight: 700,
          color: 'rgba(184,134,11,0.15)',
          lineHeight: 1,
          marginBottom: '8px',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '12px',
        }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.5)', lineHeight: 1.65, marginBottom: '32px' }}>
          The page you are looking for may have been moved, deleted, or may never have existed.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--gold)', color: 'white', padding: '10px 24px',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
          }}>
            ← Back to Home
          </Link>
          <Link href="/auth/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'white', color: 'var(--ink)', padding: '10px 24px',
            border: '1px solid rgba(14,12,10,0.12)', borderRadius: '8px',
            textDecoration: 'none', fontSize: '13px', fontWeight: 500,
          }}>
            Sign In
          </Link>
        </div>
        <div style={{ marginTop: '48px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '13px' }}>L</span>
              </div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                LawHub
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
