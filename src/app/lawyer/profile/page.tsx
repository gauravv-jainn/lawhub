import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RatingStars from '@/components/shared/RatingStars';

export default async function LawyerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const userId = session.user.id;

  const [profile, lawyer, firmMembership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.lawyerProfile.findUnique({ where: { id: userId } }),
    prisma.enterpriseAssociate.findUnique({
      where: { lawyer_id: userId },
      include: {
        enterprise: {
          include: { user: { select: { city: true, state: true } } },
        },
      },
    }),
  ]);

  const verificationDocs = [
    { label: 'BCI Certificate', url: lawyer?.bci_doc_url, key: 'bci' },
    { label: 'Aadhaar Card', url: lawyer?.aadhaar_doc_url, key: 'aadhaar' },
    { label: 'Degree Certificate', url: lawyer?.degree_doc_url, key: 'degree' },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          My Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.45)' }}>
          Public profile and verification status
        </p>
      </div>

      {/* Verification status banner */}
      <div style={{
        background: lawyer?.verification_status === 'verified' ? 'rgba(26,107,58,0.06)' : 'rgba(212,160,23,0.06)',
        border: `1px solid ${lawyer?.verification_status === 'verified' ? 'rgba(26,107,58,0.2)' : 'rgba(212,160,23,0.2)'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <span style={{ fontSize: '24px' }}>{lawyer?.verification_status === 'verified' ? '✅' : '⏳'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
            {lawyer?.verification_status === 'verified' ? 'Account Verified' : 'Verification Pending'}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.55)', marginTop: '2px' }}>
            {lawyer?.verification_status === 'verified'
              ? 'Your BCI credentials have been verified. You have full platform access.'
              : 'Our team is reviewing your documents. This typically takes 24 hours.'}
          </div>
        </div>
      </div>

      {/* Firm membership */}
      {firmMembership && (
        <div style={{
          background: 'rgba(52,73,94,0.04)', border: '1px solid rgba(52,73,94,0.14)',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <span style={{ fontSize: '24px' }}>🏢</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
              {firmMembership.enterprise.firm_name}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', marginTop: '2px' }}>
              Member since {new Date(firmMembership.joined_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              {firmMembership.enterprise.user.city && ` · ${firmMembership.enterprise.user.city}`}
              {firmMembership.enterprise.user.state && `, ${firmMembership.enterprise.user.state}`}
            </div>
          </div>
          <span style={{
            fontSize: '11px', padding: '4px 12px', borderRadius: '20px',
            background: 'rgba(52,73,94,0.1)', color: 'rgba(52,73,94,0.8)',
            fontWeight: 600, textTransform: 'capitalize',
          }}>
            {firmMembership.role}
          </span>
        </div>
      )}

      {/* Profile card */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--teal)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif",
          }}>
            {(profile?.full_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>
              {profile?.full_name}
            </h2>
            <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.5)', marginBottom: '6px' }}>
              {lawyer?.primary_court} · BCI {lawyer?.bci_number}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {lawyer?.lawyer_type && (
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(13,115,119,0.08)', color: 'var(--teal)', fontWeight: 500 }}>
                  {{
                    junior_advocate: 'Junior Advocate',
                    senior_advocate: 'Senior Advocate',
                    associate: 'Associate',
                  }[lawyer.lawyer_type] ?? lawyer.lawyer_type}
                </span>
              )}
              {lawyer?.only_legal_advice && (
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(184,134,11,0.08)', color: 'var(--gold)', fontWeight: 500 }}>
                  💬 Legal Advice Only
                </span>
              )}
            </div>
            <RatingStars rating={lawyer?.avg_rating ?? 0} count={lawyer?.review_count} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {[
            { label: 'Bar Council', value: lawyer?.bar_council },
            { label: 'Experience', value: `${lawyer?.experience_years ?? 0} years` },
            { label: 'Total Cases', value: lawyer?.total_cases ?? 0 },
            { label: 'Win Rate', value: (lawyer?.total_cases ?? 0) > 0 ? `${Math.round(((lawyer?.wins ?? 0) / (lawyer?.total_cases ?? 1)) * 100)}%` : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Practice areas */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(14,12,10,0.5)', marginBottom: '10px' }}>Practice Areas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {((lawyer?.practice_areas as string[]) ?? []).map((area: string) => (
              <span key={area} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Verification documents */}
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Verification Documents
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {verificationDocs.map(doc => (
            <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{doc.label}</span>
              {doc.url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#1A6B3A', fontWeight: 500 }}>✓ Uploaded</span>
                  <a href={doc.url} target="_blank" rel="noopener" style={{ fontSize: '12px', color: 'var(--gold)' }}>View</a>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--rust)' }}>Not uploaded</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
