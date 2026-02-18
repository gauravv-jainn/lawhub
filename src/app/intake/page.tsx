'use client';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function IntakePage() {
  const [facts, setFacts] = useState('');
  const [brief, setBrief] = useState<any>(null);
  return <AppShell><div className='space-y-4'>
    <Card className='space-y-3'><h1 className='font-semibold'>Intake to Brief Builder</h1><textarea className='w-full h-40 rounded-xl border border-white/10 bg-transparent p-3' placeholder='Enter case facts' value={facts} onChange={(e)=>setFacts(e.target.value)} /><Button onClick={async()=>{const res=await fetch('/api/ai/summary',{method:'POST',body:JSON.stringify({input:facts})});setBrief(await res.json());}}>Generate Brief</Button></Card>
    {brief && <Card><h2 className='font-semibold mb-2'>Generated Brief</h2><pre className='text-xs whitespace-pre-wrap'>{JSON.stringify(brief,null,2)}</pre><p className='text-xs mt-2 opacity-70'>AI output is a drafting aid. Review and verify before use.</p></Card>}
  </div></AppShell>;
}
