'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { STATES, FIRM_TYPES } from '@/types';

export default function EnterpriseRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firm_name: '', contact_name: '', email: '', phone: '',
    password: '', firm_type: 'law_firm', registration_no: '',
    website: '', city: '', state: '', description: '',
  });

  const inp = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value })),
  });

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all';
  const inputStyle = { borderColor: 'rgba(14,12,10,0.15)', background: 'var(--cream)' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firm_name || !form.contact_name || !form.email || !form.password || !form.registration_no) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'enterprise', ...form }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Registration failed'); setLoading(false); return; }

    await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    router.push('/enterprise/dashboard');
    router.refresh();
  };

  return (
    <div className="bg-white rounded-xl border p-8"
      style={{ borderColor: 'rgba(14,12,10,0.1)', boxShadow: '0 1px 3px rgba(14,12,10,0.06)' }}>
      <Link href="/auth/register" className="text-xs flex items-center gap-1 mb-4"
        style={{ color: 'rgba(14,12,10,0.4)' }}>← Back</Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: 'rgba(52,73,94,0.1)' }}>🏢</div>
        <div>
          <h1 className="font-serif text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            Law Firm / Enterprise Registration
          </h1>
          <p className="text-xs" style={{ color: 'rgba(14,12,10,0.5)' }}>
            Your account will be reviewed within 24 hours
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--rust)', border: '1px solid rgba(192,57,43,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Firm Name <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...inp('firm_name')} placeholder="Sharma & Associates" className={inputClass} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Firm Type
            </label>
            <select {...inp('firm_type')} className={inputClass} style={inputStyle}>
              {FIRM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Registration / Bar Council No. <span style={{ color: 'var(--rust)' }}>*</span>
          </label>
          <input {...inp('registration_no')} placeholder="MH/LF/2024/001" className={inputClass} style={inputStyle} required />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Contact Person Name <span style={{ color: 'var(--rust)' }}>*</span>
          </label>
          <input {...inp('contact_name')} placeholder="Adv. Rahul Sharma" className={inputClass} style={inputStyle} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
              Email <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input {...inp('email')} type="email" placeholder="firm@example.com" className={inputClass} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Phone</label>
            <div className="flex gap-2">
              <span className="px-2 py-2.5 rounded-lg border text-xs flex items-center"
                style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--parchment-2)', color: 'rgba(14,12,10,0.5)' }}>+91</span>
              <input {...inp('phone')} type="tel" placeholder="9876543210" className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Password <span style={{ color: 'var(--rust)' }}>*</span>
          </label>
          <input {...inp('password')} type="password" placeholder="Min. 8 characters" className={inputClass} style={inputStyle} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>City</label>
            <input {...inp('city')} placeholder="Mumbai" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>State</label>
            <select {...inp('state')} className={inputClass} style={inputStyle}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>Website</label>
          <input {...inp('website')} type="url" placeholder="https://yourfirm.com" className={inputClass} style={inputStyle} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink)' }}>About the Firm</label>
          <textarea {...inp('description')} rows={3} placeholder="Brief description of your firm's practice areas and expertise"
            className={inputClass} style={inputStyle} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--gold)' }}>
          {loading ? 'Creating account…' : 'Register Firm →'}
        </button>
        <p className="text-xs text-center" style={{ color: 'rgba(14,12,10,0.4)' }}>
          Your account will be under review. You can manage associates once verified.
        </p>
      </form>
    </div>
  );
}
