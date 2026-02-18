'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@civilcaseos.in');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <div className='min-h-screen grid place-items-center p-4'>
      <form className='w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-6 space-y-3' onSubmit={async (e)=>{e.preventDefault(); const res=await signIn('credentials',{email,password,redirect:false}); if(res?.ok) router.push('/dashboard'); else setError('Invalid credentials');}}>
        <h1 className='text-xl font-semibold'>Welcome to CivilCaseOS</h1>
        <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder='Email' />
        <Input type='password' value={password} onChange={(e)=>setPassword(e.target.value)} placeholder='Password' />
        {error && <p className='text-red-500 text-sm'>{error}</p>}
        <Button type='submit' className='w-full'>Login</Button>
      </form>
    </div>
  );
}
