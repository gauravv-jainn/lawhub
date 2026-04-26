import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'student') redirect('/auth/login');

  const { name: userName, id } = session.user;
  const displayName = userName ?? 'Student';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="student" userInitials={initials} userName={displayName} subtitle="Student Portal" />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '80px' }} className="lg:!pb-0">
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="student" />
    </div>
  );
}
