'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewInternshipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', duration: '', stipend: '',
    location: '', remote: false, openings: 1, closes_at: '',
  });
  const [skills, setSkills] = useState<string[]>([]);

  const inp = (field: keyof Omit<typeof form, 'remote' | 'openings'>) => ({
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value })),
  });

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills(prev => [...prev, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all';
  const inputStyle = { borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.duration) {
      setError('Title, description and duration are required'); return;
    }
    setLoading(true); setError('');
    const res = await fetch('/api/internships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, skills }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Failed to post'); setLoading(false); return; }
    router.push('/enterprise/internships');
    router.refresh();
  };

  return (
    <div className="max-w-2xl">
      <Link href="/enterprise/internships" className="text-xs flex items-center gap-1 mb-4"
        style={{ color: 'rgba(14,12,10,0.4)' }}>← Back to Internships</Link>
      <h1 className="font-serif text-2xl font-semibold mb-6" style={{ color: 'var(--ink)' }}>
        Post a New Internship
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--rust)', border: '1px solid rgba(192,57,43,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5"
        style={{ borderColor: 'rgba(14,12,10,0.08)' }}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Title <span style={{ color: 'var(--rust)' }}>*</span>
          </label>
          <input {...inp('title')} placeholder="Legal Research Intern" className={inputClass} style={inputStyle} required />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Description <span style={{ color: 'var(--rust)' }}>*</span>
          </label>
          <textarea {...inp('description')} rows={4}
            placeholder="What will the intern work on? Responsibilities, learning outcomes..."
            className={inputClass} style={inputStyle} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Duration <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...inp('duration')} placeholder="2 months" className={inputClass} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Stipend</label>
            <input {...inp('stipend')} placeholder="₹5,000/month or Unpaid" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Location</label>
            <input {...inp('location')} placeholder="Mumbai" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Openings</label>
            <input
              type="number" min="1" max="20"
              value={form.openings}
              onChange={e => setForm(p => ({ ...p, openings: Number(e.target.value) }))}
              className={inputClass} style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Application Deadline</label>
          <input type="date" {...inp('closes_at')} className={inputClass} style={inputStyle} />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="remote"
            checked={form.remote}
            onChange={e => setForm(p => ({ ...p, remote: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="remote" className="text-sm" style={{ color: 'var(--ink)' }}>Remote / Work from anywhere</label>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Skills Required</label>
          <div className="flex gap-2 mb-2">
            <input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="e.g. Legal Research, Drafting"
              className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
            <button type="button" onClick={addSkill}
              className="px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'rgba(14,12,10,0.15)', color: 'var(--ink)' }}>
              + Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: 'rgba(14,12,10,0.06)', color: 'rgba(14,12,10,0.7)' }}>
                {s}
                <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                  className="ml-1 opacity-50 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--gold)' }}>
          {loading ? 'Posting…' : 'Publish Internship'}
        </button>
      </form>
    </div>
  );
}
