import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AppSidebar from '@/components/shared/AppSidebar';
import AppTopbar from '@/components/shared/AppTopbar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import VerificationBanner from '@/components/shared/VerificationBanner';

export default async function NGOLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ngo') redirect('/auth/login');

  const { name: userName, id } = session.user;

  const [profile, userRecord] = await Promise.all([
    prisma.nGOProfile.findUnique({
      where: { id },
      select: { org_name: true, cause_areas: true },
    }),
    prisma.user.findUnique({
      where: { id },
      select: { email_verified_at: true },
    }),
  ]);

  const displayName = profile?.org_name ?? userName ?? 'NGO';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isVerified = !!userRecord?.email_verified_at;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <AppSidebar role="ngo" userInitials={initials} userName={displayName} subtitle="NGO Portal" />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', paddingBottom: '80px' }} className="lg:!pb-0">
        {!isVerified && <VerificationBanner />}
        <AppTopbar userId={id} />
        {children}
      </main>
      <MobileBottomNav role="ngo" />
    </div>
  );
}
