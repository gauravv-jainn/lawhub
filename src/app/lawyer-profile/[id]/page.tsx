import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import RatingStars from '@/components/shared/RatingStars';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';

export default async function PublicLawyerProfilePage({ params }: { params: { id: string } }) {
  const [lawyer, reviews] = await Promise.all([
    prisma.lawyerProfile.findFirst({
      where: { id: params.id, verification_status: 'verified' },
      include: {
        user: { select: { full_name: true, city: true, state: true } },
      },
    }),
    prisma.review.findMany({
      where: { lawyer_id: params.id },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        client: { select: { full_name: true } },
        case: { select: { title: true } },
      },
    }),
  ]);

  if (!lawyer) notFound();
  const lawyerData = lawyer as any;
  const allReviews = (reviews ?? []) as any[];
  const profile = lawyerData.user;

  const name = profile?.full_name ?? 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const winRate = lawyerData.total_cases > 0 ? Math.round((lawyerData.wins / lawyerData.total_cases) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Nav */}
      <nav style={{ background: 'var(--ink)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--cream)', textDecoration: 'none' }}>LawHub</a>
        <a href="/auth/login" style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', textDecoration: 'none' }}>Log in</a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Hero */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 600, color: 'var(--ink)' }}>
                  {name}
                </h1>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 600 }}>
                  ✓ BCI Verified
                </span>
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(14,12,10,0.5)', marginBottom: '8px' }}>
                {lawyerData.primary_court} · {profile?.city}, {profile?.state}
              </div>
              <RatingStars rating={lawyerData.avg_rating ?? 0} count={lawyerData.review_count} size="md" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
                {[
                  { label: 'Win Rate', value: `${winRate}%`, color: '#1A6B3A' },
                  { label: 'Cases', value: lawyerData.total_cases, color: 'var(--ink)' },
                  { label: 'Experience', value: `${lawyerData.experience_years} yrs`, color: 'var(--gold)' },
                  { label: 'Fee Range', value: lawyerData.fee_min ? `${formatCurrency(lawyerData.fee_min)}+` : 'On request', color: 'var(--teal)' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Practice areas */}
        {lawyerData.practice_areas?.length > 0 && (
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Practice Areas
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lawyerData.practice_areas.map((area: string) => (
                <span key={area} style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '100px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {allReviews.length > 0 && (
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
              Client Reviews ({allReviews.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {allReviews.map((review: any) => {
                const clientName = review.client?.full_name ?? 'Client';
                const ci = clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={review.id} style={{ padding: '16px', background: 'var(--cream)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--parchment-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>{ci}</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{clientName}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{review.case?.title}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <RatingStars rating={review.rating} showValue={false} />
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '2px' }}>{formatDate(review.created_at.toISOString())}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(14,12,10,0.7)' }}>{(review as any).review}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href="/auth/register/client" style={{ display: 'inline-block', background: 'var(--gold)', color: 'white', padding: '13px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Post a Brief to Invite This Advocate →
          </a>
        </div>
      </div>
    </div>
  );
}
