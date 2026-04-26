'use client';

import { useState, useEffect } from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Other',
];

export default function StudentProfilePage() {
  const [form, setForm] = useState({ full_name: '', phone: '', city: '', state: '' });
  const [email, setEmail] = useState('');
  const [lawSchool, setLawSchool] = useState('');
  const [year, setYear] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      const u = d.profile;
      setEmail(u?.email ?? '');
      setForm({ full_name: u?.full_name ?? '', phone: u?.phone ?? '', city: u?.city ?? '', state: u?.state ?? '' });
      setLawSchool(d.studentProfile?.law_school ?? '');
      setYear(d.studentProfile?.year ?? '');
      setSkills(d.studentProfile?.skills?.join(', ') ?? '');
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        law_school: lawSchool,
        year,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError('Failed to save. Please try again.');
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '32px', color: 'rgba(14,12,10,0.4)', fontSize: '14px' }}>Loading…</div>;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>

        {/* Email (read-only) */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>Email (cannot be changed)</div>
          <div style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>{email}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Personal Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {(['full_name', 'phone'] as const).map(key => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>
                    {key === 'full_name' ? 'Full Name' : 'Phone'}
                  </label>
                  <input
                    type={key === 'phone' ? 'tel' : 'text'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === 'phone' ? '+91 XXXXX XXXXX' : 'Your full name'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>City</label>
                <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Mumbai"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>State</label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>Academic Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>
                Law School
              </label>
              <input
                type="text"
                value={lawSchool}
                onChange={e => setLawSchool(e.target.value)}
                placeholder="e.g. National Law School of India"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>
                Year of Study
              </label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none' }}
              >
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="Final Year">Final Year</option>
                <option value="LLM">LLM</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.55)', marginBottom: '6px' }}>
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="e.g. Legal Research, Contract Drafting, Moot Court"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(14,12,10,0.15)', borderRadius: '8px', fontSize: '13px', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
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
