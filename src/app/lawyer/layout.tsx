import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

export default async function LawyerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'lawyer') redirect('/auth/login');

  const { role, name: userName, id } = session.user;

  const name = userName ?? 'Advocate';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="lawyer" userInitials={initials} userName={name} />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '64px' }} className="lg:!pb-0">
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="lawyer" />
    </div>
  );
}
