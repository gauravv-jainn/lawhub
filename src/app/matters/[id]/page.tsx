import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function healthScore(m: any) {
  let score = 100;
  if (m.status === 'STAYED') score -= 20;
  if (!m.nextHearingAt) score -= 15;
  if (m.deadlines.some((d: any) => d.status === 'MISSED')) score -= 35;
  if (m.tasks.some((t: any) => t.status === 'BLOCKED')) score -= 20;
  return Math.max(0, score);
}

export default async function MatterDetail({ params }: { params: { id: string } }) {
  const matter = await prisma.matter.findUnique({ where: { id: params.id }, include: { client: true, hearings: true, deadlines: true, tasks: true, documents: true, drafts: true } });
  if (!matter) notFound();
  const score = healthScore(matter);
  return <AppShell><div className='space-y-4'>
    <Card><div className='flex justify-between items-start'><div><h1 className='text-xl font-semibold'>{matter.title}</h1><p className='text-sm opacity-70'>{matter.caseNumber} • {matter.courtName}</p></div><Badge>{matter.stage}</Badge></div></Card>
    <div className='grid lg:grid-cols-3 gap-4'>
      <Card><h2 className='font-semibold'>Case Health Score</h2><p className={`text-4xl mt-2 font-bold ${score<50?'text-red-500':'text-green-500'}`}>{score}</p><p className='text-xs opacity-70 mt-2'>Based on deadlines, blocked tasks, and hearing cadence.</p></Card>
      <Card className='lg:col-span-2'><h2 className='font-semibold mb-2'>Timeline</h2><ul className='space-y-2 text-sm'>{matter.hearings.map(h=><li key={h.id} className='rounded-lg border border-white/10 p-2'>Hearing: {new Date(h.hearingAt).toLocaleDateString()} - {h.purpose}</li>)}</ul></Card>
    </div>
    <Card><h2 className='font-semibold mb-2'>AI Intelligence</h2><p className='text-sm opacity-80'>AI output is a drafting aid. Review and verify before use.</p></Card>
  </div></AppShell>;
}
