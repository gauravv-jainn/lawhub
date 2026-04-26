import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';

export default async function ClientBriefs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const briefs = await prisma.brief.findMany({
    where: { client_id: userId },
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { bids: true } } },
  });

  const allBriefs = briefs ?? [];

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            My Briefs
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
            {allBriefs.length} brief{allBriefs.length !== 1 ? 's' : ''} posted
          </p>
        </div>
        <Link href="/client/briefs/new" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--gold)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          + Post New Brief
        </Link>
      </div>

      {allBriefs.length === 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid rgba(14,12,10,0.08)',
          borderRadius: '16px',
          padding: '64px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            No briefs yet
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', marginBottom: '24px' }}>
            Post your first legal matter and receive competitive proposals from verified advocates within hours.
          </p>
          <Link href="/client/briefs/new" style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: 'white',
            padding: '12px 28px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            Post Your First Brief — Free
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allBriefs.map(brief => (
            <Link key={brief.id} href={`/client/briefs/${brief.id}`}
              className="card-hover"
              style={{
                display: 'block',
                background: 'white',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '12px',
                padding: '20px 24px',
                textDecoration: 'none',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(13,115,119,0.1)',
                      color: 'var(--teal)',
                      fontWeight: 500,
                    }}>
                      {brief.category}
                    </span>
                    <StatusBadge status={brief.urgency} />
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                    {brief.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
                    {brief.court} · {brief.city}, {brief.state} · Posted {formatDate(brief.created_at.toISOString())}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <StatusBadge status={brief.status} size="md" />
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>
                    {formatCurrency(brief.budget_min ?? 0)} – {formatCurrency(brief.budget_max ?? 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)' }}>
                    {(brief as any)._count?.bids ?? 0} proposal{((brief as any)._count?.bids ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
