'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface ExpRange {
  label: string;
  min:   number;
  max:   number;
}

interface Props {
  q:         string;
  area:      string;
  state:     string;
  expParam:  string;
  sort:      string;
  areas:     string[];
  states:    string[];
  expRanges: ExpRange[];
}

export default function LawyerDirectoryFilters({
  q: initQ, area: initArea, state: initState,
  expParam: initExp, areas, states, expRanges,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [q,     setQ]     = useState(initQ);
  const [area,  setArea]  = useState(initArea);
  const [state, setState] = useState(initState);
  const [exp,   setExp]   = useState(initExp || 'Any');

  function apply(overrides: Partial<{ q: string; area: string; state: string; exp: string }>) {
    const params = new URLSearchParams();
    const merged = { q, area, state, exp, ...overrides };
    if (merged.q)     params.set('q',    merged.q);
    if (merged.area)  params.set('area', merged.area);
    if (merged.state) params.set('state', merged.state);
    if (merged.exp && merged.exp !== 'Any') params.set('exp', merged.exp);
    const str = params.toString();
    startTransition(() => {
      router.push(`/lawyers${str ? `?${str}` : ''}`);
    });
  }

  const selStyle = (active: boolean) => ({
    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
    background: active ? 'rgba(245,240,232,0.15)' : 'transparent',
    color:      active ? 'var(--cream)' : 'rgba(245,240,232,0.55)',
    border:     active ? '1px solid rgba(245,240,232,0.25)' : '1px solid transparent',
    cursor:     'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.1s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') apply({ q }); }}
          placeholder="Search by name, city, or state…"
          style={{
            flex: 1, padding: '11px 16px', borderRadius: '10px',
            border: '1px solid rgba(245,240,232,0.2)',
            background: 'rgba(245,240,232,0.1)', color: 'var(--cream)',
            fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={() => apply({ q })}
          disabled={isPending}
          style={{
            padding: '11px 22px', borderRadius: '10px', background: 'var(--gold)',
            color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Practice area chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.35)', marginRight: '4px', flexShrink: 0 }}>Area:</span>
        <button onClick={() => { setArea(''); apply({ area: '' }); }} style={selStyle(!area)}>All</button>
        {areas.map((a) => (
          <button key={a} onClick={() => { setArea(a); apply({ area: a }); }} style={selStyle(area === a)}>
            {a}
          </button>
        ))}
      </div>

      {/* Experience + State */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.35)', flexShrink: 0 }}>Experience:</span>
        {expRanges.map((r) => {
          const val = r.label === 'Any' ? '' : `${r.min}-${r.max}`;
          const active = (val === '') ? !exp || exp === 'Any' : exp === val;
          return (
            <button key={r.label} onClick={() => { setExp(val || 'Any'); apply({ exp: val || 'Any' }); }} style={selStyle(active)}>
              {r.label}
            </button>
          );
        })}

        {states.length > 0 && (
          <>
            <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.35)', marginLeft: '8px', flexShrink: 0 }}>State:</span>
            <select
              value={state}
              onChange={e => { setState(e.target.value); apply({ state: e.target.value }); }}
              style={{
                padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
                background: 'rgba(245,240,232,0.1)', color: 'var(--cream)',
                border: '1px solid rgba(245,240,232,0.2)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="" style={{ color: 'var(--ink)' }}>All States</option>
              {states.map(s => <option key={s} value={s} style={{ color: 'var(--ink)' }}>{s}</option>)}
            </select>
          </>
        )}

        {(area || state || (exp && exp !== 'Any') || q) && (
          <button
            onClick={() => {
              setQ(''); setArea(''); setState(''); setExp('Any');
              startTransition(() => router.push('/lawyers'));
            }}
            style={{
              padding: '7px 12px', borderRadius: '8px', fontSize: '11px',
              background: 'rgba(192,57,43,0.3)', color: '#ffb3a7',
              border: '1px solid rgba(192,57,43,0.4)', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
