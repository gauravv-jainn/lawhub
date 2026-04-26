import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/formatDate';
import { redirect } from 'next/navigation';

export default async function EnterpriseDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [profile, associates, internships, pendingApps] = await Promise.all([
    prisma.enterpriseProfile.findUnique({ where: { id: userId } }),
    prisma.enterpriseAssociate.findMany({
      where: { enterprise_id: userId },
      include: {
        lawyer: {
          include: {
            user: { select: { full_name: true, avatar_url: true, city: true, state: true, email: true } },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    }),
    prisma.internshipPosting.findMany({
      where: { enterprise_id: userId, status: 'active' },
      include: { _count: { select: { applications: true } } },
      orderBy: { created_at: 'desc' },
      take: 3,
    }),
    prisma.internshipApplication.count({
      where: { posting: { enterprise_id: userId }, status: 'pending' },
    }),
  ]);

  const roleGroups: Record<string, typeof associates> = {};
  for (const a of associates) {
    const r = a.role ?? 'associate';
    if (!roleGroups[r]) roleGroups[r] = [];
    roleGroups[r].push(a);
  }

  const ROLE_ORDER = ['partner', 'associate', 'intern'];
  const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
    partner:   { bg: 'rgba(184,134,11,0.12)',  text: 'var(--gold)' },
    associate: { bg: 'rgba(13,115,119,0.1)',   text: 'var(--teal)' },
    intern:    { bg: 'rgba(155,89,182,0.1)',   text: 'rgba(155,89,182,0.85)' },
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)' }}>
                {profile?.firm_name ?? 'Firm Overview'}
              </h1>
              {profile?.verification_status === 'verified' && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(26,107,58,0.1)', color: '#1A6B3A' }}>
                  ✓ Verified
                </span>
              )}
              {profile?.verification_status === 'pending' && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(212,160,23,0.1)', color: 'var(--gold)' }}>
                  ⏳ Under Review
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
              {profile?.city}{profile?.city && profile?.state ? ', ' : ''}{profile?.state}
              {profile?.firm_type && (
                <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                  · {profile.firm_type.replace('_', ' ')}
                </span>
              )}
            </p>
          </div>
          <Link href="/enterprise/internships/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            + Post Internship
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="dash-stats-3">
        {[
          { label: 'Team Members', value: associates.length, icon: '👥', color: 'rgba(52,73,94,0.08)', href: '/enterprise/associates' },
          { label: 'Active Internships', value: internships.length, icon: '🎓', color: 'rgba(184,134,11,0.08)', href: '/enterprise/internships' },
          { label: 'Pending Applications', value: pendingApps, icon: '📋', color: 'rgba(13,115,119,0.08)', href: '/enterprise/internships' },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', marginTop: '4px' }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-grid-2">

        {/* Team by role */}
        <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
              Team
            </h2>
            <Link href="/enterprise/associates" style={{ fontSize: '12px', color: 'var(--gold)', textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>

          {associates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(14,12,10,0.35)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              No team members yet.{' '}
              <Link href="/enterprise/associates" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Add your first →</Link>
            </div>
          ) : (
            <div>
              {ROLE_ORDER.filter(r => roleGroups[r]?.length).map(role => {
                const color = ROLE_COLOR[role] ?? { bg: 'rgba(14,12,10,0.06)', text: 'rgba(14,12,10,0.5)' };
                return (
                  <div key={role} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', padding: '2px 8px', borderRadius: '20px', background: color.bg, color: color.text }}>
                        {role}s
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(14,12,10,0.3)' }}>{roleGroups[role].length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {roleGroups[role].slice(0, 3).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'var(--cream)' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                            {a.lawyer.user.full_name[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.lawyer.user.full_name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                              {a.lawyer.experience_years}y · {a.lawyer.practice_areas.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {roleGroups[role].length > 3 && (
                        <p style={{ fontSize: '11px', color: 'rgba(14,12,10,0.35)', paddingLeft: '10px' }}>
                          +{roleGroups[role].length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active internships + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick actions */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { href: '/enterprise/associates', icon: '➕', label: 'Add team member', desc: 'Invite an advocate by email' },
                { href: '/enterprise/internships/new', icon: '📝', label: 'Post internship', desc: 'Create a new opening' },
                { href: '/network', icon: '🔍', label: 'Browse advocates', desc: 'Find lawyers for your firm' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'var(--cream)', textDecoration: 'none', transition: 'background 0.15s' }}>
                  <span style={{ fontSize: '18px' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{a.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Active internships */}
          <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                Active Internships
              </h2>
              <Link href="/enterprise/internships" style={{ fontSize: '12px', color: 'var(--gold)', textDecoration: 'none' }}>View all →</Link>
            </div>
            {internships.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(14,12,10,0.35)', textAlign: 'center', padding: '16px 0' }}>
                No active postings.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {internships.map(p => (
                  <Link key={p.id} href={`/enterprise/internships/${p.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'var(--cream)', textDecoration: 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{p.title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginTop: '1px' }}>
                        {p.duration} {p.remote ? '· Remote' : p.location ? `· ${p.location}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                        {p._count.applications}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.35)' }}>applicants</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
