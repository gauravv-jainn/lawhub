'use client';

import { useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatRelativeTime, formatTimeLeft } from '@/lib/utils/formatDate';
import BidDrawer from '@/components/lawyer/BidDrawer';
import LegalSectionsCard from '@/components/shared/LegalSectionsCard';
import type { Brief } from '@/types';

interface Props {
  briefs: (Brief & { client_name?: string | null })[];
  biddedBriefIds: Set<string>;
  lawyerId: string;
  lawyerName: string;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'fewest_bids', label: 'Fewest Bids' },
  { value: 'budget_high', label: 'Highest Budget' },
  { value: 'urgent', label: 'Most Urgent' },
];

// Budget bracket options (in paise → display in ₹)
const BUDGET_BRACKETS = [
  { value: '', label: 'Any Budget' },
  { value: '0-5000000', label: 'Up to ₹50K' },
  { value: '5000000-10000000', label: '₹50K – ₹1L' },
  { value: '10000000-30000000', label: '₹1L – ₹3L' },
  { value: '30000000-100000000', label: '₹3L – ₹10L' },
  { value: '100000000-', label: '₹10L+' },
];

export default function BriefBrowser({ briefs, biddedBriefIds, lawyerId, lawyerName }: Props) {
  const [search, setSearch]               = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter]   = useState('');
  const [budgetFilter, setBudgetFilter]     = useState('');
  const [stateFilter, setStateFilter]       = useState('');
  const [hideProposed, setHideProposed]     = useState(false);
  const [sort, setSort]                   = useState('newest');
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const categories = [...new Set(briefs.map(b => b.category))].sort();
  const states     = [...new Set(briefs.map(b => (b as any).state).filter(Boolean))].sort();

  const filtered = briefs
    .filter(b => {
      if (hideProposed && biddedBriefIds.has(b.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.title.toLowerCase().includes(q) && !b.description.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && b.category !== categoryFilter) return false;
      if (urgencyFilter  && b.urgency  !== urgencyFilter)  return false;
      if (stateFilter    && (b as any).state !== stateFilter) return false;
      if (budgetFilter) {
        const [minStr, maxStr] = budgetFilter.split('-');
        const minVal = Number(minStr);
        const maxVal = maxStr ? Number(maxStr) : Infinity;
        if (b.budget_max < minVal) return false;
        if (maxVal !== Infinity && b.budget_min > maxVal) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'fewest_bids') return a.bid_count - b.bid_count;
      if (sort === 'budget_high') return b.budget_max - a.budget_max;
      if (sort === 'urgent') {
        const urgencyOrder: Record<string, number> = { emergency: 0, urgent: 1, standard: 2 };
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const activeFilters = [categoryFilter, urgencyFilter, budgetFilter, stateFilter, search].filter(Boolean).length + (hideProposed ? 1 : 0);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Browse Briefs
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          {filtered.length} open brief{filtered.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Filters bar — row 1: search + sort */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or description…"
          style={{
            flex: 1, minWidth: '200px', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)',
            borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none',
          }}
        />
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none' }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Filters bar — row 2: facet filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '7px 10px', border: categoryFilter ? '1px solid var(--teal)' : '1px solid rgba(14,12,10,0.15)', borderRadius: '7px', fontSize: '12px', background: 'white', outline: 'none' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
          style={{ padding: '7px 10px', border: urgencyFilter ? '1px solid var(--teal)' : '1px solid rgba(14,12,10,0.15)', borderRadius: '7px', fontSize: '12px', background: 'white', outline: 'none' }}>
          <option value="">All Urgency</option>
          <option value="emergency">Emergency</option>
          <option value="urgent">Urgent</option>
          <option value="standard">Standard</option>
        </select>

        <select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value)}
          style={{ padding: '7px 10px', border: budgetFilter ? '1px solid var(--teal)' : '1px solid rgba(14,12,10,0.15)', borderRadius: '7px', fontSize: '12px', background: 'white', outline: 'none' }}>
          {BUDGET_BRACKETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>

        {states.length > 1 && (
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
            style={{ padding: '7px 10px', border: stateFilter ? '1px solid var(--teal)' : '1px solid rgba(14,12,10,0.15)', borderRadius: '7px', fontSize: '12px', background: 'white', outline: 'none' }}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(14,12,10,0.6)', cursor: 'pointer', padding: '7px 10px', border: hideProposed ? '1px solid var(--teal)' : '1px solid rgba(14,12,10,0.12)', borderRadius: '7px', background: hideProposed ? 'rgba(13,115,119,0.06)' : 'transparent' }}>
          <input type="checkbox" checked={hideProposed} onChange={e => setHideProposed(e.target.checked)} style={{ margin: 0 }} />
          Hide proposed
        </label>

        {activeFilters > 0 && (
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); setUrgencyFilter(''); setBudgetFilter(''); setStateFilter(''); setHideProposed(false); }}
            style={{ padding: '7px 12px', borderRadius: '7px', fontSize: '12px', background: 'rgba(14,12,10,0.06)', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
          >
            Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Brief cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(brief => {
          const hasBid = biddedBriefIds.has(brief.id);
          const urgencyColor = brief.urgency === 'emergency' ? 'var(--rust)' : brief.urgency === 'urgent' ? '#9a710a' : 'transparent';

          return (
            <div key={brief.id}
              className="card-hover"
              style={{
                background: 'white',
                border: '1px solid rgba(14,12,10,0.08)',
                borderLeft: `3px solid ${urgencyColor === 'transparent' ? 'rgba(14,12,10,0.08)' : urgencyColor}`,
                borderRadius: '12px',
                padding: '20px 24px',
                opacity: hasBid ? 0.75 : 1,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                      {brief.category}
                    </span>
                    <StatusBadge status={brief.urgency} />
                    {hasBid && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(26,107,58,0.1)', color: '#1A6B3A', fontWeight: 500 }}>
                        ✓ Proposal Submitted
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    {brief.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.55, marginBottom: '10px' }}>
                    {brief.description.slice(0, 160)}…
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(14,12,10,0.4)', flexWrap: 'wrap' }}>
                    <span>⚖️ {brief.court}</span>
                    <span>📍 {brief.city}, {brief.state}</span>
                    <span>📋 {brief.bid_count} bid{brief.bid_count !== 1 ? 's' : ''}</span>
                    {brief.expires_at && <span>⏰ {formatTimeLeft(brief.expires_at)}</span>}
                    <span>🕒 {formatRelativeTime(brief.created_at)}</span>
                  </div>
                  {brief.structured_summary && (
                    <button
                      onClick={() => setExpandedId(expandedId === brief.id ? null : brief.id)}
                      style={{
                        marginTop: '10px', fontSize: '12px', color: 'var(--teal)', background: 'none',
                        border: '1px solid rgba(13,115,119,0.25)', borderRadius: '6px',
                        padding: '4px 10px', cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      {expandedId === brief.id ? '▲ Hide' : '▼ View'} Applicable Law (AI)
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', textAlign: 'right' }}>
                    {formatCurrency(brief.budget_min)} – {formatCurrency(brief.budget_max)}
                  </div>
                  {!hasBid ? (
                    <button onClick={() => setSelectedBrief(brief)}
                      style={{
                        background: 'var(--gold)', color: 'white', border: 'none',
                        padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600,
                      }}>
                      Submit Proposal
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#1A6B3A', fontWeight: 500 }}>Proposal sent</span>
                  )}
                </div>
              </div>
              {expandedId === brief.id && brief.structured_summary && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(14,12,10,0.06)', paddingTop: '16px' }}>
                  <LegalSectionsCard structuredSummary={brief.structured_summary} />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No briefs match your filters. Try adjusting your search.</p>
          </div>
        )}
      </div>

      {/* Bid Drawer */}
      {selectedBrief && (
        <BidDrawer
          brief={selectedBrief}
          lawyerId={lawyerId}
          lawyerName={lawyerName}
          onClose={() => setSelectedBrief(null)}
          onSuccess={() => setSelectedBrief(null)}
        />
      )}
    </div>
  );
}
