'use client';

import { useState, useEffect } from 'react';

const CAUSE_OPTIONS = [
  'Women Rights', 'Child Rights', 'Environmental Law', 'Human Rights',
  'Labour Rights', 'Housing Rights', 'Education Rights', 'Disability Rights',
  'Tribal Rights', 'LGBTQ+ Rights', 'Consumer Protection', 'Anti-Corruption',
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Other',
];

export default function NGOProfilePage() {
  const [form, setForm] = useState({
    full_name: '', phone: '', org_name: '', city: '', state: '',
    website: '', description: '', cause_areas: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ngo/profile')
      .then(r => r.json())
      .then(data => {
        setForm({
          full_name: data.user?.full_name ?? '',
          phone: data.user?.phone ?? '',
          org_name: data.profile?.org_name ?? '',
          city: data.profile?.city ?? '',
          state: data.profile?.state ?? '',
          website: data.profile?.website ?? '',
          description: data.profile?.description ?? '',
          cause_areas: (data.profile?.cause_areas as string[]) ?? [],
        });
        setLoading(false);
      });
  }, []);

  const toggleCause = (cause: string) => {
    setForm(f => ({
      ...f,
      cause_areas: f.cause_areas.includes(cause)
        ? f.cause_areas.filter(c => c !== cause)
        : [...f.cause_areas, cause],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/ngo/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '32px', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>Loading…</div>;

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          Organisation Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>Manage your NGO's public information</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>

        {/* Contact info */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Contact Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {field('Contact Name', 'full_name', 'text', 'Your full name')}
            {field('Phone', 'phone', 'tel', '+91 XXXXX XXXXX')}
          </div>
        </div>

        {/* Organisation */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Organisation Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {field('Organisation Name', 'org_name', 'text', 'Full legal name of your NGO')}
            {field('Website', 'website', 'url', 'https://yourorg.org')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {field('City', 'city', 'text', 'e.g. Mumbai')}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>State</label>
                <select
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>About / Mission Statement</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Brief description of your organisation's mission and work…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Cause areas */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Cause Areas</h2>
          <p style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '14px' }}>Select the causes your organisation works on</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CAUSE_OPTIONS.map(cause => {
              const selected = form.cause_areas.includes(cause);
              return (
                <button key={cause} type="button" onClick={() => toggleCause(cause)}
                  style={{
                    padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: selected ? 'rgba(39,174,96,0.12)' : 'var(--cream)',
                    color: selected ? 'rgba(39,174,96,0.9)' : 'rgba(14,12,10,0.55)',
                    outline: selected ? '1.5px solid rgba(39,174,96,0.3)' : '1px solid rgba(14,12,10,0.1)',
                  }}>
                  {selected ? '✓ ' : ''}{cause}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="submit" disabled={saving}
            style={{ background: 'var(--gold)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontSize: '13px', color: '#1A6B3A', fontWeight: 500 }}>✓ Saved successfully</span>}
          {error && <span style={{ fontSize: '13px', color: 'var(--rust)' }}>{error}</span>}
        </div>
      </form>
    </div>
  );
}
