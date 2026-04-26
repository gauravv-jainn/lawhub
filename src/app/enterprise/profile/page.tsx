'use client';

import { useState, useEffect } from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Other',
];

export default function EnterpriseProfilePage() {
  const [form, setForm] = useState({
    full_name: '', phone: '', firm_name: '', city: '', state: '', website: '', description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      const u = d.profile;
      setForm(f => ({ ...f, full_name: u?.full_name ?? '', phone: u?.phone ?? '', city: u?.city ?? '', state: u?.state ?? '' }));
    });
    fetch('/api/enterprise/profile').then(r => r.json()).then(d => {
      if (d.profile) {
        setForm(f => ({ ...f, firm_name: d.profile.firm_name ?? '', website: d.profile.website ?? '', description: d.profile.description ?? '' }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/enterprise/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError('Failed to save. Please try again.');
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '32px', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>Loading…</div>;

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
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
          Firm Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>Update your firm's public details</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Contact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {field('Admin Name', 'full_name', 'text', 'Your full name')}
            {field('Phone', 'phone', 'tel', '+91 XXXXX XXXXX')}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Firm Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {field('Firm Name', 'firm_name', 'text', 'Full registered firm name')}
            {field('Website', 'website', 'url', 'https://yourfirm.com')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {field('City', 'city', 'text', 'e.g. Delhi')}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>State</label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>About the Firm</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="Brief description of the firm, specialisations, approach…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="submit" disabled={saving}
            style={{ background: 'var(--gold)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontSize: '13px', color: '#1A6B3A', fontWeight: 500 }}>✓ Saved</span>}
          {error && <span style={{ fontSize: '13px', color: 'var(--rust)' }}>{error}</span>}
        </div>
      </form>
    </div>
  );
}
