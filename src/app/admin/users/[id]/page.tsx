import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';
import AdminUserActions from './AdminUserActions';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/auth/login');

  const [userRes, adminLogs] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/users/${params.id}`, {
      cache: 'no-store',
      headers: { Cookie: '' }, // server-to-server — auth handled by session above
    }),
    prisma.adminLog.findMany({
      where: { target_id: params.id, target_type: 'user' },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { admin: { select: { full_name: true } } },
    }),
  ]);

  // Direct DB fetch for reliability (avoids fetch auth issues in server components)
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      city: true,
      state: true,
      role: true,
      suspended: true,
      suspended_reason: true,
      suspended_at: true,
      created_at: true,
      lawyer_profile: {
        select: {
          bci_number: true,
          primary_court: true,
          bar_council: true,
          experience_years: true,
          verification_status: true,
          avg_rating: true,
          review_count: true,
          total_cases: true,
          bci_doc_url: true,
          aadhaar_doc_url: true,
          degree_doc_url: true,
          rejection_reason: true,
        },
      },
    },
  });

  if (!user) notFound();

  const [clientCases, lawyerCases, briefs, proposals, payments] = await Promise.all([
    prisma.case.count({ where: { client_id: params.id } }),
    prisma.case.count({ where: { lawyer_id: params.id } }),
    prisma.brief.count({ where: { client_id: params.id } }),
    prisma.proposal.count({ where: { lawyer_id: params.id } }),
    prisma.payment.findMany({
      where: {
        OR: [{ client_id: params.id }, { lawyer_id: params.id }],
        status: 'released',
      },
      select: { amount: true, status: true },
      take: 50,
    }),
  ]);

  const totalTransacted = payments.reduce((s, p) => s + p.amount, 0);

  const roleColor: Record<string, string> = {
    client: 'var(--teal)',
    lawyer: 'var(--gold)',
    admin: 'var(--rust)',
    enterprise: '#5b21b6',
    ngo: '#0369a1',
  };

  return (
    <div className="page-container">
      <a
        href="/admin/users"
        style={{ fontSize: '13px', color: 'rgba(14,12,10,0.4)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}
      >
        ← Back to Users
      </a>

      {/* Suspension banner */}
      {user.suspended && (
        <div
          style={{
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.25)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🚫</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--rust)' }}>
              This account is suspended
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '2px' }}>
              Reason: {user.suspended_reason} · Suspended{' '}
              {user.suspended_at ? formatRelativeTime(user.suspended_at.toISOString()) : ''}
            </div>
          </div>
        </div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}
        className="user-admin-grid"
      >
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Profile */}
          <div
            style={{
              background: 'white',
              border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: user.suspended ? 'rgba(192,57,43,0.15)' : 'var(--teal)',
                  color: user.suspended ? 'var(--rust)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, flexShrink: 0,
                }}
              >
                {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '24px', fontWeight: 600, color: 'var(--ink)',
                  }}
                >
                  {user.full_name}
                </h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px', padding: '2px 10px', borderRadius: '100px',
                      background: `${roleColor[user.role] ?? 'rgba(14,12,10,0.06)'}20`,
                      color: roleColor[user.role] ?? 'rgba(14,12,10,0.5)',
                      fontWeight: 600, border: `1px solid ${roleColor[user.role] ?? 'rgba(14,12,10,0.1)'}40`,
                    }}
                  >
                    {user.role}
                  </span>
                  {user.suspended && (
                    <span
                      style={{
                        fontSize: '11px', padding: '2px 10px', borderRadius: '100px',
                        background: 'rgba(192,57,43,0.1)', color: 'var(--rust)', fontWeight: 600,
                      }}
                    >
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            </div>

            {[
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phone ?? '—' },
              { label: 'Location', value: user.city && user.state ? `${user.city}, ${user.state}` : '—' },
              { label: 'Member Since', value: formatDate(user.created_at.toISOString()) },
              { label: 'User ID', value: user.id, mono: true },
            ].map(({ label, value, mono }) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: '10px', marginBottom: '10px',
                  borderBottom: '1px solid rgba(14,12,10,0.05)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Lawyer profile */}
          {user.lawyer_profile && (
            <div
              style={{
                background: 'white',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
                }}
              >
                Advocate Profile
              </h3>

              <div
                style={{
                  display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap',
                }}
              >
                <StatusBadge status={user.lawyer_profile.verification_status} />
                {user.lawyer_profile.rejection_reason && (
                  <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)' }}>
                    Rejected: {user.lawyer_profile.rejection_reason}
                  </span>
                )}
              </div>

              {[
                { label: 'BCI Number',    value: user.lawyer_profile.bci_number },
                { label: 'Bar Council',   value: user.lawyer_profile.bar_council },
                { label: 'Primary Court', value: user.lawyer_profile.primary_court },
                { label: 'Experience',    value: `${user.lawyer_profile.experience_years} years` },
                { label: 'Avg. Rating',   value: user.lawyer_profile.avg_rating ? `★ ${user.lawyer_profile.avg_rating.toFixed(1)}` : '—' },
                { label: 'Reviews',       value: user.lawyer_profile.review_count },
                { label: 'Total Cases',   value: user.lawyer_profile.total_cases },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingBottom: '10px', marginBottom: '10px',
                    borderBottom: '1px solid rgba(14,12,10,0.05)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{value}</span>
                </div>
              ))}

              {/* Document links */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {user.lawyer_profile.bci_doc_url && (
                  <a href={user.lawyer_profile.bci_doc_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--teal)', textDecoration: 'none' }}>
                    📄 BCI Document
                  </a>
                )}
                {user.lawyer_profile.aadhaar_doc_url && (
                  <a href={user.lawyer_profile.aadhaar_doc_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--teal)', textDecoration: 'none' }}>
                    📄 Aadhaar
                  </a>
                )}
                {user.lawyer_profile.degree_doc_url && (
                  <a href={user.lawyer_profile.degree_doc_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--teal)', textDecoration: 'none' }}>
                    📄 Degree
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Activity summary */}
          <div
            style={{
              background: 'white',
              border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
              }}
            >
              Activity Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { label: 'Briefs Posted', value: briefs },
                { label: 'Proposals Sent', value: proposals },
                { label: 'Cases as Client', value: clientCases },
                { label: 'Cases as Advocate', value: lawyerCases },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: '14px', background: 'var(--cream)', borderRadius: '8px', textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '22px', fontWeight: 700, color: 'var(--ink)',
                    }}
                  >
                    {value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin log */}
          {adminLogs.length > 0 && (
            <div
              style={{
                background: 'white',
                border: '1px solid rgba(14,12,10,0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px',
                }}
              >
                Moderation History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px', background: 'var(--cream)', borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
                          {log.action.replace(/_/g, ' ')}
                        </div>
                        {log.notes && (
                          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '2px' }}>
                            {log.notes}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', marginTop: '4px' }}>
                          by {log.admin.full_name}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(log.created_at.toISOString())}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AdminUserActions
            userId={params.id}
            isSuspended={user.suspended}
            userRole={user.role}
            userName={user.full_name}
          />

          {/* Quick links */}
          <div
            style={{
              background: 'white',
              border: '1px solid rgba(14,12,10,0.08)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div
              style={{
                fontSize: '11px', color: 'rgba(14,12,10,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px',
              }}
            >
              Quick Links
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {user.role === 'lawyer' && (
                <a
                  href={`/admin/lawyers`}
                  style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}
                >
                  → Verification Queue
                </a>
              )}
              <a
                href={`/admin/cases`}
                style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}
              >
                → All Cases
              </a>
              <a
                href={`/admin/disputes`}
                style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}
              >
                → Disputes
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .user-admin-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
