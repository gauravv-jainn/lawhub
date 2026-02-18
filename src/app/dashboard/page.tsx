import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { Card } from '@/components/ui/card';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const [matters, deadlines, tasks] = await Promise.all([
    prisma.matter.findMany({ orderBy: { updatedAt: 'desc' }, take: 50 }),
    prisma.deadline.findMany({ where: { status: 'OPEN' }, orderBy: { dueAt: 'asc' }, take: 6, include: { matter: true } }),
    prisma.task.findMany({ where: { status: { in: ['TODO','IN_PROGRESS','BLOCKED'] } }, take: 6 })
  ]);
  const kpis = [
    { label: 'Total Matters', value: matters.length },
    { label: 'Active', value: matters.filter(m=>m.status==='ACTIVE').length },
    { label: 'Closed', value: matters.filter(m=>m.status==='CLOSED').length },
    { label: 'Stayed', value: matters.filter(m=>m.status==='STAYED').length }
  ];
  return <AppShell><div className='space-y-4'>
    <KpiGrid items={kpis} />
    <div className='grid lg:grid-cols-3 gap-4'>
      <Card className='lg:col-span-2'><h2 className='font-semibold mb-3'>Upcoming Deadlines & Hearings</h2><div className='space-y-2'>{deadlines.map(d=><div className='flex justify-between rounded-lg border border-white/10 p-2' key={d.id}><div><p className='text-sm font-medium'>{d.title}</p><p className='text-xs opacity-70'>{d.matter.title}</p></div><Badge>{new Date(d.dueAt).toLocaleDateString()}</Badge></div>)}</div></Card>
      <Card><h2 className='font-semibold mb-3'>At Risk</h2><ul className='space-y-2 text-sm'>{tasks.map(t=><li key={t.id} className='rounded-lg bg-red-500/10 border border-red-400/20 p-2'>{t.title}</li>)}</ul></Card>
    </div>
    <Card><p className='text-xs opacity-80'>AI output is a drafting aid. Review and verify before use.</p></Card>
  </div></AppShell>;
}
