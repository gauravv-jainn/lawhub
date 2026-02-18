import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { Card } from '@/components/ui/card';

export default async function MattersPage(){
  const matters = await prisma.matter.findMany({ include:{client:true}, orderBy:{updatedAt:'desc'} });
  return <AppShell><Card><h1 className='font-semibold mb-4'>Matters</h1><div className='space-y-2'>{matters.map(m=><Link key={m.id} href={`/matters/${m.id}`} className='block rounded-xl border border-white/10 p-3 hover:bg-white/5'><p className='font-medium'>{m.title}</p><p className='text-xs opacity-70'>{m.caseNumber} • {m.courtName} • {m.stage}</p></Link>)}</div></Card></AppShell>;
}
