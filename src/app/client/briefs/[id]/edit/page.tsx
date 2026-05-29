'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const URGENCY_OPTIONS = [
  { value: 'standard',  label: 'Standard',  desc: 'Bidding open for 48 hours', color: 'var(--ink)' },
  { value: 'urgent',    label: 'Urgent',    desc: 'Bidding open for 24 hours', color: '#9a710a' },
  { value: 'emergency', label: 'Emergency', desc: 'Bidding open for 6 hours',  color: 'var(--rust)' },
];

interface BriefData {
  id: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  urgency: 'standard' | 'urgent' | 'emergency';
  expires_at: string | null;
  status: string;
  category: string;
}

export default function EditBriefPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const briefId = params.id;

  const [brief, setBrief]           = useState<BriefData | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [saved, setSaved]           = useState(false);

  // Form fields
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin]     = useState(0);
  const [budgetMax, setBudgetMax]     = useState(0);
  const [urgency, setUrgency]         = useState<'standard' | 'urgent' | 'emergency'>('standard');
  const [extendDays, setExtendDays]   = useState(0);

  useEffect(() => {
    fetch(`/api/briefs/${briefId}`)
      .then(r => r.json())
      .then(data => {
        if (data.brief) {
          const b: BriefData = data.brief;
          if (b.status !== 'open') {
            setFetchError('This brief can no longer be edited.');
            return;
          }
          setBrief(b);
          setTitle(b.title);
          setDescription(b.description);
          setBudgetMin(b.budget_min);
          setBudgetMax(b.budget_max);
          setUrgency(b.urgency);
        } else {
          setFetchError(data.error ?? 'Brief not found.');
        }
      })
      .catch(() => setFetchError('Failed to load brief.'));
  }, [briefId]);

  const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);

    const payload: Record<string, unknown> = {};
    if (title.trim()       !== brief!.title)       payload.title       = title.trim();
    if (description.trim() !== brief!.description) payload.description = description.trim();
    if (budgetMin          !== brief!.budget_min)  payload.budget_min  = budgetMin;
    if (budgetMax          !== brief!.budget_max)  payload.budget_max  = budgetMax;
    if (urgency            !== brief!.urgency)     payload.urgency     = urgency;
    if (extendDays > 0)                            payload.extends_days = extendDays;

    if (Object.keys(payload).length === 0) {
      setSaveError('No changes detected.');
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/briefs/${briefId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = typeof data.error === 'string'
        ? data.error
        : Object.values(data.error as Record<string, string[]>).flat().join(', ');
      setSaveError(msg);
    } else {
      setSaved(true);
      setTimeout(() => router.push(`/client/briefs/${briefId}`), 1200);
    }
    setSaving(false);
  };

  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all`;
  const inputStyle = {
    borderColor: 'rgba(14,12,10,0.15)',
    background: 'var(--cream)',
    fontFamily: "'DM Sans', sans-serif",
  };

  if (fetchError) {
    return (
      <div className="page-container">
        <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '10px', padding: '20px 24px', maxWidth: '520px' }}>
          <p style={{ fontSize: '14px', color: 'var(--rust)', marginBottom: '12px' }}>{fetchError}</p>
          <Link href="/client/briefs" style={{ fontSize: '13px', color: 'var(--gold)', textDecoration: 'none' }}>
            ← Back to my briefs
          </Link>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="page-container">
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>Loading brief…</p>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href={`/client/briefs/${briefId}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none' }}>
          ← Back
        </Link>
        <span style={{ color: 'rgba(14,12,10,0.2)' }}>·</span>
        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
          {brief.category}
        </span>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Edit Brief
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Changes apply immediately. The brief stays open and proposals continue coming in.
        </p>
      </div>

      {saveError && (
        <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--rust)' }}>
          {saveError}
        </div>
      )}

      {saved && (
        <div style={{ background: 'rgba(26,107,58,0.08)', border: '1px solid rgba(26,107,58,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#1A6B3A' }}>
          ✓ Brief updated. Redirecting…
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
            Brief Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Property Boundary Dispute — Thane"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={8}
            placeholder="Describe your legal matter…"
            style={{
              width: '100%', padding: '12px',
              border: '1px solid rgba(14,12,10,0.15)',
              borderRadius: '8px', fontSize: '14px', lineHeight: 1.65,
              background: 'var(--cream)', resize: 'vertical', outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '4px' }}>
            {description.length} characters · Min. 50 required
          </p>
        </div>

        {/* Budget */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '12px' }}>
            Budget Range
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.5)', display: 'block', marginBottom: '6px' }}>Minimum (₹)</label>
              <input
                type="number"
                value={budgetMin / 100}
                onChange={e => setBudgetMin(Number(e.target.value) * 100)}
                min={5000}
                step={1000}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'rgba(14,12,10,0.5)', display: 'block', marginBottom: '6px' }}>Maximum (₹)</label>
              <input
                type="number"
                value={budgetMax / 100}
                onChange={e => setBudgetMax(Number(e.target.value) * 100)}
                min={5000}
                step={1000}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '8px', fontWeight: 500 }}>
            {formatRupees(budgetMin)} – {formatRupees(budgetMax)}
          </p>
        </div>

        {/* Urgency */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '10px' }}>
            Urgency Level
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {URGENCY_OPTIONS.map(opt => {
              const selected = urgency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value as typeof urgency)}
                  style={{
                    flex: 1,
                    border: `1px solid ${selected ? opt.color : 'rgba(14,12,10,0.12)'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    background: selected
                      ? `rgba(${opt.value === 'emergency' ? '192,57,43' : opt.value === 'urgent' ? '212,160,23' : '14,12,10'},0.06)`
                      : 'transparent',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: opt.color, marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Extend expiry */}
        {brief.expires_at && (
          <div style={{ padding: '16px', background: 'rgba(184,134,11,0.05)', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
              Extend Expiry
            </label>
            <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '12px' }}>
              Current expiry: {new Date(brief.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 7, 14, 30].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setExtendDays(days)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${extendDays === days ? 'var(--gold)' : 'rgba(14,12,10,0.12)'}`,
                    background: extendDays === days ? 'rgba(184,134,11,0.1)' : 'transparent',
                    color: extendDays === days ? 'var(--gold)' : 'rgba(14,12,10,0.5)',
                    fontSize: '12px',
                    fontWeight: extendDays === days ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {days === 0 ? 'No change' : `+${days} days`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(14,12,10,0.06)' }}>
          <Link
            href={`/client/briefs/${briefId}`}
            style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none' }}>
            Discard changes
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || description.length < 50 || title.trim().length < 5}
            style={{
              background: 'var(--gold)',
              color: 'white',
              padding: '11px 28px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: (saving || description.length < 50 || title.trim().length < 5) ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
