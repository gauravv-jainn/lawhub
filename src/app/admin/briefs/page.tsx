import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils/formatDate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BriefModerationActions from './BriefModerationActions';

const STATUS_OPTS = ['all', 'open', 'closed'];
const LIMIT = 50;

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  open:   { color: '#1A6B3A', bg: 'rgba(26,107,58,0.08)' },
  closed: { color: 'rgba(14,12,10,0.4)', bg: 'rgba(14,12,10,0.05)' },
};

export default async function AdminBriefsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; q?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const status = STATUS_OPTS.includes(searchParams.status ?? '') && searchParams.status !== 'all'
    ? searchParams.status!
    : undefined;
  const page = Math.max(1, Number(searchParams.page ?? '1'));
  const q    = searchParams.q?.trim() ?? '';

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(q ? {
      OR: [
        { title:    { contains: q, mode: 'insensitive' as const } },
        { category: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [briefs, total, openCount, closedCount] = await Promise.all([
    prisma.brief.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip:    (page - 1) * LIMIT,
      take:    LIMIT,
      select: {
        id: true, title: true, category: true, status: true,
        urgency: true, pro_bono: true, created_at: true,
        client: { select: { id: true, full_name: true } },
        _count: { select: { proposals: true } },
      },
    }),
    prisma.brief.count({ where }),
    prisma.brief.count({ where: { status: 'open' } }),
    prisma.brief.count({ where: { status: 'closed' } }),
  ]);

  const pages = Math.ceil(total / LIMIT);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: status ?? 'all', page: String(page), q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '') params.set(k, v);
    }
    return `/admin/briefs${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
          Brief Moderation
        </h1>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
          <span style={{ color: '#1A6B3A', fontWeight: 600 }}>{openCount} open</span>
          <span>{closedCount} closed</span>
          <span>{total} shown</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_OPTS.map((s) => {
          const active = (s === 'all' && !status) || s === status;
          return (
            <a key={s} href={buildHref({ status: s, page: '1' })} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
              textDecoration: 'none', textTransform: 'capitalize', whiteSpace: 'nowrap',
              background: active ? 'var(--ink)' : 'rgba(14,12,10,0.05)',
              color: active ? 'white' : 'rgba(14,12,10,0.6)',
            }}>
              {s}
            </a>
          );
        })}

        <form method="GET" action="/admin/briefs" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title or category…"
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.15)', fontSize: '12px', width: '220px' }}
          />
          <button type="submit" style={{ padding: '7px 14px', borderRadius: '8px', background: 'var(--ink)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
            Search
          </button>
          {q && (
            <a href={buildHref({ q: '', page: '1' })} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(14,12,10,0.06)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px' }}>
              Clear
            </a>
          )}
        </form>
      </div>

      {/* Table */}
      {briefs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No briefs match the current filters.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.07)', background: 'rgba(14,12,10,0.02)' }}>
                {['Title', 'Category', 'Client', 'Posted', 'Proposals', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', color: 'rgba(14,12,10,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => {
                const sc = STATUS_STYLE[b.status] ?? STATUS_STYLE['closed'];
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.04)' }}>
                    <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--ink)' }}>
                        {b.title}
                      </div>
                      {b.pro_bono && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(91,33,182,0.08)', color: '#5b21b6', fontWeight: 600 }}>
                          Pro Bono
                        </span>
                      )}
                      {b.urgency === 'emergency' && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(192,57,43,0.08)', color: '#c0392b', fontWeight: 600, marginLeft: '4px' }}>
                          Emergency
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(14,12,10,0.55)' }}>{b.category}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <a href={`/admin/users/${b.client.id}`} style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 500 }}>
                        {b.client.full_name}
                      </a>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(14,12,10,0.45)', whiteSpace: 'nowrap' }}>
                      {formatDate(b.created_at.toISOString())}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: b._count.proposals > 0 ? '#1971c2' : 'rgba(14,12,10,0.35)' }}>
                      {b._count.proposals}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, background: sc.bg, color: sc.color }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <BriefModerationActions briefId={b.id} briefTitle={b.title} status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {page > 1 && (
            <a href={buildHref({ page: String(page - 1) })} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(14,12,10,0.05)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px' }}>
              ← Prev
            </a>
          )}
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map((p) => (
            <a key={p} href={buildHref({ page: String(p) })} style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none',
              background: p === page ? 'var(--ink)' : 'rgba(14,12,10,0.05)',
              color: p === page ? 'white' : 'var(--ink)',
            }}>
              {p}
            </a>
          ))}
          {page < pages && (
            <a href={buildHref({ page: String(page + 1) })} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(14,12,10,0.05)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px' }}>
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
