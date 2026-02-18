import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { Card } from '@/components/ui/card';

export default async function CalendarPage(){
  const hearings = await prisma.hearing.findMany({ include:{matter:true}, orderBy:{hearingAt:'asc'}, take:20 });
  return <AppShell><Card><h1 className='font-semibold mb-3'>Calendar</h1><div className='space-y-2'>{hearings.map(h=><div key={h.id} className='rounded-lg border border-white/10 p-2 text-sm'>{new Date(h.hearingAt).toLocaleString()} • {h.matter.title}</div>)}</div></Card></AppShell>
}
