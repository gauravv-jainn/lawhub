'use client';

import { useState } from 'react';

const clientFeatures = [
  'Post your legal matter for free — no listing fees',
  'Receive proposals from BCI-verified advocates only',
  'Compare fees, win rates, and case history side-by-side',
  'AI-powered brief structuring to present your matter clearly',
  'Secure milestone-based payments — pay as work progresses',
  'In-platform messaging — all communications on record',
  'Leave reviews and help others find quality advocates',
];

const lawyerFeatures = [
  'Access briefs matching your practice areas instantly',
  'AI-assisted proposal drafting to win more cases',
  'Verified badge builds trust with potential clients',
  'Competitive bidding — no fixed retainer fees to clients',
  'Milestone payments released securely to your bank account',
  'Build a public profile with verified ratings and reviews',
  'Weekly digest of new briefs matching your specialisation',
];

export default function ForSection() {
  const [tab, setTab] = useState<'client' | 'lawyer'>('client');

  return (
    <section style={{ background: 'var(--cream)', padding: '96px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Toggle pills */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '56px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--parchment-2)',
            borderRadius: '100px',
            padding: '4px',
            border: '1px solid rgba(14,12,10,0.08)',
          }}>
            {(['client', 'lawyer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 28px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.2s ease',
                  background: tab === t ? 'var(--gold)' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(14,12,10,0.5)',
                }}
              >
                {t === 'client' ? 'For Clients' : 'For Lawyers'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
        }}
          className="for-section-grid">
          {/* Feature list */}
          <div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: '32px',
              lineHeight: 1.2,
            }}>
              {tab === 'client'
                ? 'The smarter way to find legal representation'
                : 'Grow your practice. Win more cases.'}
            </h2>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(tab === 'client' ? clientFeatures : lawyerFeatures).map((feature) => (
                <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(184,134,11,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(14,12,10,0.7)' }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={tab === 'client' ? '/auth/register/client' : '/auth/register/lawyer'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '36px',
                background: 'var(--gold)',
                color: 'white',
                padding: '13px 28px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {tab === 'client' ? 'Post Your Brief — Free' : 'Join as an Advocate'} →
            </a>
          </div>

          {/* Mockup panel */}
          <div style={{
            background: 'var(--parchment)',
            border: '1px solid rgba(14,12,10,0.08)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            {tab === 'client' ? (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Proposals for: Property Dispute — Thane
                </div>
                {[
                  { name: 'Adv. Priya Mehta', court: 'Bombay HC', rating: '4.9', fee: '₹38,000', wins: '91%', badge: 'BEST MATCH' },
                  { name: 'Adv. Rajan Iyer', court: 'District Court', rating: '4.7', fee: '₹25,000', wins: '84%', badge: null },
                  { name: 'Adv. Sunita Rao', court: 'High Court', rating: '4.8', fee: '₹45,000', wins: '89%', badge: null },
                ].map((advocate, i) => (
                  <div key={i} style={{
                    background: 'white',
                    border: `1px solid ${i === 0 ? 'rgba(184,134,11,0.4)' : 'rgba(14,12,10,0.08)'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '10px',
                    position: 'relative',
                  }}>
                    {advocate.badge && (
                      <span style={{
                        position: 'absolute',
                        top: '-1px',
                        right: '12px',
                        background: 'var(--gold)',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '0 0 6px 6px',
                        letterSpacing: '0.06em',
                      }}>
                        {advocate.badge}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: i === 0 ? 'var(--teal)' : i === 1 ? 'var(--ink)' : '#5b21b6',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700,
                      }}>
                        {advocate.name.split(' ').slice(1).map(n => n[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{advocate.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)' }}>{advocate.court}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>{advocate.fee}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>Win {advocate.wins} · ★{advocate.rating}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(14,12,10,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Matching Briefs for You
                </div>
                {[
                  { title: 'Property Dispute — Thane, MH', budget: '₹25K–60K', bids: 3, category: 'Property', urgency: 'Urgent' },
                  { title: 'Commercial Contract Breach — Pune', budget: '₹40K–1.2L', bids: 1, category: 'Commercial', urgency: 'Standard' },
                  { title: 'Consumer Forum Appeal — Chennai', budget: '₹15K–35K', bids: 5, category: 'Consumer', urgency: 'Standard' },
                  { title: 'Labour Dispute — Bengaluru', budget: '₹20K–50K', bids: 2, category: 'Labour', urgency: 'Urgent' },
                ].map((brief, i) => (
                  <div key={i} style={{
                    background: 'white',
                    border: '1px solid rgba(14,12,10,0.08)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '10px',
                    borderLeft: `3px solid ${brief.urgency === 'Urgent' ? 'var(--rust)' : 'rgba(14,12,10,0.08)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px', fontFamily: "'Cormorant Garamond', serif" }}>
                          {brief.title}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>{brief.category}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>{brief.bids} bid{brief.bids !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>{brief.budget}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .for-section-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
