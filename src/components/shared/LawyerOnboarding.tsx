/**
 * LawyerOnboarding — step-by-step guide shown to new/unverified lawyers.
 * Shows during the verification + first-case phase.
 */

import Link from 'next/link';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

interface Props {
  verificationStatus: VerificationStatus;
  hasProposals:       boolean;
  hasCases:           boolean;
}

export default function LawyerOnboarding({
  verificationStatus,
  hasProposals,
  hasCases,
}: Props) {
  const isVerified = verificationStatus === 'verified';
  const isRejected = verificationStatus === 'rejected';

  // Fully onboarded — hide the widget
  const allDone = isVerified && hasProposals && hasCases;
  if (allDone) return null;

  interface Step {
    number: number;
    title:  string;
    desc:   string;
    done:   boolean;
    href?:  string;
    label?: string;
    alert?: boolean; // show as attention-needing
  }

  const steps: Step[] = [
    {
      number: 1,
      title:  isRejected ? 'Resubmit your verification documents' : 'Complete identity verification',
      desc:   isRejected
        ? 'Your documents were not approved. Update them and resubmit for a fresh review.'
        : verificationStatus === 'pending'
        ? 'Our team is reviewing your BCI certificate, Aadhaar, and degree. Usually done in 24 hours.'
        : 'Upload your BCI certificate, Aadhaar card, and law degree for verification.',
      done:   isVerified,
      href:   '/lawyer/profile',
      label:  isRejected ? 'Resubmit Documents' : isVerified ? undefined : 'View Status',
      alert:  isRejected,
    },
    {
      number: 2,
      title:  'Browse open client briefs',
      desc:   'Browse legal briefs posted by clients. Filter by practice area, location, and budget to find the right matters.',
      done:   hasProposals,
      href:   isVerified ? '/lawyer/briefs' : undefined,
      label:  'Browse Briefs',
    },
    {
      number: 3,
      title:  'Submit your first proposal',
      desc:   'Write a personalised proposal with your strategy, fees, and timeline. The quality of your proposal determines your win rate.',
      done:   hasProposals,
      href:   isVerified && !hasProposals ? '/lawyer/briefs' : undefined,
      label:  'Find a Brief',
    },
    {
      number: 4,
      title:  'Win your first case',
      desc:   'Once a client accepts your proposal, a case opens. Communicate securely, manage milestones, and deliver excellent work.',
      done:   hasCases,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <div
      style={{
        background:   'white',
        border:       '1px solid rgba(14,12,10,0.08)',
        borderRadius: '14px',
        padding:      '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px',
            }}
          >
            Your Advocate Journey
          </h2>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
            {completedCount} of {steps.length} milestones reached
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {steps.map((s) => (
            <div
              key={s.number}
              style={{
                width: '24px', height: '4px', borderRadius: '2px',
                background: s.done ? 'var(--teal)' : s.alert ? 'rgba(192,57,43,0.4)' : 'rgba(14,12,10,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((step) => (
          <div
            key={step.number}
            style={{
              display:      'flex',
              gap:          '14px',
              alignItems:   'flex-start',
              padding:      '14px 16px',
              borderRadius: '10px',
              background:   step.done
                ? 'rgba(13,115,119,0.04)'
                : step.alert
                ? 'rgba(192,57,43,0.04)'
                : 'rgba(14,12,10,0.02)',
              border: step.done
                ? '1px solid rgba(13,115,119,0.12)'
                : step.alert
                ? '1px solid rgba(192,57,43,0.2)'
                : '1px solid rgba(14,12,10,0.06)',
              opacity: step.done ? 0.65 : 1,
            }}
          >
            <div
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background:   step.done
                  ? 'var(--teal)'
                  : step.alert
                  ? '#c0392b'
                  : 'rgba(14,12,10,0.08)',
                color:        step.done || step.alert ? 'white' : 'rgba(14,12,10,0.4)',
                display:      'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:     '12px', fontWeight: 700, flexShrink: 0,
              }}
            >
              {step.done ? '✓' : step.alert ? '!' : step.number}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: step.done ? 'rgba(14,12,10,0.5)' : step.alert ? '#c0392b' : 'var(--ink)',
                    marginBottom: '2px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)', lineHeight: 1.4 }}>
                    {step.desc}
                  </div>
                </div>
                {!step.done && step.href && (
                  <Link
                    href={step.href}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      background: step.alert ? '#c0392b' : 'var(--teal)',
                      color: 'white', textDecoration: 'none',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {step.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
