/**
 * /auth/suspended — shown to users whose accounts have been suspended.
 * Middleware redirects suspended users here from any protected route.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function SuspendedPage() {
  const session = await getServerSession(authOptions);

  // If not logged in, send to login
  if (!session?.user) redirect('/auth/login');

  // If not actually suspended, send home (race condition / stale token)
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { suspended: true, suspended_reason: true },
  });
  if (!user?.suspended) {
    const ROLE_HOME: Record<string, string> = {
      client: '/client/dashboard', lawyer: '/lawyer/dashboard',
      enterprise: '/enterprise/dashboard', ngo: '/ngo/dashboard',
      admin: '/admin/dashboard',
    };
    redirect(ROLE_HOME[session.user.role] ?? '/client/dashboard');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          padding: '48px 40px',
          border: '1px solid rgba(192,57,43,0.15)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: '12px',
          }}
        >
          Account Suspended
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.6, marginBottom: '24px' }}>
          Your LawHub account has been suspended and you cannot access the platform at this time.
        </p>

        {user.suspended_reason && (
          <div
            style={{
              background: 'rgba(192,57,43,0.05)',
              border: '1px solid rgba(192,57,43,0.15)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Reason
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {user.suspended_reason}
            </div>
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)', marginBottom: '28px' }}>
          If you believe this is an error or wish to appeal, please contact our support team.
        </p>

        <a
          href="mailto:support@lawhub.in"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--ink)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Contact Support
        </a>

        <div style={{ marginTop: '24px' }}>
          <a
            href="/api/auth/signout"
            style={{ fontSize: '12px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none' }}
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
