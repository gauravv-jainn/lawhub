import { AppShell } from '@/components/layout/app-shell';
import { prisma } from '@/lib/db/prisma';
import { Card } from '@/components/ui/card';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  return <AppShell><Card><h1 className='font-semibold mb-4'>Clients</h1><div className='overflow-auto'><table className='w-full text-sm'><thead className='sticky top-0 bg-panel'><tr><th className='text-left py-2'>Name</th><th className='text-left'>Phone</th><th className='text-left'>Email</th></tr></thead><tbody>{clients.map(c=><tr key={c.id} className='border-t border-white/10'><td className='py-2'>{c.fullName}</td><td>{c.phone}</td><td>{c.email}</td></tr>)}</tbody></table></div></Card></AppShell>;
}
