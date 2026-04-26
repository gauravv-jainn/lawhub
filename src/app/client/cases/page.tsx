import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';

export default async function ClientCasesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const cases = await prisma.case.findMany({
    where: { client_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      lawyer: { select: { full_name: true } },
      brief: { select: { category: true } },
    },
  });

  const allCases = cases ?? [];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Cases
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {allCases.filter(c => c.status === 'active').length} active · {allCases.length} total
        </p>
      </div>

      {allCases.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: 'var(--ink)', marginBottom: '8px' }}>No cases yet</h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', marginBottom: '20px' }}>
            Accept a proposal on one of your briefs to start a case.
          </p>
          <Link href="/client/briefs" style={{ color: 'var(--gold)', fontSize: '14px', fontWeight: 500 }}>View My Briefs →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allCases.map((c: any) => (
            <Link key={c.id} href={`/client/cases/${c.id}`}
              className="card-hover"
              style={{ display: 'block', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                      {c.brief?.category}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                    {c.title}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Advocate: {c.lawyer?.full_name ?? 'Unknown'}</span>
                    <span>Started {formatDate(c.created_at.toISOString())}</span>
                    {c.next_hearing_date && <span style={{ color: 'var(--teal)' }}>Next hearing: {c.next_hearing_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <StatusBadge status={c.status} size="md" />
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>
                    {formatCurrency(c.total_fee)}
                  </div>
                </div>
              </div>
              {/* Milestone bar */}
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '4px', background: 'rgba(14,12,10,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c.current_milestone / Math.max(c.milestone_count, 1)) * 100}%`, background: 'var(--teal)', borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', flexShrink: 0 }}>
                  Milestone {c.current_milestone}/{c.milestone_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
