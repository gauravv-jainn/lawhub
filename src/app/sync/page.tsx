'use client';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SyncPage(){
  const [text,setText]=useState('caseNumber,nextHearingAt,status\nCS/1024/2026,2026-02-25,ACTIVE');
  const [result,setResult]=useState<any>(null);
  return <AppShell><div className='space-y-4'>
    <Card><h1 className='font-semibold'>Court Status Sync</h1><p className='text-sm opacity-70'>Modes: Manual update, CSV import/export, pluggable connector interface (stub).</p></Card>
    <Card className='space-y-2'><textarea className='w-full h-36 rounded-xl border border-white/10 bg-transparent p-3' value={text} onChange={(e)=>setText(e.target.value)} /><Button onClick={async()=>{const res=await fetch('/api/sync/csv',{method:'POST',body:text});setResult(await res.json());}}>Import CSV</Button>{result&&<pre className='text-xs'>{JSON.stringify(result,null,2)}</pre>}</Card>
  </div></AppShell>
}
