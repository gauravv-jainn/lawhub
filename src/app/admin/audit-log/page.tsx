/**
 * /admin/audit-log
 * Paginated, filterable view of all AdminLog entries.
 * Read-only — immutable audit trail.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatRelativeTime } from '@/lib/utils/formatDate';
export const dynamic = 'force-dynamic';

const ACTION_OPTS = [
  'all',
  'suspend_user',
  'reinstate_user',
  'approve_lawyer',
  'reject_lawyer',
  'assign_dispute',
  'resolve_dispute',
  'force_complete_case',
  'force_cancel_case',
  'release_payment',
  'refund_payment',
];

const TARGET_OPTS = ['all', 'user', 'case', 'dispute', 'payment', 'lawyer'];

// Human-readable labels for action codes
const ACTION_LABELS: Record<string, string> = {
  suspend_user:         'User Suspended',
  reinstate_user:       'User Reinstated',
  approve_lawyer:       'Lawyer Approved',
  reject_lawyer:        'Lawyer Rejected',
  reset_to_pending:     'Lawyer Reset to Pending',
  assign_dispute:       'Dispute Assigned',
  resolve_dispute:      'Dispute Resolved',
  force_complete_case:  'Case Force-Completed',
  force_cancel_case:    'Case Force-Cancelled',
  release_payment:      'Payment Released',
  refund_payment:       'Payment Refunded',
  admin_payment_released: 'Payment Released (Admin)',
  admin_payment_refunded: 'Payment Refunded (Admin)',
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  suspend_user:        { bg: 'rgba(192,57,43,0.08)', color: 'var(--rust)' },
  reinstate_user:      { bg: 'rgba(26,107,58,0.08)', color: '#1A6B3A' },
  approve_lawyer:      { bg: 'rgba(26,107,58,0.08)', color: '#1A6B3A' },
  reject_lawyer:       { bg: 'rgba(192,57,43,0.08)', color: 'var(--rust)' },
  resolve_dispute:     { bg: 'rgba(13,115,119,0.08)', color: 'var(--teal)' },
  assign_dispute:      { bg: 'rgba(212,160,23,0.08)', color: '#9a710a' },
  force_cancel_case:   { bg: 'rgba(192,57,43,0.08)', color: 'var(--rust)' },
  force_complete_case: { bg: 'rgba(26,107,58,0.08)', color: '#1A6B3A' },
  refund_payment:      { bg: 'rgba(192,57,43,0.08)', color: 'var(--rust)' },
  release_payment:     { bg: 'rgba(26,107,58,0.08)', color: '#1A6B3A' },
};

function actionChip(action: string) {
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
  const style = ACTION_COLORS[action] ?? { bg: 'rgba(14,12,10,0.06)', color: 'rgba(14,12,10,0.5)' };
  return { label, ...style };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; target_type?: string; admin?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const page      = Math.max(1, Number(searchParams.page ?? '1'));
  const limit     = 25;
  const action    = searchParams.action && searchParams.action !== 'all' ? searchParams.action : undefined;
  const targetType = searchParams.target_type && searchParams.target_type !== 'all' ? searchParams.target_type : undefined;
  const adminId   = searchParams.admin && searchParams.admin !== 'all' ? searchParams.admin : undefined;

  const where = {
    ...(action      ? { action }                 : {}),
    ...(targetType  ? { target_type: targetType } : {}),
    ...(adminId     ? { admin_id: adminId }        : {}),
  };

  const [logs, total, admins] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: { select: { id: true, full_name: true, email: true } },
      },
    }),
    prisma.adminLog.count({ where }),
    prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, full_name: true },
      orderBy: { full_name: 'asc' },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (action)     p.set('action',      action);
    if (targetType) p.set('target_type', targetType);
    if (adminId)    p.set('admin',       adminId);
    if (page > 1)   p.set('page',        String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === 'all' || v === '') p.delete(k);
      else p.set(k, v);
    });
    const qs = p.toString();
    return `/admin/audit-log${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px',
          }}
        >
          Audit Log
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)', margin: 0 }}>
          Immutable record of all admin actions — {total.toLocaleString('en-IN')} entries
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap',
          background: 'white', padding: '14px 16px',
          borderRadius: '10px', border: '1px solid rgba(14,12,10,0.08)',
        }}
      >
        {/* Action filter */}
        <div>
          <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Action
          </label>
          <select
            defaultValue={action ?? 'all'}
            onChange={() => {}}
            style={{
              fontSize: '12px', padding: '5px 8px', borderRadius: '6px',
              border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              background: 'white',
            }}
          >
            {ACTION_OPTS.map((a) => (
              <option key={a} value={a}>{a === 'all' ? 'All Actions' : (ACTION_LABELS[a] ?? a.replace(/_/g, ' '))}</option>
            ))}
          </select>
        </div>

        {/* Target type filter */}
        <div>
          <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Target
          </label>
          <select
            defaultValue={targetType ?? 'all'}
            onChange={() => {}}
            style={{
              fontSize: '12px', padding: '5px 8px', borderRadius: '6px',
              border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              background: 'white',
            }}
          >
            {TARGET_OPTS.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All Targets' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Admin filter */}
        <div>
          <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin
          </label>
          <select
            defaultValue={adminId ?? 'all'}
            onChange={() => {}}
            style={{
              fontSize: '12px', padding: '5px 8px', borderRadius: '6px',
              border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
              background: 'white',
            }}
          >
            <option value="all">All Admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>

        {/* Filter links (server-side navigation) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginLeft: 'auto' }}>
          <a
            href={buildHref({ page: '1' })}
            style={{
              fontSize: '12px', padding: '5px 12px', borderRadius: '6px',
              background: 'var(--ink)', color: 'white', textDecoration: 'none', fontWeight: 600,
            }}
          >
            Apply
          </a>
          <a
            href="/admin/audit-log"
            style={{
              fontSize: '12px', padding: '5px 12px', borderRadius: '6px',
              border: '1px solid rgba(14,12,10,0.15)', color: 'rgba(14,12,10,0.5)',
              textDecoration: 'none',
            }}
          >
            Reset
          </a>
        </div>
      </div>

      {/* Log table */}
      <div
        style={{
          background: 'white', border: '1px solid rgba(14,12,10,0.08)',
          borderRadius: '12px', overflow: 'hidden',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>
            No audit log entries match the current filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.08)', background: 'var(--cream)' }}>
                {['Time', 'Admin', 'Action', 'Target', 'Notes'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: '11px', fontWeight: 600, color: 'rgba(14,12,10,0.4)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const chip = actionChip(log.action);
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: i < logs.length - 1 ? '1px solid rgba(14,12,10,0.05)' : 'none',
                    }}
                  >
                    {/* Time */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(log.created_at.toISOString())}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.25)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        {log.created_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Admin */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                        {log.admin.full_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)' }}>
                        {log.admin.email}
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px', borderRadius: '10px',
                          fontSize: '11px', fontWeight: 600,
                          background: chip.bg, color: chip.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {chip.label}
                      </span>
                    </td>

                    {/* Target */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      {log.target_type && (
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', textTransform: 'capitalize', marginBottom: '2px' }}>
                          {log.target_type}
                        </div>
                      )}
                      {log.target_id && (
                        <div
                          style={{
                            fontSize: '11px', color: 'rgba(14,12,10,0.5)',
                            fontFamily: 'monospace', maxWidth: '140px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {log.target_id}
                        </div>
                      )}
                      {/* Deep-link to target if we know the type */}
                      {log.target_type === 'user' && log.target_id && (
                        <a
                          href={`/admin/users/${log.target_id}`}
                          style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}
                        >
                          View user ↗
                        </a>
                      )}
                      {log.target_type === 'case' && log.target_id && (
                        <a
                          href={`/admin/cases/${log.target_id}`}
                          style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}
                        >
                          View case ↗
                        </a>
                      )}
                      {log.target_type === 'dispute' && log.target_id && (
                        <a
                          href={`/admin/disputes/${log.target_id}`}
                          style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}
                        >
                          View dispute ↗
                        </a>
                      )}
                    </td>

                    {/* Notes */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', maxWidth: '240px' }}>
                      {log.notes ? (
                        <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.5 }}>
                          {log.notes.slice(0, 120)}{log.notes.length > 120 ? '…' : ''}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.25)' }}>—</span>
                      )}
                      {log.metadata && typeof log.metadata === 'object' && (
                        <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.3)', marginTop: '4px', fontFamily: 'monospace' }}>
                          {JSON.stringify(log.metadata).slice(0, 80)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
          {page > 1 && (
            <a
              href={buildHref({ page: String(page - 1) })}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px',
                border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              ← Prev
            </a>
          )}
          <span style={{ padding: '6px 14px', fontSize: '12px', color: 'rgba(14,12,10,0.4)' }}>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <a
              href={buildHref({ page: String(page + 1) })}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px',
                border: '1px solid rgba(14,12,10,0.15)', color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
