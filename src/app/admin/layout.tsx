import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSignOutButton from './AdminSignOutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  if (session.user.role !== 'admin') redirect('/');

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Lawyer Verification', href: '/admin/lawyers' },
    { label: 'Brief Moderation', href: '/admin/briefs' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Revenue', href: '/admin/revenue' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
      <aside style={{ width: '220px', background: 'var(--ink-2)', minHeight: '100vh', padding: '20px 10px', flexShrink: 0 }}>
        <div style={{ padding: '10px', marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--cream)' }}>LawHub</div>
          <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Panel</div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: 'calc(100vh - 80px)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} style={{
                display: 'block', padding: '9px 10px', borderRadius: '8px',
                textDecoration: 'none', fontSize: '13px', color: 'rgba(245,240,232,0.6)',
                transition: 'background 0.15s ease',
              }}>
                {item.label}
              </Link>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.08)', paddingTop: '8px' }}>
            <AdminSignOutButton />
          </div>
        </nav>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
