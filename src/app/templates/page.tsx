import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { Card } from '@/components/ui/card';

export default async function TemplatesPage(){
  const templates = await prisma.template.findMany({ orderBy:{updatedAt:'desc'} });
  return <AppShell><Card><h1 className='font-semibold mb-3'>Templates</h1><div className='space-y-2'>{templates.map(t=><div key={t.id} className='rounded-lg border border-white/10 p-2'><p className='font-medium'>{t.name}</p><p className='text-xs opacity-70'>{t.templateType}</p></div>)}</div></Card></AppShell>
}
