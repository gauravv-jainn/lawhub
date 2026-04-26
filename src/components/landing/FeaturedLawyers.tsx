'use client';

const advocates = [
  {
    initials: 'PM',
    color: '#0D7377',
    name: 'Adv. Priya Mehta',
    court: 'Bombay High Court',
    experience: '18 yrs',
    rating: 4.9,
    reviews: 142,
    winRate: 91,
    cases: 387,
    feeRange: '₹25,000 – ₹1,50,000',
    areas: ['Property', 'Civil', 'Family'],
  },
  {
    initials: 'RK',
    color: '#1A3A5C',
    name: 'Adv. Rajiv Kumar',
    court: 'Supreme Court of India',
    experience: '24 yrs',
    rating: 4.8,
    reviews: 208,
    winRate: 88,
    cases: 512,
    feeRange: '₹75,000 – ₹5,00,000',
    areas: ['Constitutional', 'Commercial', 'Arbitration'],
  },
  {
    initials: 'SR',
    color: '#5B3427',
    name: 'Adv. Sunita Reddy',
    court: 'Telangana High Court',
    experience: '12 yrs',
    rating: 4.7,
    reviews: 89,
    winRate: 85,
    cases: 221,
    feeRange: '₹15,000 – ₹80,000',
    areas: ['Consumer', 'Labour', 'Revenue'],
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#EEC900', fontSize: '14px' }}>
      {'★'.repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? '½' : ''}
    </span>
  );
}

export default function FeaturedLawyers() {
  return (
    <section style={{ background: 'var(--parchment)', padding: '96px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: '12px',
            }}>
              Top Advocates
            </span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: 600,
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}>
              Trusted by thousands of clients
            </h2>
          </div>
          <a href="/client/find-lawyers" style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--gold)',
            textDecoration: 'none',
          }}>
            Browse all advocates →
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {advocates.map((adv) => (
            <div key={adv.name}
              className="card-hover"
              style={{
                background: 'var(--cream)',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '16px',
                padding: '28px',
              }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: adv.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: "'Cormorant Garamond', serif",
                  flexShrink: 0,
                }}>
                  {adv.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{adv.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>{adv.court}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <StarRating rating={adv.rating} />
                    <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)' }}>{adv.rating} ({adv.reviews})</span>
                  </div>
                </div>
                {/* BCI verified badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(13,115,119,0.1)',
                  border: '1px solid rgba(13,115,119,0.2)',
                  borderRadius: '100px',
                  padding: '4px 8px',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="5" fill="#0D7377"/>
                    <path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: '10px', color: 'var(--teal)', fontWeight: 600 }}>BCI</span>
                </div>
              </div>

              {/* Practice areas */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {adv.areas.map(area => (
                  <span key={area} style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: 'var(--parchment-2)',
                    color: 'rgba(14,12,10,0.6)',
                    border: '1px solid rgba(14,12,10,0.08)',
                  }}>
                    {area}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                padding: '16px',
                background: 'var(--parchment)',
                borderRadius: '10px',
                marginBottom: '20px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--law-green, #1A6B3A)' }}>{adv.winRate}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>Win Rate</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(14,12,10,0.06)', borderRight: '1px solid rgba(14,12,10,0.06)' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{adv.cases}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>Cases</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{adv.experience}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>Exp.</div>
                </div>
              </div>

              {/* Fee range */}
              <div style={{ marginBottom: '20px', fontSize: '13px', color: 'rgba(14,12,10,0.5)' }}>
                Fee range: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{adv.feeRange}</span>
              </div>

              <a href={`/lawyer-profile/sample`} style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                border: '1px solid rgba(14,12,10,0.15)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--gold)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(14,12,10,0.15)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--ink)';
                }}
              >
                View Profile
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
