'use client';

import { useState, useEffect, useCallback } from 'react';

type Associate = {
  id: string;
  role: string;
  joined_at: string;
  lawyer: {
    user: { id: string; full_name: string; email: string; phone: string | null; city: string | null };
    experience_years: number;
    practice_areas: string[];
    lawyer_type: string;
    only_legal_advice: boolean;
  };
};

const ROLE_OPTIONS = ['associate', 'partner', 'intern'];

export default function AssociatesPage() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('associate');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchAssociates = useCallback(async () => {
    const res = await fetch('/api/enterprise/associates');
    const json = await res.json();
    setAssociates(json.associates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssociates(); }, [fetchAssociates]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true); setInviteError(''); setInviteSuccess('');
    const res = await fetch('/api/enterprise/associates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: inviteEmail, role: inviteRole }),
    });
    const json = await res.json();
    if (!res.ok) { setInviteError(json.error || 'Failed to add associate'); }
    else { setInviteSuccess('Associate added successfully'); setInviteEmail(''); fetchAssociates(); }
    setInviting(false);
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    await fetch(`/api/enterprise/associates/${id}`, { method: 'DELETE' });
    setAssociates(prev => prev.filter(a => a.id !== id));
    setRemoving(null);
  };

  const handleRoleChange = async (id: string, role: string) => {
    await fetch(`/api/enterprise/associates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setAssociates(prev => prev.map(a => a.id === id ? { ...a, role } : a));
  };

  const inputClass = 'px-3 py-2 rounded-lg border text-sm outline-none';
  const inputStyle = { borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Associates</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Manage lawyers and interns in your firm
          </p>
        </div>
        <span className="text-sm font-medium px-3 py-1 rounded-full"
          style={{ background: 'rgba(52,73,94,0.08)', color: 'rgba(52,73,94,0.8)' }}>
          {associates.length} members
        </span>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Add Associate</h2>
        <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
          <input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            type="email" placeholder="Advocate's email address"
            className={`flex-1 min-w-48 ${inputClass}`} style={inputStyle} required
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            className={inputClass} style={inputStyle}>
            {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <button type="submit" disabled={inviting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--gold)' }}>
            {inviting ? 'Adding…' : '+ Add'}
          </button>
        </form>
        {inviteError && <p className="text-xs mt-2" style={{ color: 'var(--rust)' }}>{inviteError}</p>}
        {inviteSuccess && <p className="text-xs mt-2" style={{ color: 'var(--teal)' }}>✓ {inviteSuccess}</p>}
        <p className="text-xs mt-2" style={{ color: 'rgba(14,12,10,0.4)' }}>
          The advocate must already have a LawHub lawyer account.
        </p>
      </div>

      {/* Associates list */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>Loading…</div>
        ) : associates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'rgba(14,12,10,0.4)' }}>No associates yet. Add your first member above.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(14,12,10,0.05)' }}>
            {associates.map(a => (
              <div key={a.id} className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                  style={{ background: 'rgba(13,115,119,0.1)', color: 'var(--teal)' }}>
                  {a.lawyer.user.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{a.lawyer.user.full_name}</div>
                  <div className="text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
                    {a.lawyer.user.email} · {a.lawyer.experience_years}y exp ·{' '}
                    {a.lawyer.practice_areas.slice(0, 2).join(', ')}
                    {a.lawyer.only_legal_advice && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                        style={{ background: 'rgba(184,134,11,0.1)', color: 'var(--gold)' }}>
                        Legal Advice Only
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={a.role}
                    onChange={e => handleRoleChange(a.id, e.target.value)}
                    className="px-2 py-1 rounded-lg border text-xs outline-none capitalize"
                    style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' }}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removing === a.id}
                    className="px-2 py-1 rounded-lg text-xs border transition-all hover:bg-red-50 disabled:opacity-40"
                    style={{ borderColor: 'rgba(192,57,43,0.2)', color: 'var(--rust)' }}>
                    {removing === a.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
