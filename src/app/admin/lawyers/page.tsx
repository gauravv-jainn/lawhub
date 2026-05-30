import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils/formatDate';
import LawyerVerificationActions from './LawyerVerificationActions';

export default async function AdminLawyersPage() {
  const lawyers = await prisma.lawyerProfile.findMany({
    orderBy: [{ verification_status: 'asc' }, { created_at: 'asc' }],
    include: {
      user: { select: { full_name: true, email: true, phone: true, created_at: true } },
    },
  });

  const allLawyers = (lawyers ?? []) as any[];
  const pending = allLawyers.filter(l => l.verification_status === 'pending');
  const verified = allLawyers.filter(l => l.verification_status === 'verified');
  const rejected = allLawyers.filter(l => l.verification_status === 'rejected');

  function LawyerRow({ lawyer }: { lawyer: typeof allLawyers[0] }) {
    const profile = lawyer.user;
    return (
      <div style={{ background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '12px', padding: '20px 24px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
              {profile?.full_name}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>BCI: {lawyer.bci_number || 'Not provided'}</span>
              <span>{lawyer.bar_council}</span>
              <span>{lawyer.primary_court}</span>
              <span>{lawyer.experience_years} yrs exp</span>
              <span>Registered {formatDate(profile?.created_at?.toISOString())}</span>
            </div>
            {lawyer.practice_areas?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {lawyer.practice_areas.map((area: string) => (
                  <span key={area} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(13,115,119,0.1)', color: 'var(--teal)', fontWeight: 500 }}>
                    {area}
                  </span>
                ))}
              </div>
            )}
            {/* Documents */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(14,12,10,0.06)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(14,12,10,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Verification Documents
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'BCI Certificate', url: lawyer.bci_doc_url },
                  { label: 'Aadhaar',          url: lawyer.aadhaar_doc_url },
                  { label: 'Degree',            url: lawyer.degree_doc_url },
                ].map(({ label, url }) => (
                  url ? (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '12px', fontWeight: 600,
                        color: 'var(--teal)',
                        padding: '5px 12px',
                        border: '1px solid rgba(13,115,119,0.3)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        background: 'rgba(13,115,119,0.05)',
                      }}
                    >
                      📄 {label} ↗
                    </a>
                  ) : (
                    <span
                      key={label}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '12px', fontWeight: 500,
                        color: 'rgba(192,57,43,0.7)',
                        padding: '5px 12px',
                        border: '1px solid rgba(192,57,43,0.2)',
                        borderRadius: '6px',
                        background: 'rgba(192,57,43,0.04)',
                      }}
                    >
                      ✗ {label} missing
                    </span>
                  )
                ))}
              </div>
              {!lawyer.bci_doc_url && !lawyer.aadhaar_doc_url && !lawyer.degree_doc_url && (
                <p style={{ fontSize: '11px', color: 'rgba(192,57,43,0.8)', marginTop: '8px', fontWeight: 500 }}>
                  ⚠ No documents uploaded — do not approve without verifying identity through another channel.
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {lawyer.verification_status === 'pending' ? (
              <LawyerVerificationActions lawyerId={lawyer.id} />
            ) : (
              <span style={{
                fontSize: '12px', padding: '4px 12px', borderRadius: '100px', fontWeight: 600,
                background: lawyer.verification_status === 'verified' ? 'rgba(26,107,58,0.1)' : 'rgba(192,57,43,0.1)',
                color: lawyer.verification_status === 'verified' ? '#1A6B3A' : 'var(--rust)',
              }}>
                {lawyer.verification_status === 'verified' ? '✓ Verified' : '✗ Rejected'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--ink)', marginBottom: '32px' }}>
        Lawyer Verification Queue
      </h1>

      {pending.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#9a710a', marginBottom: '16px' }}>
            Pending Review ({pending.length})
          </h2>
          {pending.map((l: any) => <LawyerRow key={l.id} lawyer={l} />)}
        </div>
      )}

      {verified.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#1A6B3A', marginBottom: '16px' }}>
            Verified ({verified.length})
          </h2>
          {verified.map((l: any) => <LawyerRow key={l.id} lawyer={l} />)}
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--rust)', marginBottom: '16px' }}>
            Rejected ({rejected.length})
          </h2>
          {rejected.map((l: any) => <LawyerRow key={l.id} lawyer={l} />)}
        </div>
      )}

      {allLawyers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', background: 'white', border: '1px solid rgba(14,12,10,0.08)', borderRadius: '16px' }}>
          <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>No lawyer applications yet.</p>
        </div>
      )}
    </div>
  );
}
