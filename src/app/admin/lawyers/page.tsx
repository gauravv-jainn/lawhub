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
            {/* Document links */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              {lawyer.bci_doc_url && <a href={lawyer.bci_doc_url} target="_blank" rel="noopener" style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>📄 BCI Certificate</a>}
              {lawyer.aadhaar_doc_url && <a href={lawyer.aadhaar_doc_url} target="_blank" rel="noopener" style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>📄 Aadhaar</a>}
              {lawyer.degree_doc_url && <a href={lawyer.degree_doc_url} target="_blank" rel="noopener" style={{ fontSize: '11px', color: 'var(--teal)', textDecoration: 'none' }}>📄 Degree</a>}
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
