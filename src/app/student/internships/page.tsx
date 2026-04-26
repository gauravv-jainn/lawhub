'use client';

import { useState, useEffect, useCallback } from 'react';

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

type Application = {
  posting_id: string;
  status: string;
};

export default function StudentInternshipsPage() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [tab, setTab] = useState<'browse' | 'applied'>('browse');

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (remoteOnly) params.set('remote', 'true');

    const [postRes, appRes] = await Promise.all([
      fetch(`/api/internships?${params}`),
      fetch('/api/student/applications'),
    ]);
    const [postJson, appJson] = await Promise.all([postRes.json(), appRes.json()]);
    setPostings(postJson.postings ?? []);
    setApplications(appJson.applications ?? []);
    setLoading(false);
  }, [search, remoteOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const appliedIds = new Set(applications.map(a => a.posting_id));

  const handleApply = async (postingId: string) => {
    if (!coverLetter.trim()) { setApplyError('Please write a cover letter'); return; }
    setApplyError('');
    const res = await fetch(`/api/internships/${postingId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_letter: coverLetter }),
    });
    const json = await res.json();
    if (!res.ok) { setApplyError(json.error || 'Failed to apply'); return; }
    setApplySuccess('Application submitted!');
    setApplying(null);
    setCoverLetter('');
    setApplications(prev => [...prev, { posting_id: postingId, status: 'pending' }]);
    setTimeout(() => setApplySuccess(''), 3000);
  };

  const appStatus: Record<string, string> = {};
  for (const a of applications) appStatus[a.posting_id] = a.status;

  const statusColor: Record<string, string> = {
    pending: 'rgba(14,12,10,0.5)',
    reviewed: 'var(--gold)',
    shortlisted: 'var(--teal)',
    accepted: 'rgba(39,174,96,0.9)',
    rejected: 'var(--rust)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Internships</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>
          Browse opportunities from law firms across India
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
        {([['browse', 'Browse All'], ['applied', `My Applications (${applications.length})`]] as const).map(([t, label]) => (
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

      {tab === 'browse' && (
        <>
          {/* Search bar */}
          <div className="flex gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or skill..."
              className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'white' }}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer"
              style={{ color: 'rgba(14,12,10,0.6)' }}>
              <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} className="w-4 h-4" />
              Remote only
            </label>
          </div>

          {applySuccess && (
            <div className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(13,115,119,0.08)', color: 'var(--teal)', border: '1px solid rgba(13,115,119,0.2)' }}>
              ✓ {applySuccess}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Loading…</div>
          ) : postings.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
              <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No internships found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {postings.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-5"
                  style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                      <p className="text-sm mt-0.5 font-medium" style={{ color: 'rgba(52,73,94,0.8)' }}>
                        {p.enterprise.firm_name}
                        {p.enterprise.city && ` · ${p.enterprise.city}`}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
                        <span>⏱ {p.duration}</span>
                        {p.stipend && <span>💰 {p.stipend}</span>}
                        {p.location && <span>📍 {p.location}</span>}
                        {p.remote && <span>🌐 Remote</span>}
                        <span>👥 {p.openings} opening{p.openings !== 1 ? 's' : ''}</span>
                        {p.closes_at && <span>📅 Closes {new Date(p.closes_at).toLocaleDateString('en-IN')}</span>}
                      </div>
                      <p className="text-xs mt-2 line-clamp-2" style={{ color: 'rgba(14,12,10,0.5)' }}>{p.description}</p>
                      {p.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.skills.map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(14,12,10,0.05)', color: 'rgba(14,12,10,0.6)' }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {appliedIds.has(p.id) ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize"
                          style={{ background: 'rgba(14,12,10,0.05)', color: statusColor[appStatus[p.id]] || 'rgba(14,12,10,0.5)' }}>
                          ✓ {appStatus[p.id] || 'Applied'}
                        </span>
                      ) : applying === p.id ? (
                        <button onClick={() => setApplying(null)}
                          className="text-xs px-3 py-1.5 rounded-lg border"
                          style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'rgba(14,12,10,0.5)' }}>
                          Cancel
                        </button>
                      ) : (
                        <button onClick={() => { setApplying(p.id); setApplyError(''); }}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                          style={{ background: 'rgba(155,89,182,0.85)' }}>
                          Apply
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Apply form */}
                  {applying === p.id && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(14,12,10,0.06)' }}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                        Cover Letter <span style={{ color: 'var(--rust)' }}>*</span>
                      </label>
                      <textarea
                        value={coverLetter}
                        onChange={e => setCoverLetter(e.target.value)}
                        rows={4}
                        placeholder="Tell them why you're a great fit for this internship..."
                        className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                        style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' }}
                      />
                      {applyError && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{applyError}</p>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleApply(p.id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'rgba(155,89,182,0.85)' }}>
                          Submit Application
                        </button>
                        <button onClick={() => setApplying(null)}
                          className="px-4 py-1.5 rounded-lg text-xs border"
                          style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'rgba(14,12,10,0.5)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'applied' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
              <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>You haven&apos;t applied to any internships yet.</p>
            </div>
          ) : (
            applications.map(a => {
              const posting = postings.find(p => p.id === a.posting_id);
              return (
                <div key={a.posting_id} className="bg-white rounded-xl border p-4"
                  style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                        {posting?.title ?? a.posting_id}
                      </div>
                      {posting && (
                        <div className="text-xs" style={{ color: 'rgba(14,12,10,0.4)' }}>
                          {posting.enterprise.firm_name}
                        </div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium"
                      style={{ color: statusColor[a.status] || 'rgba(14,12,10,0.5)', background: 'rgba(14,12,10,0.04)' }}>
                      {a.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
