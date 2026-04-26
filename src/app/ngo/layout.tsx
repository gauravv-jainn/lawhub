import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

export default async function NGOLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ngo') redirect('/auth/login');

  const { name: userName, id } = session.user;

  const profile = await prisma.nGOProfile.findUnique({
    where: { id },
    select: { org_name: true, cause_areas: true },
  });

  const displayName = profile?.org_name ?? userName ?? 'NGO';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="ngo" userInitials={initials} userName={displayName} subtitle="NGO Portal" />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '80px' }} className="lg:!pb-0">
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="ngo" />
    </div>
  );
}
