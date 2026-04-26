import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:     { bg: 'rgba(184,134,11,0.1)',  text: 'var(--gold)' },
  accepted:    { bg: 'rgba(26,107,58,0.1)',   text: '#1A6B3A' },
  shortlisted: { bg: 'rgba(13,115,119,0.1)', text: 'var(--teal)' },
  rejected:    { bg: 'rgba(192,57,43,0.08)', text: 'var(--rust)' },
  reviewed:    { bg: 'rgba(52,73,94,0.08)',  text: 'rgba(52,73,94,0.7)' },
};

export default async function StudentApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const applications = await prisma.internshipApplication.findMany({
    where: { applicant_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      posting: {
        include: {
          enterprise: { select: { firm_name: true, city: true, state: true } },
        },
      },
    },
  });

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Applications
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Track all your internship applications
        </p>
      </div>

      {applications.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            No applications yet
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)', marginBottom: '20px' }}>
            Browse internships and apply to kick-start your legal career.
          </p>
          <Link href="/student/internships"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            Browse Internships
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.map(app => {
            const sc = STATUS_COLOR[app.status] ?? STATUS_COLOR.pending;
            return (
              <div key={app.id} style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                      {app.posting.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginBottom: '8px' }}>
                      {app.posting.enterprise.firm_name}
                      {app.posting.enterprise.city && ` · ${app.posting.enterprise.city}`}
                      {app.posting.enterprise.state && `, ${app.posting.enterprise.state}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.35)' }}>
                      Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {app.posting.duration && ` · ${app.posting.duration}`}
                      {app.posting.remote && ' · Remote'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: sc.bg, color: sc.text, textTransform: 'capitalize', flexShrink: 0 }}>
                    {app.status}
                  </span>
                </div>
                {app.cover_letter && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--cream)', borderRadius: '8px', fontSize: '12px', color: 'rgba(14,12,10,0.55)', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'rgba(14,12,10,0.4)', display: 'block', marginBottom: '4px' }}>Your cover letter</span>
                    {app.cover_letter.slice(0, 200)}{app.cover_letter.length > 200 ? '…' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
