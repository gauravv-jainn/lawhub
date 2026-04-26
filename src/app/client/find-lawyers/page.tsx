import prisma from '@/lib/prisma';
import RatingStars from '@/components/shared/RatingStars';
import Link from 'next/link';

export default async function FindLawyersPage() {
  const lawyers = await prisma.lawyerProfile.findMany({
    where: { verification_status: 'verified' },
    orderBy: { avg_rating: 'desc' },
    take: 30,
    include: {
      user: { select: { full_name: true, city: true, state: true } },
    },
  });

  const allLawyers = (lawyers ?? []) as any[];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Find Advocates
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Browse {allLawyers.length} verified advocates
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {allLawyers.map((lawyer: any) => {
          const name = lawyer.user?.full_name ?? 'Unknown';
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          const winRate = lawyer.total_cases > 0 ? Math.round((lawyer.wins / lawyer.total_cases) * 100) : 0;

          return (
            <Link key={lawyer.id} href={`/lawyer-profile/${lawyer.id}`}
              className="card-hover"
              style={{ display: 'block', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px', textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'var(--teal)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)' }}>{lawyer.primary_court}</div>
                  <RatingStars rating={lawyer.avg_rating ?? 0} count={lawyer.review_count} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {(lawyer.practice_areas ?? []).slice(0, 3).map((area: string) => (
                  <span key={area} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '100px', background: 'var(--parchment)', border: '1px solid rgba(14,12,10,0.08)', color: 'rgba(14,12,10,0.55)' }}>
                    {area}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#1A6B3A', fontWeight: 500 }}>{winRate}% win rate</span>
                <span style={{ color: 'rgba(14,12,10,0.45)' }}>{lawyer.total_cases} cases</span>
                <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{lawyer.experience_years} yrs</span>
              </div>
            </Link>
          );
        })}
      </div>

      {allLawyers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No verified advocates yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
