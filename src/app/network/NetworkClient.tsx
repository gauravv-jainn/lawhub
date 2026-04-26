'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PRACTICE_AREAS, STATES } from '@/types';

type Lawyer = {
  id: string;
  full_name: string;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  lawyer_profile: {
    id: string;
    experience_years: number;
    practice_areas: string[];
    primary_court: string;
    avg_rating: number;
    review_count: number;
    total_cases: number;
    lawyer_type: string;
    only_legal_advice: boolean;
    bio: string | null;
  } | null;
  connection: { id: string; status: string } | null;
};

type PendingRequest = {
  id: string;
  status: string;
  requester: { id: string; full_name: string; city: string | null; role: string };
};

const LAWYER_TYPE_LABELS: Record<string, string> = {
  junior_advocate: 'Junior Advocate',
  senior_advocate: 'Senior Advocate',
  associate: 'Associate',
};

export default function NetworkClient() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [state, setState] = useState('');
  const [onlyAdvice, setOnlyAdvice] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tab, setTab] = useState<'directory' | 'requests'>('directory');

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (area) params.set('area', area);
    if (state) params.set('state', state);
    if (onlyAdvice) params.set('only_advice', 'true');

    const requests: Promise<Response>[] = [fetch(`/api/network/lawyers?${params}`)];
    if (session?.user) requests.push(fetch('/api/network/connections'));

    const responses = await Promise.all(requests);
    const jsons = await Promise.all(responses.map(r => r.json()));

    setLawyers(jsons[0].lawyers ?? []);
    if (jsons[1]) {
      const received: PendingRequest[] = (jsons[1].received ?? []).filter((c: { status: string }) => c.status === 'pending');
      setPendingRequests(received);
    }
    setLoading(false);
  }, [search, area, state, onlyAdvice, session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConnect = async (lawyerId: string) => {
    if (!session?.user) return;
    setConnecting(lawyerId);
    const res = await fetch('/api/network/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: lawyerId }),
    });
    if (res.ok) {
      setLawyers(prev => prev.map(l =>
        l.id === lawyerId ? { ...l, connection: { id: '', status: 'pending' } } : l
      ));
    }
    setConnecting(null);
  };

  const handleConnectionResponse = async (connectionId: string, status: 'accepted' | 'rejected') => {
    await fetch(`/api/network/connections/${connectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setPendingRequests(prev => prev.filter(r => r.id !== connectionId));
  };

  const connectionButtonLabel = (c: Lawyer['connection']) => {
    if (!c) return 'Connect';
    if (c.status === 'pending') return 'Pending';
    if (c.status === 'accepted') return 'Connected';
    return 'Connect';
  };

  const ROLE_HOME: Record<string, string> = {
    client:     '/client/dashboard',
    lawyer:     '/lawyer/dashboard',
    enterprise: '/enterprise/dashboard',
    ngo:        '/ngo/dashboard',
    student:    '/student/internships',
    admin:      '/admin/dashboard',
  };
  const dashboardHref = session?.user ? (ROLE_HOME[session.user.role] ?? '/') : '/';

  const inputClass = 'px-3 py-2 rounded-lg border text-sm outline-none bg-white';
  const inputStyle = { borderColor: 'rgba(14,12,10,0.12)' };

  return (
    <div className="space-y-6">
      {/* Back to dashboard */}
      {session?.user && (
        <a href={dashboardHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontWeight: 500, color: 'rgba(14,12,10,0.5)',
          textDecoration: 'none', padding: '6px 12px',
          borderRadius: '8px', border: '1px solid rgba(14,12,10,0.1)',
          background: 'white', transition: 'border-color 0.15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
        {([['directory', 'Lawyer Directory'], ['requests', `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-3 px-1 text-sm font-medium border-b-2 transition-all"
            style={{
              borderColor: tab === t ? 'var(--gold)' : 'transparent',
              color: tab === t ? 'var(--gold)' : 'rgba(14,12,10,0.5)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
              <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No pending connection requests.</p>
            </div>
          ) : pendingRequests.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4 flex items-center justify-between"
              style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{r.requester.full_name}</div>
                <div className="text-xs capitalize" style={{ color: 'rgba(14,12,10,0.4)' }}>
                  {r.requester.role}{r.requester.city && ` · ${r.requester.city}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleConnectionResponse(r.id, 'accepted')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: 'var(--teal)' }}>
                  Accept
                </button>
                <button onClick={() => handleConnectionResponse(r.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'rgba(14,12,10,0.5)' }}>
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'directory' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or court..."
              className="flex-1 min-w-48 px-3 py-2.5 rounded-lg border text-sm outline-none bg-white"
              style={{ borderColor: 'rgba(14,12,10,0.12)' }}
            />
            <select value={area} onChange={e => setArea(e.target.value)}
              className={inputClass} style={inputStyle}>
              <option value="">All Practice Areas</option>
              {PRACTICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={state} onChange={e => setState(e.target.value)}
              className={inputClass} style={inputStyle}>
              <option value="">All States</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer"
              style={{ color: 'rgba(14,12,10,0.6)' }}>
              <input type="checkbox" checked={onlyAdvice} onChange={e => setOnlyAdvice(e.target.checked)} className="w-4 h-4" />
              Legal Advice Only
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl border h-40 animate-pulse"
                  style={{ borderColor: 'rgba(14,12,10,0.08)' }} />
              ))}
            </div>
          ) : lawyers.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No lawyers match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lawyers.map(l => (
                <div key={l.id} className="bg-white rounded-xl border p-5"
                  style={{ borderColor: 'rgba(14,12,10,0.08)', boxShadow: '0 1px 3px rgba(14,12,10,0.04)' }}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-semibold"
                      style={{ background: 'rgba(13,115,119,0.1)', color: 'var(--teal)' }}>
                      {l.avatar_url
                        ? <img src={l.avatar_url} alt={l.full_name} className="w-11 h-11 rounded-full object-cover" />
                        : l.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
                        {l.full_name}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'rgba(14,12,10,0.5)' }}>
                        {l.lawyer_profile && LAWYER_TYPE_LABELS[l.lawyer_profile.lawyer_type]}
                        {l.city && ` · ${l.city}`}
                      </div>
                      {l.lawyer_profile && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--gold)' }}>
                            {'★'.repeat(Math.round(l.lawyer_profile.avg_rating))}
                          </span>
                          <span className="text-xs" style={{ color: 'rgba(14,12,10,0.4)' }}>
                            {l.lawyer_profile.avg_rating > 0 ? l.lawyer_profile.avg_rating.toFixed(1) : ''} · {l.lawyer_profile.total_cases} cases
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {l.lawyer_profile && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {l.lawyer_profile.practice_areas.slice(0, 3).map(a => (
                        <span key={a} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(14,12,10,0.04)', color: 'rgba(14,12,10,0.6)' }}>
                          {a}
                        </span>
                      ))}
                      {l.lawyer_profile.only_legal_advice && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(184,134,11,0.08)', color: 'var(--gold)' }}>
                          💬 Advice Only
                        </span>
                      )}
                    </div>
                  )}

                  {l.lawyer_profile?.bio && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'rgba(14,12,10,0.5)' }}>
                      {l.lawyer_profile.bio}
                    </p>
                  )}

                  {session?.user && session.user.id !== l.id && (
                    <div className="mt-4">
                      <button
                        onClick={() => !l.connection && handleConnect(l.id)}
                        disabled={connecting === l.id || (l.connection?.status === 'pending') || (l.connection?.status === 'accepted')}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        style={{
                          background: l.connection?.status === 'accepted' ? 'rgba(13,115,119,0.08)' : 'var(--teal)',
                          color: l.connection?.status === 'accepted' ? 'var(--teal)' : 'white',
                        }}>
                        {connecting === l.id ? '…' : connectionButtonLabel(l.connection)}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'rgba(14,12,10,0.3)' }}>
            Showing verified advocates only · {lawyers.length} result{lawyers.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
