'use client';

const links = {
  Platform: [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Clients', href: '#for-clients' },
    { label: 'For Advocates', href: '#for-lawyers' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Find an Advocate', href: '/client/find-lawyers' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Refund Policy', href: '/legal/refunds' },
    { label: 'Disclaimer', href: '/legal/disclaimer' },
  ],
  Company: [
    { label: 'About LawHub', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Admin Login', href: '/auth/login' },
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: 'var(--ink-2)', color: 'var(--parchment)', padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '48px',
          marginBottom: '56px',
        }} className="footer-grid">
          {/* Brand col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '18px' }}>L</span>
              </div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--parchment)' }}>
                LawHub
              </span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'rgba(245,240,232,0.5)', maxWidth: '260px', marginBottom: '20px' }}>
              India&apos;s first competitive legal marketplace. Post a brief, compare verified advocates, engage with confidence.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['Twitter/X', 'LinkedIn', 'WhatsApp'].map(s => (
                <a key={s} href="#" style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'rgba(245,240,232,0.5)', textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}>
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([col, items]) => (
            <div key={col}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.35)',
                marginBottom: '16px',
              }}>
                {col}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map(link => (
                  <li key={link.label}>
                    <a href={link.href} style={{
                      fontSize: '13px',
                      color: 'rgba(245,240,232,0.55)',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,240,232,0.55)')}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>
            © {new Date().getFullYear()} LawHub Technologies Pvt. Ltd. · CIN: U74999MH2025PTC000001
          </div>
          <div style={{
            fontSize: '11px',
            color: 'rgba(245,240,232,0.25)',
            maxWidth: '480px',
            textAlign: 'right',
            lineHeight: 1.6,
          }}>
            Not a law firm. LawHub facilitates discovery between clients and independent advocates only.
            Nothing on this platform constitutes legal advice.
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 36px !important; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
