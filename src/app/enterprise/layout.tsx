import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

export default async function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'enterprise') redirect('/auth/login');

  const { name: userName, id } = session.user;

  const profile = await prisma.enterpriseProfile.findUnique({
    where: { id },
    select: { firm_name: true, firm_type: true },
  });

  const displayName = profile?.firm_name ?? userName ?? 'Firm';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const subtitle = profile?.firm_type === 'corporate' ? 'Corporate Portal' : 'Firm Portal';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="enterprise" userInitials={initials} userName={displayName} subtitle={subtitle} />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '80px' }} className="lg:!pb-0">
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="enterprise" />
    </div>
  );
}
