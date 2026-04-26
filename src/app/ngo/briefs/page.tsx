import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open:    { bg: 'rgba(13,115,119,0.1)',  text: 'var(--teal)' },
  awarded: { bg: 'rgba(26,107,58,0.1)',   text: '#1A6B3A' },
  closed:  { bg: 'rgba(14,12,10,0.06)',   text: 'rgba(14,12,10,0.4)' },
};

const URGENCY_COLOR: Record<string, string> = {
  emergency: 'var(--rust)',
  urgent: 'var(--gold)',
  standard: 'rgba(14,12,10,0.15)',
};

export default async function NGOBriefsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const briefs = await prisma.brief.findMany({
    where: { client_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { bids: true } },
      bids: {
        where: { status: 'pending' },
        select: { id: true },
      },
    },
  });

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            My Briefs
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
            Track your posted briefs and incoming proposals
          </p>
        </div>
        <Link href="/ngo/briefs/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          + Post a Brief
        </Link>
      </div>

      {briefs.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            No briefs yet
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)', marginBottom: '20px' }}>
            Post a brief to get proposals from qualified advocates.
          </p>
          <Link href="/ngo/briefs/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Post Your First Brief
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {briefs.map(b => {
            const sc = STATUS_COLOR[b.status] ?? STATUS_COLOR.open;
            const borderColor = URGENCY_COLOR[b.urgency ?? 'standard'] ?? URGENCY_COLOR.standard;
            return (
              <Link key={b.id} href={`/ngo/briefs/${b.id}`} style={{ textDecoration: 'none', display: 'block', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px', borderLeft: `4px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                        {b.title}
                      </h3>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: sc.bg, color: sc.text, textTransform: 'capitalize' }}>
                        {b.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '12px' }}>
                      {b.category}
                      {b.court && ` · ${b.court}`}
                      {b.city && ` · ${b.city}`}
                      {b.state && `, ${b.state}`}
                      {b.urgency !== 'standard' && (
                        <span style={{ marginLeft: '8px', fontWeight: 600, color: borderColor, textTransform: 'capitalize' }}>
                          · {b.urgency}
                        </span>
                      )}
                    </div>
                    {b.budget_min && b.budget_max && (
                      <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 500 }}>
                        Budget: ₹{(b.budget_min / 100).toLocaleString('en-IN')} – ₹{(b.budget_max / 100).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                      {b._count.bids}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                      proposal{b._count.bids !== 1 ? 's' : ''}
                    </div>
                    {b.bids.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginTop: '4px' }}>
                        {b.bids.length} pending
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
