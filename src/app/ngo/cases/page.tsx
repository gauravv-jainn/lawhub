import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function NGOCasesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const cases = await prisma.case.findMany({
    where: { brief: { client_id: userId } },
    orderBy: { created_at: 'desc' },
    include: {
      brief: { select: { title: true, category: true } },
      lawyer: { select: { full_name: true } },
    },
  });

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(13,115,119,0.1)',  text: 'var(--teal)' },
    completed: { bg: 'rgba(26,107,58,0.1)',   text: '#1A6B3A' },
    cancelled: { bg: 'rgba(14,12,10,0.06)',   text: 'rgba(14,12,10,0.4)' },
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Active Cases
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Cases from your accepted briefs
        </p>
      </div>

      {cases.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            No active cases
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)', marginBottom: '20px' }}>
            Cases appear here once a lawyer accepts your brief.
          </p>
          <Link href="/ngo/briefs/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Post a Brief
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cases.map(c => {
            const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.active;
            return (
              <div key={c.id} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                        {c.title ?? c.brief.title}
                      </h3>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: sc.bg, color: sc.text, textTransform: 'capitalize' }}>
                        {c.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '12px' }}>
                      {c.brief.category}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                        {c.lawyer.full_name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{c.lawyer.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>Assigned Advocate</div>
                      </div>
                    </div>
                  </div>
                  {c.next_hearing_date && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '2px' }}>Next Hearing</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--teal)' }}>
                        {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
