import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import VerificationBanner from '@/components/shared/VerificationBanner';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'client') redirect('/auth/login');

  const { name: userName, id } = session.user;
  const name = userName ?? 'User';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email_verified_at: true },
  });
  const isVerified = !!user?.email_verified_at;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="client" userInitials={initials} userName={name} />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '64px' }} className="lg:!pb-0">
        {!isVerified && <VerificationBanner />}
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="client" />
    </div>
  );
}
