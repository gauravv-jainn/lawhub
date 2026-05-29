import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatRelativeTime } from '@/lib/utils/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';

const STATUS_OPTS = ['all', 'open', 'under_review', 'resolved_client', 'resolved_lawyer', 'settled'];

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const status = STATUS_OPTS.includes(searchParams.status ?? '') && searchParams.status !== 'all'
    ? searchParams.status!
    : undefined;
  const page  = Math.max(1, Number(searchParams.page ?? '1'));
  const limit = 20;

  const where = status ? { status: status as never } : {};

  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        case:      { select: { id: true, title: true, total_fee: true } },
        raised_by: { select: { full_name: true, role: true } },
        admin:     { select: { full_name: true } },
      },
    }),
    prisma.dispute.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
    open:             { color: 'var(--rust)',   bg: 'rgba(192,57,43,0.08)' },
    under_review:     { color: '#9a710a',        bg: 'rgba(184,134,11,0.08)' },
    resolved_client:  { color: '#1A6B3A',        bg: 'rgba(26,107,58,0.08)' },
    resolved_lawyer:  { color: 'var(--teal)',    bg: 'rgba(13,115,119,0.08)' },
    settled:          { color: 'rgba(14,12,10,0.5)', bg: 'rgba(14,12,10,0.05)' },
  };

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '30px',
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Dispute Queue
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)' }}>
          {total} dispute{total !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {STATUS_OPTS.map((s) => {
          const active = (s === 'all' && !status) || s === status;
          return (
            <a
              key={s}
              href={`/admin/disputes${s !== 'all' ? `?status=${s}` : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                textDecoration: 'none',
                background: active ? 'var(--ink)' : 'rgba(14,12,10,0.05)',
                color: active ? 'white' : 'rgba(14,12,10,0.6)',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {s.replace(/_/g, ' ')}
            </a>
          );
        })}
      </div>

      {disputes.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'rgba(14,12,10,0.35)',
            fontSize: '14px',
          }}
        >
          No disputes found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disputes.map((d) => {
            const sc = STATUS_COLOR[d.status] ?? STATUS_COLOR.open;
            return (
              <a
                key={d.id}
                href={`/admin/disputes/${d.id}`}
                style={{
                  display: 'block',
                  background: 'white',
                  border: '1px solid rgba(14,12,10,0.08)',
                  borderRadius: '10px',
                  padding: '18px 20px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '0' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.case?.title ?? 'Unknown case'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
                      Raised by {d.raised_by?.full_name} ({d.raised_by?.role}) ·{' '}
                      {formatRelativeTime(d.created_at.toISOString())}
                      {d.admin && ` · Assigned to ${d.admin.full_name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: sc.bg,
                        color: sc.color,
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.3)' }}>→</span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'rgba(14,12,10,0.5)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Reason: <span style={{ textTransform: 'capitalize' }}>{d.reason.replace(/_/g, ' ')}</span>
                  {d.description && ` — ${d.description}`}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'center' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/disputes?${status ? `status=${status}&` : ''}page=${p}`}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                background: p === page ? 'var(--ink)' : 'rgba(14,12,10,0.05)',
                color: p === page ? 'white' : 'var(--ink)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
