export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Post Your Brief',
      desc: 'Describe your legal matter in plain language. Our AI structures it into a professional brief visible to verified advocates.',
    },
    {
      num: '02',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Advocates Bid',
      desc: 'Verified advocates review your matter and submit competitive proposals with their strategy, fee, and timeline — within hours.',
    },
    {
      num: '03',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <polyline points="20 6 9 17 4 12" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Choose & Engage',
      desc: 'Compare proposals side-by-side. View ratings, win rates, and fee structures. Engage your chosen advocate securely through the platform.',
    },
  ];

  return (
    <section style={{ background: 'var(--parchment)', padding: '96px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '16px',
          }}>
            How LawHub Works
          </span>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.15,
          }}>
            Your legal matter, resolved in three steps
          </h2>
        </div>

        {/* Step cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '28px',
        }}>
          {steps.map((step) => (
            <div key={step.num}
              className="card-hover"
              style={{
                background: 'var(--cream)',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '16px',
                padding: '36px 32px',
                position: 'relative',
                overflow: 'hidden',
              }}>
              {/* Gold top accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '32px',
                right: '32px',
                height: '3px',
                background: 'var(--gold)',
                borderRadius: '0 0 4px 4px',
              }} />

              {/* Step number */}
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '56px',
                fontWeight: 700,
                color: 'rgba(184,134,11,0.15)',
                lineHeight: 1,
                marginBottom: '20px',
              }}>
                {step.num}
              </div>

              {/* Icon */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(184,134,11,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                {step.icon}
              </div>

              <h3 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '12px',
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'rgba(14,12,10,0.55)',
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
