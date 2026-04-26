import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RatingStars from '@/components/shared/RatingStars';
import { formatDate } from '@/lib/utils/formatDate';

export default async function LawyerReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [lawyerProfile, reviews] = await Promise.all([
    prisma.lawyerProfile.findUnique({
      where: { id: userId },
      select: { avg_rating: true, review_count: true },
    }),
    prisma.review.findMany({
      where: { lawyer_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        client: { select: { full_name: true } },
        case: { select: { title: true } },
      },
    }),
  ]);

  const profile = lawyerProfile;
  const allReviews = (reviews ?? []) as any[];

  // Rating breakdown
  const breakdown = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: allReviews.filter((r: any) => r.rating === star).length,
    pct: allReviews.length > 0 ? (allReviews.filter((r: any) => r.rating === star).length / allReviews.length) * 100 : 0,
  }));

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Reviews
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {profile?.review_count ?? 0} reviews from clients
        </p>
      </div>

      {/* Overall rating */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '28px', marginBottom: '24px', display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
            {(profile?.avg_rating ?? 0).toFixed(1)}
          </div>
          <RatingStars rating={profile?.avg_rating ?? 0} size="lg" showValue={false} />
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginTop: '4px' }}>{profile?.review_count} reviews</div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          {breakdown.map(({ star, count, pct }) => (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', width: '16px' }}>{star}★</span>
              <div style={{ flex: 1, height: '6px', background: 'rgba(14,12,10,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#EEC900', borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', width: '20px' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      {allReviews.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⭐</div>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No reviews yet. Complete cases to build your reputation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allReviews.map((review: any) => {
            const clientName = review.client?.full_name ?? 'Client';
            const initials = clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={review.id} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--parchment-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>{clientName}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{review.case?.title}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <RatingStars rating={review.rating} showValue={false} size="sm" />
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '2px' }}>{formatDate(review.created_at.toISOString())}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(14,12,10,0.7)' }}>{(review as any).review}</p>
                {review.lawyer_reply && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--cream)', borderRadius: '8px', borderLeft: '2px solid var(--gold)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '4px' }}>Your reply</div>
                    <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.65)', lineHeight: 1.6 }}>{review.lawyer_reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
