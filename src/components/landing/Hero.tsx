'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section
      style={{
        background: '#0E0C0A',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Grid pattern overlay */}
      <div
        className="pattern-grid"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(184,134,11,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 24px 100px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
        }}
        className="hero-grid"
      >
        {/* Left: Text content */}
        <div>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(184,134,11,0.15)',
              border: '1px solid rgba(184,134,11,0.3)',
              borderRadius: '100px',
              padding: '6px 16px',
              marginBottom: '28px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#B8860B',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#D4A017',
                fontWeight: 500,
                letterSpacing: '0.04em',
              }}
            >
              India&apos;s Legal Marketplace
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(40px, 5vw, 64px)',
              fontWeight: 600,
              lineHeight: 1.1,
              color: '#FAF8F3',
              marginBottom: '24px',
              letterSpacing: '-0.01em',
            }}
          >
            Find the right lawyer.{' '}
            <span
              style={{
                color: '#D4A017',
                fontStyle: 'italic',
              }}
            >
              Not just any
            </span>{' '}
            lawyer.
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '18px',
              lineHeight: 1.65,
              color: 'rgba(250,248,243,0.65)',
              marginBottom: '40px',
              maxWidth: '480px',
            }}
          >
            Post your legal matter. Verified advocates bid competitively.
            You compare credentials, win rates, and fees — then choose with confidence.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '52px' }}>
            <Link
              href="/intake"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#B8860B',
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '15px',
                padding: '14px 28px',
                borderRadius: '8px',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#9a710a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#B8860B')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Post a Legal Brief
            </Link>
            <Link
              href="/auth/register?role=lawyer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                color: '#FAF8F3',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: '15px',
                padding: '14px 28px',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '1px solid rgba(250,248,243,0.25)',
                letterSpacing: '0.01em',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(250,248,243,0.55)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(250,248,243,0.25)';
              }}
            >
              I&apos;m a Lawyer — Find Cases
            </Link>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '0',
              flexWrap: 'wrap',
              alignItems: 'center',
              paddingTop: '28px',
              borderTop: '1px solid rgba(250,248,243,0.1)',
            }}
          >
            {[
              { value: '14,800+', label: 'Verified Advocates' },
              { value: '₹42Cr+', label: 'Fees Facilitated' },
              { value: '98%', label: 'Satisfaction' },
            ].map((stat, i) => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                {i > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'rgba(184,134,11,0.5)',
                      margin: '0 20px',
                    }}
                  />
                )}
                <div>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '22px',
                      fontWeight: 600,
                      color: '#D4A017',
                    }}
                  >
                    {stat.value}
                  </span>{' '}
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: 'rgba(250,248,243,0.5)',
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Floating cards */}
        <div
          style={{
            position: 'relative',
            height: '480px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Brief card — top left */}
          <div
            className="animate-float"
            style={{
              position: 'absolute',
              top: '20px',
              left: '0',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px 22px',
              width: '240px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(184,134,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="#B8860B" strokeWidth="1.5"/>
                  <path d="M5 6h6M5 9h4" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>New Brief</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FAF8F3', fontFamily: "'DM Sans', sans-serif" }}>Property Dispute</div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, marginBottom: '12px' }}>
              Delhi High Court · Civil Division<br/>Budget: ₹25,000–50,000
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(13,115,119,0.25)', color: '#4ecdc4', fontFamily: "'DM Sans', sans-serif" }}>Property</span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(184,134,11,0.2)', color: '#D4A017', fontFamily: "'DM Sans', sans-serif" }}>Urgent</span>
            </div>
          </div>

          {/* Proposal card — center right */}
          <div
            className="animate-float-delay"
            style={{
              position: 'absolute',
              top: '120px',
              right: '0',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '20px 22px',
              width: '230px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0D7377, #085a5d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                AR
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FAF8F3', fontFamily: "'DM Sans', sans-serif" }}>Adv. A. Rao</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Supreme Court</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#D4A017', fontFamily: "'Cormorant Garamond', serif" }}>94%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Win Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#FAF8F3', fontFamily: "'Cormorant Garamond', serif" }}>312</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Cases</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FAF8F3', fontFamily: "'Cormorant Garamond', serif" }}>★ 4.9</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Rating</div>
              </div>
            </div>
            <div
              style={{
                background: '#B8860B',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'center',
                padding: '8px',
                borderRadius: '6px',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ₹35,000 · View Proposal
            </div>
          </div>

          {/* Stats card — bottom center */}
          <div
            className="animate-float"
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(13,115,119,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(13,115,119,0.3)',
              borderRadius: '12px',
              padding: '16px 22px',
              width: '260px',
              animationDelay: '0.6s',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif", marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Live Activity
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ecdc4', fontFamily: "'Cormorant Garamond', serif" }}>47</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Active Briefs</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#D4A017', fontFamily: "'Cormorant Garamond', serif" }}>183</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Proposals Today</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#FAF8F3', fontFamily: "'Cormorant Garamond', serif" }}>2.4h</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Avg Response</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            padding-top: 60px !important;
          }
        }
      `}</style>
    </section>
  );
}
