'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

type Application = {
  id: string;
  cover_letter: string;
  resume_url: string | null;
  status: string;
  created_at: string;
  applicant: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    state: string | null;
  };
};

const STATUS_OPTIONS = ['reviewed', 'shortlisted', 'rejected', 'accepted'];
const statusStyle: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(14,12,10,0.06)', text: 'rgba(14,12,10,0.5)' },
  reviewed: { bg: 'rgba(184,134,11,0.08)', text: 'var(--gold)' },
  shortlisted: { bg: 'rgba(13,115,119,0.08)', text: 'var(--teal)' },
  accepted: { bg: 'rgba(39,174,96,0.08)', text: 'rgba(39,174,96,0.9)' },
  rejected: { bg: 'rgba(192,57,43,0.08)', text: 'var(--rust)' },
};

export default function InternshipApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    const res = await fetch(`/api/internships/${id}/applications`);
    const json = await res.json();
    setApplications(json.applications ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (applicationId: string, status: string) => {
    await fetch(`/api/internships/${id}/applications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, status }),
    });
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a));
  };

  if (loading) return <div className="p-8 text-center text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Applications</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>
          {applications.length} application{applications.length !== 1 ? 's' : ''} received
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
          <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No applications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(a => {
            const sc = statusStyle[a.status] ?? statusStyle.pending;
            return (
              <div key={a.id} className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                    style={{ background: 'rgba(13,115,119,0.1)', color: 'var(--teal)' }}>
                    {a.applicant.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{a.applicant.full_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(14,12,10,0.5)' }}>
                      {a.applicant.email}
                      {a.applicant.city && ` · ${a.applicant.city}${a.applicant.state ? ', ' + a.applicant.state : ''}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={a.status}
                      onChange={e => updateStatus(a.id, e.target.value)}
                      className="px-2 py-1 rounded-lg border text-xs outline-none"
                      style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' }}>
                      <option value="pending">Pending</option>
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      className="text-xs px-2 py-1 rounded-lg border"
                      style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'var(--ink)' }}>
                      {expanded === a.id ? 'Hide' : 'Read'}
                    </button>
                  </div>
                </div>
                {expanded === a.id && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="rounded-lg p-4 text-sm"
                      style={{ background: 'var(--parchment)', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                      {a.cover_letter}
                    </div>
                    {a.resume_url && (
                      <a href={a.resume_url} target="_blank" rel="noreferrer"
                        className="text-xs mt-2 inline-block" style={{ color: 'var(--teal)' }}>
                        📎 View Resume
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
