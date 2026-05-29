/**
 * /admin/ledger — Payment Ledger Viewer
 *
 * Search by payment ID or case ID, paginate through entries,
 * colour-coded by event type, balance trail visible at a glance.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { LEDGER_EVENT_LABELS } from '@/lib/ledger';
import { reconcilePayments } from '@/lib/ledger';

// ─── Colour map ───────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  PAYMENT_CREATED:       { bg: '#f0f4ff', text: '#3b5bdb' },
  ESCROW_HELD:           { bg: '#e6fcf5', text: '#087f5b' },
  PAYMENT_CAPTURED:      { bg: '#ebfbee', text: '#2b8a3e' },
  MILESTONE_RELEASED:    { bg: '#fff9db', text: '#e67700' },
  PARTIAL_REFUND:        { bg: '#fff4e6', text: '#d9480f' },
  FULL_REFUND:           { bg: '#fff0f6', text: '#a61e4d' },
  PLATFORM_FEE_DEDUCTED: { bg: '#f3f0ff', text: '#5f3dc4' },
  TDS_DEDUCTED:          { bg: '#f8f0fc', text: '#862e9c' },
  DISPUTE_FROZEN:        { bg: '#fff5f5', text: '#c92a2a' },
  DISPUTE_RESOLVED:      { bg: '#e8f5e9', text: '#1b5e20' },
  ADMIN_OVERRIDE:        { bg: '#fff3cd', text: '#664d03' },
  PAYMENT_FAILED:        { bg: '#f8d7da', text: '#58151c' },
};

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 30;

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: { page?: string; payment?: string; case?: string; event?: string; reconcile?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/');

  const page       = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const paymentId  = searchParams.payment?.trim() ?? '';
  const caseId     = searchParams.case?.trim() ?? '';
  const eventType  = searchParams.event?.trim() ?? '';
  const showRecon  = searchParams.reconcile === '1';

  // Build query
  const where: Record<string, unknown> = {};
  if (paymentId) where.payment_id = paymentId;
  if (caseId)    where.case_id    = caseId;
  if (eventType) where.event_type = eventType;

  const [entries, total, reconIssues] = await Promise.all([
    prisma.paymentLedger.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      include: {
        actor:   { select: { full_name: true, role: true } },
        payment: { select: { milestone_number: true, razorpay_payment_id: true } },
      },
    }),
    prisma.paymentLedger.count({ where }),
    showRecon ? reconcilePayments() : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const q = new URLSearchParams();
    if (paymentId) q.set('payment', paymentId);
    if (caseId)    q.set('case', caseId);
    if (eventType) q.set('event', eventType);
    if (showRecon) q.set('reconcile', '1');
    q.set('page', String(p));
    return `/admin/ledger?${q}`;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
          Payment Ledger
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: '13px' }}>
          Immutable append-only audit trail · {total.toLocaleString()} entries
        </p>
      </div>

      {/* Filters */}
      <form method="GET" style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          name="payment"
          defaultValue={paymentId}
          placeholder="Filter by Payment ID"
          style={inputStyle}
        />
        <input
          name="case"
          defaultValue={caseId}
          placeholder="Filter by Case ID"
          style={inputStyle}
        />
        <select name="event" defaultValue={eventType} style={{ ...inputStyle, width: '220px' }}>
          <option value="">All event types</option>
          {Object.entries(LEDGER_EVENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="hidden" name="reconcile" value={showRecon ? '1' : ''} />
        <button type="submit" style={btnStyle}>Apply</button>
        <Link href="/admin/ledger" style={{ ...btnStyle, background: 'none', color: 'var(--ink-3)', border: '1px solid #ddd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Clear
        </Link>
        <Link
          href={`/admin/ledger?reconcile=1${paymentId ? `&payment=${paymentId}` : ''}${caseId ? `&case=${caseId}` : ''}`}
          style={{ ...btnStyle, background: showRecon ? '#c92a2a' : '#495057', marginLeft: 'auto' }}
        >
          {showRecon ? '✕ Hide Reconciliation' : '⚠ Run Reconciliation'}
        </Link>
      </form>

      {/* Reconciliation Issues */}
      {showRecon && (
        <div style={{ marginBottom: '28px', border: '1px solid #f5c6cb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: '#fff5f5', padding: '14px 20px', borderBottom: '1px solid #f5c6cb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#c92a2a', fontSize: '14px' }}>
              Reconciliation Issues ({reconIssues.length})
            </span>
            {reconIssues.length === 0 && (
              <span style={{ color: '#2b8a3e', fontSize: '13px', fontWeight: 500 }}>✓ All clear</span>
            )}
          </div>
          {reconIssues.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#fff5f5' }}>
                  {['Payment ID', 'Case', 'Milestone', 'DB Status', 'DB Amount', 'Ledger Balance', 'Issue'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#c92a2a', borderBottom: '1px solid #f5c6cb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reconIssues.map((issue, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5e8e8' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/admin/ledger?payment=${issue.paymentId}`} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3b5bdb' }}>
                        {issue.paymentId.slice(-8)}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/admin/cases/${issue.caseId}`} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3b5bdb' }}>
                        {issue.caseId.slice(-8)}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{issue.milestoneNumber ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f8d7da', color: '#58151c', fontSize: '11px', fontWeight: 600 }}>
                        {issue.dbStatus}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{formatPaise(issue.dbAmount)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{formatPaise(issue.ledgerBalance)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fff3cd', color: '#664d03', fontSize: '11px', fontWeight: 600 }}>
                        {issue.issue.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ledger Table */}
      <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              {['Date', 'Event', 'Payment', 'Milestone', 'Actor', 'Amount', 'Balance Before', 'Balance After'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  No ledger entries found
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const colors = EVENT_COLORS[entry.event_type] ?? { bg: '#f8f9fa', text: '#495057' };
              const isDecrease = ['MILESTONE_RELEASED', 'FULL_REFUND', 'PARTIAL_REFUND'].includes(entry.event_type);
              const isIncrease = ['ESCROW_HELD', 'PAYMENT_CAPTURED'].includes(entry.event_type);
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f3f5', transition: 'background 0.1s' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--ink-3)', fontSize: '12px' }}>
                    {formatDate(entry.created_at)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '6px', background: colors.bg, color: colors.text, fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {LEDGER_EVENT_LABELS[entry.event_type] ?? entry.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link href={`/admin/ledger?payment=${entry.payment_id}`} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#3b5bdb', textDecoration: 'none' }}>
                      {entry.payment_id.slice(-8)}
                    </Link>
                    {entry.payment?.razorpay_payment_id && (
                      <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px' }}>
                        rzp: {entry.payment.razorpay_payment_id.slice(-8)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink-2)' }}>
                    {entry.payment?.milestone_number != null ? `#${entry.payment.milestone_number}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--ink-2)' }}>
                    {entry.actor ? (
                      <span>
                        {entry.actor.full_name}
                        <span style={{ fontSize: '10px', color: 'var(--ink-3)', marginLeft: '4px' }}>({entry.actor.role})</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: isIncrease ? '#2b8a3e' : isDecrease ? '#c92a2a' : 'var(--ink-2)' }}>
                    {isIncrease ? '+' : isDecrease ? '−' : ''}{formatPaise(entry.amount)}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--ink-3)' }}>
                    {formatPaise(entry.balance_before)}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: entry.balance_after > entry.balance_before ? '#2b8a3e' : entry.balance_after < entry.balance_before ? '#c92a2a' : 'var(--ink-2)' }}>
                    {formatPaise(entry.balance_after)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px', alignItems: 'center' }}>
          {page > 1 && (
            <Link href={pageUrl(page - 1)} style={paginBtnStyle}>← Prev</Link>
          )}
          <span style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} style={paginBtnStyle}>Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  fontSize: '13px',
  outline: 'none',
  width: '200px',
  background: '#fff',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'var(--ink-2)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 500,
};

const paginBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  fontSize: '13px',
  color: 'var(--ink-2)',
  textDecoration: 'none',
  fontWeight: 500,
};
