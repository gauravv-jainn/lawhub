import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ClientProfileForm from './ClientProfileForm';

export default async function ClientProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const profile = await prisma.user.findUnique({
    where: { id: userId },
  });

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        Account Settings
      </h1>
      <ClientProfileForm profile={profile as any} email={session.user.email ?? ''} />
    </div>
  );
}
