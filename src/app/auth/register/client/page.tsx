'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientRegisterSchema, ClientRegisterData } from '@/lib/utils/validators';
import { STATES } from '@/types';

export default function ClientRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ClientRegisterData>({
    resolver: zodResolver(clientRegisterSchema),
  });

  const onSubmit = async (data: ClientRegisterData) => {
    setLoading(true);
    setError('');

    // 1. Create account via API
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', ...data }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Registration failed');
      setLoading(false);
      return;
    }

    // 2. Auto sign-in after registration
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push('/client/dashboard');
    router.refresh();
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all`;
  const inputStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--rust)' : 'rgba(14,12,10,0.15)',
    background: 'var(--cream)',
  });

  return (
    <div className="bg-white rounded-xl border p-8"
      style={{ borderColor: 'rgba(14,12,10,0.1)', boxShadow: '0 1px 3px rgba(14,12,10,0.06)' }}>
      <div className="mb-6">
        <Link href="/auth/register" className="text-xs flex items-center gap-1 mb-4"
          style={{ color: 'rgba(14,12,10,0.4)' }}>
          ← Back
        </Link>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Create client account
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(14,12,10,0.5)' }}>
          Post your legal matter and find the right advocate
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--rust)', border: '1px solid rgba(192,57,43,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Full Name
          </label>
          <input {...register('full_name')} placeholder="Rajesh Kumar"
            className={inputClass(!!errors.full_name)} style={inputStyle(!!errors.full_name)} />
          {errors.full_name && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Email address
          </label>
          <input {...register('email')} type="email" placeholder="you@example.com"
            className={inputClass(!!errors.email)} style={inputStyle(!!errors.email)} />
          {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Mobile Number
          </label>
          <div className="flex gap-2">
            <span className="px-3 py-2.5 rounded-lg border text-sm flex items-center"
              style={{ borderColor: 'rgba(14,12,10,0.15)', background: 'var(--parchment-2)', color: 'rgba(14,12,10,0.5)' }}>
              +91
            </span>
            <input {...register('phone')} type="tel" placeholder="9876543210"
              className={`flex-1 ${inputClass(!!errors.phone)}`} style={inputStyle(!!errors.phone)} />
          </div>
          {errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>State</label>
            <select {...register('state')}
              className={inputClass(!!errors.state)} style={inputStyle(!!errors.state)}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.state.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>City</label>
            <input {...register('city')} placeholder="Mumbai"
              className={inputClass(!!errors.city)} style={inputStyle(!!errors.city)} />
            {errors.city && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.city.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Password
          </label>
          <input {...register('password')} type="password" placeholder="Min. 8 characters"
            className={inputClass(!!errors.password)} style={inputStyle(!!errors.password)} />
          {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: 'var(--gold)' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-xs text-center mt-4" style={{ color: 'rgba(14,12,10,0.4)' }}>
        By creating an account, you agree to our{' '}
        <a href="#" style={{ color: 'var(--gold)' }}>Terms of Service</a> and{' '}
        <a href="#" style={{ color: 'var(--gold)' }}>Privacy Policy</a>
      </p>
    </div>
  );
}
