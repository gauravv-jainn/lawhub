import prisma from '@/lib/prisma';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminBriefsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const briefs = await prisma.brief.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
    include: {
      client: { select: { full_name: true } },
      _count: { select: { bids: true } },
    },
  });

  const allBriefs = (briefs ?? []) as any[];

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        Brief Moderation
      </h1>

      {allBriefs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No briefs posted yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {allBriefs.map((brief: any) => (
          <div key={brief.id} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', marginBottom: '4px', fontFamily: "'Cormorant Garamond', serif" }}>
                {brief.title}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span>{brief.category}</span>
                <span>By: {brief.client?.full_name}</span>
                <span>{formatDate(brief.created_at.toISOString())}</span>
                <span>{brief._count?.bids ?? 0} bids</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <StatusBadge status={brief.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
