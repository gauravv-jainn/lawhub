'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginData } from '@/lib/utils/validators';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    // Fetch session to get role for redirect
    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (redirect) {
      router.push(redirect);
    } else if (role === 'lawyer') {
      router.push('/lawyer/dashboard');
    } else if (role === 'enterprise') {
      router.push('/enterprise/dashboard');
    } else if (role === 'ngo') {
      router.push('/ngo/dashboard');
    } else if (role === 'student') {
      router.push('/student/internships');
    } else if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/client/dashboard');
    }
    router.refresh();
  };

  return (
    <div className="bg-white rounded-xl border p-8"
      style={{ borderColor: 'rgba(14,12,10,0.1)', boxShadow: '0 1px 3px rgba(14,12,10,0.06)' }}>
      <h1 className="font-serif text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        Welcome back
      </h1>
      <p className="text-sm mb-6" style={{ color: 'rgba(14,12,10,0.5)' }}>
        Sign in to your LawHub account
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--rust)', border: '1px solid rgba(192,57,43,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
            Email address
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2"
            style={{
              borderColor: errors.email ? 'var(--rust)' : 'rgba(14,12,10,0.15)',
              background: 'var(--cream)',
            }}
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Password</label>
            <a href="#" className="text-xs" style={{ color: 'var(--gold)' }}>Forgot password?</a>
          </div>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              borderColor: errors.password ? 'var(--rust)' : 'rgba(14,12,10,0.15)',
              background: 'var(--cream)',
            }}
          />
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: 'var(--rust)' }}>{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: 'var(--gold)' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm" style={{ color: 'rgba(14,12,10,0.5)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" style={{ color: 'var(--gold)', fontWeight: 500 }}>
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-xl border p-8 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
