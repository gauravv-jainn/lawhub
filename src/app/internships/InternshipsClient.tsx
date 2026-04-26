'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Posting = {
  id: string;
  title: string;
  description: string;
  duration: string;
  stipend: string | null;
  skills: string[];
  location: string | null;
  remote: boolean;
  openings: number;
  closes_at: string | null;
  status: string;
  created_at: string;
  enterprise: { id: string; firm_name: string; firm_type: string; city: string | null; state: string | null };
  _count: { applications: number };
};

export default function InternshipsClient() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [postings, setPostings] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const fetchPostings = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (remoteOnly) params.set('remote', 'true');
    const res = await fetch(`/api/internships?${params}`);
    const json = await res.json();
    setPostings(json.postings ?? []);
    setLoading(false);
  }, [search, remoteOnly]);

  useEffect(() => { fetchPostings(); }, [fetchPostings]);

  const canApply = session?.user?.role === 'student' || session?.user?.role === 'lawyer';

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search internships..."
          className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none bg-white"
          style={{ borderColor: 'rgba(14,12,10,0.12)' }}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer"
          style={{ color: 'rgba(14,12,10,0.6)' }}>
          <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} className="w-4 h-4" />
          Remote only
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border h-32 animate-pulse"
              style={{ borderColor: 'rgba(14,12,10,0.08)' }} />
          ))}
        </div>
      ) : postings.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
          <div className="text-4xl mb-3">🎓</div>
          <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No internships found. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {postings.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-6"
              style={{ borderColor: 'rgba(14,12,10,0.08)', boxShadow: '0 1px 3px rgba(14,12,10,0.04)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(52,73,94,0.8)' }}>
                    {p.enterprise.firm_name}
                    {p.enterprise.city && ` · ${p.enterprise.city}`}
                    {p.enterprise.state && `, ${p.enterprise.state}`}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
                    <span>⏱ {p.duration}</span>
                    {p.stipend ? <span>💰 {p.stipend}</span> : <span className="opacity-60">Unpaid</span>}
                    {p.location && <span>📍 {p.location}</span>}
                    {p.remote && (
                      <span className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: 'rgba(13,115,119,0.08)', color: 'var(--teal)' }}>
                        🌐 Remote
                      </span>
                    )}
                    <span>👥 {p.openings} opening{p.openings !== 1 ? 's' : ''}</span>
                    {p.closes_at && (
                      <span>📅 Apply by {new Date(p.closes_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                  <p className="text-sm mt-3 line-clamp-2" style={{ color: 'rgba(14,12,10,0.55)' }}>
                    {p.description}
                  </p>
                  {p.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.skills.map(s => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(14,12,10,0.05)', color: 'rgba(14,12,10,0.65)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {canApply ? (
                    <Link href="/student/internships"
                      className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ background: 'rgba(155,89,182,0.85)' }}>
                      Apply
                    </Link>
                  ) : !session ? (
                    <Link href="/auth/register/student"
                      className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(155,89,182,0.1)', color: 'rgba(155,89,182,0.9)' }}>
                      Sign up to apply
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'rgba(14,12,10,0.3)' }}>
        {postings.length} posting{postings.length !== 1 ? 's' : ''} · Updated in real-time
      </p>
    </div>
  );
}
