/**
 * /admin/operations — Admin Operations Dashboard V2
 *
 * Command-centre view showing:
 *  • Escrow health (held, stuck >14 days, released this week, refunded)
 *  • Revenue vs previous month
 *  • Dispute queue (counts by status + oldest unresolved)
 *  • Case pipeline (counts by status)
 *  • Flagged lawyers (dispute_rate > 25 %)
 *
 * Server component — all data fetched fresh on every load.
 */

import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function hoursToHuman(h: number): string {
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  const rem = h % 24;
  return rem ? `${d}d ${rem}h` : `${d}d`;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminOperationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const now            = new Date();
  const sevenDaysAgo   = new Date(now.getTime() - 7  * 86_400_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
  const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    heldAgg,
    stuckPayments,
    releasedWeekAgg,
    refundedAgg,
    disputeGroups,
    resolvedRecent,
    oldestOpenDisputes,
    flaggedLawyers,
    caseGroups,
    revenueThisMonth,
    revenuePrevMonth,
    openBriefs,
    proposalsToday,
    pendingLawyerCount,
  ] = await Promise.all([
    // ── Escrow ──────────────────────────────────────────────────────────────
    prisma.payment.aggregate({
      where: { status: 'held' },
      _sum:   { amount: true },
      _count: { id: true },
    }),
    prisma.payment.findMany({
      where:   { status: 'held', created_at: { lt: fourteenDaysAgo } },
      orderBy: { created_at: 'asc' },
      take:    15,
      select:  {
        id: true, amount: true, created_at: true,
        case:   { select: { id: true, title: true } },
        lawyer: { select: { full_name: true } },
        client: { select: { full_name: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'released', paid_at: { gte: sevenDaysAgo } },
      _sum:   { amount: true, platform_fee: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'refunded' },
      _sum:   { amount: true },
      _count: { id: true },
    }),

    // ── Disputes ────────────────────────────────────────────────────────────
    prisma.dispute.groupBy({
      by:     ['status'],
      _count: { id: true },
    }),
    prisma.dispute.findMany({
      where: {
        status:     { in: ['resolved_client', 'resolved_lawyer', 'settled'] },
        resolved_at: { gte: sevenDaysAgo, not: null },
      },
      select: { created_at: true, resolved_at: true },
    }),
    prisma.dispute.findMany({
      where:   { status: { in: ['open', 'under_review'] } },
      orderBy: { created_at: 'asc' },
      take:    8,
      select:  {
        id: true, reason: true, status: true, created_at: true,
        case:      { select: { id: true, title: true } },
        raised_by: { select: { full_name: true, role: true } },
        admin:     { select: { full_name: true } },
      },
    }),

    // ── Lawyers ─────────────────────────────────────────────────────────────
    prisma.lawyerProfile.findMany({
      where: {
        verification_status: 'verified',
        dispute_rate:        { gt: 0.25 },
      },
      orderBy: { dispute_rate: 'desc' },
      take:    10,
      select:  {
        id: true, dispute_rate: true, completion_rate: true, response_rate: true,
        user: { select: { id: true, full_name: true, email: true } },
      },
    }),

    // ── Cases ───────────────────────────────────────────────────────────────
    prisma.case.groupBy({
      by:     ['status'],
      _count: { id: true },
    }),

    // ── Revenue ─────────────────────────────────────────────────────────────
    prisma.payment.aggregate({
      where: { status: 'released', paid_at: { gte: startOfMonth } },
      _sum:   { platform_fee: true, amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'released', paid_at: { gte: startOfPrevMonth, lt: startOfMonth } },
      _sum:   { platform_fee: true, amount: true },
    }),

    // ── Activity ────────────────────────────────────────────────────────────
    prisma.brief.count({ where: { status: 'open' } }),
    prisma.proposal.count({ where: { created_at: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.lawyerProfile.count({ where: { verification_status: 'pending' } }),
  ]);

  // ── Derived numbers ────────────────────────────────────────────────────────
  const disputeMap: Record<string, number> = {};
  for (const g of disputeGroups) disputeMap[g.status] = g._count.id;

  const caseMap: Record<string, number> = {};
  for (const g of caseGroups) caseMap[g.status] = g._count.id;

  const openDisputeCount      = (disputeMap['open'] ?? 0) + (disputeMap['under_review'] ?? 0);
  const resolvedThisWeekCount = resolvedRecent.length;

  const avgResolutionHours = resolvedRecent.length > 0
    ? Math.round(
        resolvedRecent.reduce((sum, d) => {
          const end = d.resolved_at ?? d.created_at;
          return sum + (end.getTime() - d.created_at.getTime()) / 3_600_000;
        }, 0) / resolvedRecent.length
      )
    : null;

  const thisMonthRevenue = revenueThisMonth._sum.platform_fee ?? 0;
  const prevMonthRevenue = revenuePrevMonth._sum.platform_fee ?? 0;
  const revenueGrowthPct = prevMonthRevenue > 0
    ? Math.round(((thisMonthRevenue / prevMonthRevenue) - 1) * 100)
    : null;

  const heldAmount  = heldAgg._sum.amount ?? 0;
  const heldCount   = heldAgg._count.id;
  const stuckCount  = stuckPayments.length;
  const stuckAmount = stuckPayments.reduce((s, p) => s + p.amount, 0);

  // ── Status label helpers ───────────────────────────────────────────────────
  const DISPUTE_STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    open:             { label: 'Open',           color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
    under_review:     { label: 'Under Review',   color: '#9a710a', bg: 'rgba(184,134,11,0.08)' },
    resolved_client:  { label: 'Resolved (Client)', color: '#1A6B3A', bg: 'rgba(26,107,58,0.08)' },
    resolved_lawyer:  { label: 'Resolved (Lawyer)', color: '#0d7377', bg: 'rgba(13,115,119,0.08)' },
    settled:          { label: 'Settled',        color: 'rgba(14,12,10,0.5)', bg: 'rgba(14,12,10,0.05)' },
  };

  const CASE_STATUS_ORDER = ['active', 'pending', 'completion_requested', 'completed', 'cancelled', 'disputed'];
  const CASE_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    active:               { color: '#1A6B3A', bg: 'rgba(26,107,58,0.08)' },
    pending:              { color: '#9a710a', bg: 'rgba(184,134,11,0.08)' },
    completion_requested: { color: '#0d7377', bg: 'rgba(13,115,119,0.08)' },
    completed:            { color: 'rgba(14,12,10,0.5)', bg: 'rgba(14,12,10,0.05)' },
    cancelled:            { color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
    disputed:             { color: '#c0392b', bg: 'rgba(192,57,43,0.1)' },
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Operations Dashboard
          </h1>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginTop: '4px' }}>
            Last updated: {now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
        {/* Quick action links */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {openDisputeCount > 0 && (
            <a href="/admin/disputes" style={{ padding: '8px 16px', background: '#c0392b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
              {openDisputeCount} Open Dispute{openDisputeCount !== 1 ? 's' : ''} →
            </a>
          )}
          {pendingLawyerCount > 0 && (
            <a href="/admin/lawyers" style={{ padding: '8px 16px', background: 'var(--gold)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
              {pendingLawyerCount} Pending Verification{pendingLawyerCount !== 1 ? 's' : ''} →
            </a>
          )}
        </div>
      </div>

      {/* ── Escrow Health ───────────────────────────────────────────────────── */}
      <SectionTitle>Escrow Health</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard
          label="Held in Escrow"
          value={formatCurrency(heldAmount)}
          sub={`${heldCount} payment${heldCount !== 1 ? 's' : ''}`}
          color="#1971c2"
          bg="rgba(25,113,194,0.06)"
        />
        <StatCard
          label="Stuck > 14 Days"
          value={String(stuckCount)}
          sub={stuckCount > 0 ? formatCurrency(stuckAmount) : 'All clear'}
          color={stuckCount > 0 ? '#c0392b' : '#1A6B3A'}
          bg={stuckCount > 0 ? 'rgba(192,57,43,0.06)' : 'rgba(26,107,58,0.06)'}
          href={stuckCount > 0 ? '#stuck-escrow' : undefined}
        />
        <StatCard
          label="Released This Week"
          value={formatCurrency(releasedWeekAgg._sum.amount ?? 0)}
          sub={`${releasedWeekAgg._count.id} release${releasedWeekAgg._count.id !== 1 ? 's' : ''} · ${formatCurrency(releasedWeekAgg._sum.platform_fee ?? 0)} fees`}
          color="#1A6B3A"
          bg="rgba(26,107,58,0.06)"
        />
        <StatCard
          label="Total Refunded"
          value={formatCurrency(refundedAgg._sum.amount ?? 0)}
          sub={`${refundedAgg._count.id} refund${refundedAgg._count.id !== 1 ? 's' : ''}`}
          color="#e67700"
          bg="rgba(230,119,0,0.06)"
        />
      </div>

      {/* Stuck escrow detail */}
      {stuckPayments.length > 0 && (
        <div id="stuck-escrow" style={{ background: 'white', border: '1px solid rgba(192,57,43,0.18)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#c0392b' }}>
              ⚠ Stuck Escrow — Held &gt; 14 Days
            </div>
            <a href="/admin/ledger" style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>View in Ledger →</a>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                {['Case', 'Client', 'Lawyer', 'Amount', 'Age'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', color: 'rgba(14,12,10,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stuckPayments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.04)' }}>
                  <td style={{ padding: '8px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={`/admin/cases/${p.case?.id}`} style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>
                      {p.case?.title ?? '—'}
                    </a>
                  </td>
                  <td style={{ padding: '8px 10px', color: 'rgba(14,12,10,0.55)' }}>{p.client?.full_name ?? '—'}</td>
                  <td style={{ padding: '8px 10px', color: 'rgba(14,12,10,0.55)' }}>{p.lawyer?.full_name ?? '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1971c2' }}>{formatCurrency(p.amount)}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(192,57,43,0.08)', color: '#c0392b', fontWeight: 600 }}>
                      {daysAgo(p.created_at)}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Revenue ─────────────────────────────────────────────────────────── */}
      <SectionTitle>Revenue</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <StatCard
          label={`Revenue — ${now.toLocaleString('en-IN', { month: 'long' })}`}
          value={formatCurrency(thisMonthRevenue)}
          sub={revenueGrowthPct !== null
            ? `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct}% vs last month`
            : 'First month'}
          color={revenueGrowthPct !== null && revenueGrowthPct >= 0 ? '#1A6B3A' : '#c0392b'}
          bg="rgba(26,107,58,0.06)"
        />
        <StatCard
          label="GMV This Month"
          value={formatCurrency(revenueThisMonth._sum.amount ?? 0)}
          sub="Gross fees facilitated"
          color="var(--gold)"
          bg="rgba(212,160,23,0.06)"
        />
        <StatCard
          label="Prev Month Revenue"
          value={formatCurrency(prevMonthRevenue)}
          sub={now.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
          color="rgba(14,12,10,0.45)"
          bg="rgba(14,12,10,0.03)"
        />
      </div>

      {/* ── Dispute Analytics ────────────────────────────────────────────────── */}
      <SectionTitle>Dispute Analytics</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard
          label="Open + Under Review"
          value={String(openDisputeCount)}
          sub={`${disputeMap['open'] ?? 0} open · ${disputeMap['under_review'] ?? 0} in review`}
          color={openDisputeCount > 0 ? '#c0392b' : '#1A6B3A'}
          bg={openDisputeCount > 0 ? 'rgba(192,57,43,0.06)' : 'rgba(26,107,58,0.06)'}
          href="/admin/disputes"
        />
        <StatCard
          label="Resolved This Week"
          value={String(resolvedThisWeekCount)}
          sub="Last 7 days"
          color="#1A6B3A"
          bg="rgba(26,107,58,0.06)"
        />
        <StatCard
          label="Avg Resolution Time"
          value={avgResolutionHours !== null ? hoursToHuman(avgResolutionHours) : '—'}
          sub="From open → resolved (7d)"
          color="#1971c2"
          bg="rgba(25,113,194,0.06)"
        />
        <StatCard
          label="Total Resolved"
          value={String(
            (disputeMap['resolved_client'] ?? 0) +
            (disputeMap['resolved_lawyer'] ?? 0) +
            (disputeMap['settled'] ?? 0)
          )}
          sub="All time"
          color="rgba(14,12,10,0.45)"
          bg="rgba(14,12,10,0.03)"
        />
      </div>

      {/* Dispute status breakdown */}
      {Object.keys(DISPUTE_STATUS_LABEL).some(k => (disputeMap[k] ?? 0) > 0) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Object.entries(DISPUTE_STATUS_LABEL).map(([key, style]) => {
            const count = disputeMap[key] ?? 0;
            if (count === 0) return null;
            return (
              <span key={key} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '100px', background: style.bg, color: style.color, fontWeight: 600 }}>
                {style.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Oldest open disputes */}
      {oldestOpenDisputes.length > 0 && (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '14px' }}>
            Oldest Unresolved Disputes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {oldestOpenDisputes.map((d) => {
              const sc = DISPUTE_STATUS_LABEL[d.status] ?? DISPUTE_STATUS_LABEL['open'];
              const age = daysAgo(d.created_at);
              return (
                <a
                  key={d.id}
                  href={`/admin/disputes/${d.id}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(14,12,10,0.02)', borderRadius: '8px', textDecoration: 'none', gap: '12px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.case?.title ?? 'Unknown case'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>
                      {d.reason.replace(/_/g, ' ')} · Raised by {d.raised_by?.full_name} ({d.raised_by?.role})
                      {d.admin && ` · ${d.admin.full_name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: sc.bg, color: sc.color, fontWeight: 600 }}>
                      {sc.label}
                    </span>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: age > 7 ? 'rgba(192,57,43,0.08)' : 'rgba(14,12,10,0.06)', color: age > 7 ? '#c0392b' : 'rgba(14,12,10,0.45)', fontWeight: 600 }}>
                      {age}d old
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <a href="/admin/disputes" style={{ fontSize: '12px', color: 'var(--teal)', textDecoration: 'none' }}>View full queue →</a>
          </div>
        </div>
      )}

      {/* ── Case Pipeline ───────────────────────────────────────────────────── */}
      <SectionTitle>Case Pipeline</SectionTitle>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {CASE_STATUS_ORDER.map((status) => {
          const count = caseMap[status] ?? 0;
          const style = CASE_STATUS_STYLE[status] ?? { color: 'rgba(14,12,10,0.5)', bg: 'rgba(14,12,10,0.05)' };
          return (
            <div
              key={status}
              style={{
                padding: '12px 20px',
                background: 'white',
                border: `1px solid ${style.color}33`,
                borderRadius: '10px',
                minWidth: '110px',
                flex: '1',
              }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color: style.color }}>{count}</div>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.5)', textTransform: 'capitalize', marginTop: '2px' }}>
                {status.replace(/_/g, ' ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Activity Snapshot ───────────────────────────────────────────────── */}
      <SectionTitle>Platform Activity</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Open Briefs" value={String(openBriefs)} sub="Accepting proposals now" color="#5b21b6" bg="rgba(91,33,182,0.06)" href="/admin/briefs" />
        <StatCard label="Proposals Today" value={String(proposalsToday)} sub="Last 24 hours" color="#1971c2" bg="rgba(25,113,194,0.06)" />
        <StatCard label="Pending Verifications" value={String(pendingLawyerCount)} sub="Awaiting admin review" color={pendingLawyerCount > 0 ? '#e67700' : '#1A6B3A'} bg={pendingLawyerCount > 0 ? 'rgba(230,119,0,0.06)' : 'rgba(26,107,58,0.06)'} href="/admin/lawyers" />
      </div>

      {/* ── Flagged Lawyers ─────────────────────────────────────────────────── */}
      {flaggedLawyers.length > 0 && (
        <>
          <SectionTitle>Flagged Advocates — High Dispute Rate (&gt;25%)</SectionTitle>
          <div style={{ background: 'white', border: '1px solid rgba(192,57,43,0.15)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '14px' }}>
              These advocates have a dispute rate above 25 %. Consider reaching out, restricting proposal access, or requesting account review.
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(14,12,10,0.06)' }}>
                  {['Advocate', 'Email', 'Dispute Rate', 'Completion Rate', 'Response Rate', 'Action'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', color: 'rgba(14,12,10,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flaggedLawyers.map((lp) => (
                  <tr key={lp.id} style={{ borderBottom: '1px solid rgba(14,12,10,0.04)' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--ink)' }}>{lp.user.full_name}</td>
                    <td style={{ padding: '9px 10px', color: 'rgba(14,12,10,0.55)', fontSize: '11px' }}>{lp.user.email}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: 'rgba(192,57,43,0.1)', color: '#c0392b', fontWeight: 700 }}>
                        {pct(lp.dispute_rate)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', color: lp.completion_rate < 0.5 ? '#c0392b' : '#1A6B3A', fontWeight: 600 }}>
                      {pct(lp.completion_rate)}
                    </td>
                    <td style={{ padding: '9px 10px', color: 'rgba(14,12,10,0.55)' }}>{pct(lp.response_rate)}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <a href={`/admin/users/${lp.user.id}`} style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
                        View Profile →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--ink)',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid rgba(14,12,10,0.07)',
    }}>
      {children}
    </h2>
  );
}

function StatCard({
  label, value, sub, color, bg, href,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  href?: string;
}) {
  const inner = (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 700, color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)' }}>{sub}</div>}
    </div>
  );

  return href
    ? <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
    : inner;
}
