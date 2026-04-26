'use client';

import { useState } from 'react';
import { LEGAL_CATEGORIES } from '@/types';

export default function CTABand() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <section style={{
      background: 'var(--ink)',
      padding: '80px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '30%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '300px',
        background: 'radial-gradient(ellipse, rgba(184,134,11,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '64px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
      }}
        className="cta-band-grid">
        {/* Left */}
        <div>
          <span style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '20px',
          }}>
            Get Started Today
          </span>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(30px, 4vw, 48px)',
            fontWeight: 600,
            color: 'var(--cream)',
            lineHeight: 1.15,
            marginBottom: '20px',
          }}>
            Have a legal matter?
            <br />
            Post it now.{' '}
            <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Free.</span>
          </h2>
          <p style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'rgba(250,248,243,0.55)',
            marginBottom: '32px',
          }}>
            No signup fees. No retainer. Advocates compete for your matter — you choose the best fit.
          </p>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {[
              { val: 'Free', label: 'to post a brief' },
              { val: '24h', label: 'average first proposal' },
              { val: '0%', label: 'commission on hiring' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 700, color: 'var(--gold)' }}>
                  {item.val}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(250,248,243,0.45)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mini intake form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
        }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--cream)',
            marginBottom: '24px',
          }}>
            Quick Brief Intake
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '11px 14px',
                color: 'var(--cream)',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '11px 14px',
                color: category ? 'var(--cream)' : 'rgba(250,248,243,0.4)',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            >
              <option value="" disabled>Legal category</option>
              {LEGAL_CATEGORIES.map(c => (
                <option key={c} value={c} style={{ background: 'var(--ink-2)', color: 'var(--cream)' }}>{c}</option>
              ))}
            </select>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Briefly describe your legal matter…"
              rows={4}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '11px 14px',
                color: 'var(--cream)',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <a
              href="/auth/register/client"
              style={{
                display: 'block',
                textAlign: 'center',
                background: 'var(--gold)',
                color: 'white',
                padding: '13px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = '#9a710a')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--gold)')}
            >
              Post Brief — It&apos;s Free →
            </a>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(250,248,243,0.3)', textAlign: 'center', marginTop: '12px' }}>
            No credit card required. Advocates will contact you.
          </p>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .cta-band-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
