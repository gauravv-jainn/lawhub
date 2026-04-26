'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEGAL_CATEGORIES, COURTS, STATES } from '@/types';

const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard', desc: 'Bidding open for 48 hours' },
  { value: 'urgent', label: 'Urgent', desc: 'Bidding open for 24 hours' },
  { value: 'emergency', label: 'Emergency', desc: 'Bidding open for 6 hours' },
];

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(14,12,10,0.15)',
  background: 'var(--cream)',
  fontSize: '13px',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600 as const,
  color: 'rgba(14,12,10,0.55)',
  marginBottom: '6px',
  display: 'block' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

export default function NGONewBriefPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [court, setCourt] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [urgency, setUrgency] = useState('standard');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStructured, setAiStructured] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleAIStructure = async () => {
    if (!description.trim() || description.trim().length < 30) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/structure-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description }),
      });
      const data = await res.json();
      if (data.structured) {
        setAiStructured(data.structured);
        if (data.structured.suggested_title && !title) setTitle(data.structured.suggested_title);
        if (data.structured.category && !category) setCategory(data.structured.category);
      }
    } catch { /* silently fail */ }
    setAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !description.trim()) {
      setError('Please fill in title, category, and description.');
      return;
    }
    if (description.trim().length < 50) {
      setError('Description must be at least 50 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          court: court || null,
          city: city || null,
          state: state || null,
          urgency,
          description: description.trim(),
          structured_summary: aiStructured || null,
          budget_min: budgetMin ? Math.round(parseFloat(budgetMin) * 100) : null,
          budget_max: budgetMax ? Math.round(parseFloat(budgetMax) * 100) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to post brief.');
        setLoading(false);
        return;
      }

      router.push('/ngo/briefs');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Post a Brief
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Seek legal support from verified advocates. Your organisation name will be displayed.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
            Basic Information
          </h2>

          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Brief Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Land Acquisition Rights for Tribal Community"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={labelStyle}>Legal Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} required>
                <option value="">Select category</option>
                {LEGAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Court / Tribunal</label>
              <select value={court} onChange={e => setCourt(e.target.value)} style={inputStyle}>
                <option value="">Select court</option>
                {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Urgency</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {URGENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${urgency === opt.value ? 'var(--gold)' : 'rgba(14,12,10,0.12)'}`,
                    background: urgency === opt.value ? 'rgba(184,134,11,0.06)' : 'var(--cream)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: urgency === opt.value ? 'var(--gold)' : 'var(--ink)', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '20px' }}>
            Case Description
          </h2>

          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Describe your legal matter *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={7}
              placeholder="Provide detailed information about the legal issue, background, what you need help with, and any relevant context. Minimum 50 characters."
              style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: description.length < 50 ? 'var(--rust)' : 'rgba(14,12,10,0.35)' }}>
                {description.length} / 50 min
              </span>
              {description.trim().length >= 30 && (
                <button type="button" onClick={handleAIStructure} disabled={aiLoading}
                  style={{ fontSize: '11px', color: 'var(--teal)', background: 'rgba(13,115,119,0.08)', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  {aiLoading ? '✨ Analysing…' : '✨ AI: Suggest Title & Sections'}
                </button>
              )}
            </div>
            {aiStructured && (
              <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(13,115,119,0.05)', borderRadius: '8px', border: '1px solid rgba(13,115,119,0.12)', fontSize: '12px', color: 'var(--teal)' }}>
                ✓ AI analysis complete — applicable law sections will be attached to this brief.
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
            Budget Range
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', marginBottom: '16px' }}>Optional — leave blank if seeking pro-bono support</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Minimum (₹)</label>
              <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="0" style={inputStyle} min={0} />
            </div>
            <div>
              <label style={labelStyle}>Maximum (₹)</label>
              <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="0" style={inputStyle} min={0} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', color: 'var(--rust)', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '11px 24px', borderRadius: '8px', border: '1px solid rgba(14,12,10,0.15)', background: 'white', color: 'var(--ink)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ flex: 1, padding: '11px 24px', borderRadius: '8px', border: 'none', background: 'var(--gold)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Posting...' : 'Post Brief'}
          </button>
        </div>
      </form>
    </div>
  );
}
