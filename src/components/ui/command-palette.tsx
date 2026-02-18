'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Clients', href: '/clients' },
  { label: 'Matters', href: '/matters' },
  { label: 'New Intake', href: '/intake' }
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!open) return null;
  return <div className='fixed inset-0 bg-black/40 z-50 grid place-items-start pt-20' onClick={() => setOpen(false)}><div className='w-full max-w-lg rounded-2xl bg-panel border border-white/10 p-3' onClick={(e)=>e.stopPropagation()}>{items.map((i)=><button key={i.href} className='w-full text-left p-3 hover:bg-white/10 rounded-lg' onClick={()=>{router.push(i.href);setOpen(false);}}>{i.label}</button>)}</div></div>;
}
