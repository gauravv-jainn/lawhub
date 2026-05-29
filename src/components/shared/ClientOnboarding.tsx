/**
 * ClientOnboarding — step-by-step guide shown to new clients on their dashboard.
 * Rendered server-side; no client state needed.
 * Hidden once all steps are complete (user has briefs + cases + spent money).
 */

import Link from 'next/link';

interface Step {
  number: number;
  title:  string;
  desc:   string;
  done:   boolean;
  href?:  string;
  label?: string;
}

interface Props {
  hasBriefs:    boolean;
  hasCases:     boolean;
  hasProposals: boolean;
}

export default function ClientOnboarding({ hasBriefs, hasCases, hasProposals }: Props) {
  const allDone = hasBriefs && hasProposals && hasCases;
  if (allDone) return null; // Nothing left to guide

  const steps: Step[] = [
    {
      number: 1,
      title:  'Post your first brief',
      desc:   'Describe your legal matter in detail — the more context you provide, the better the proposals you\'ll receive.',
      done:   hasBriefs,
      href:   '/client/briefs/new',
      label:  'Post a Brief',
    },
    {
      number: 2,
      title:  'Review advocate proposals',
      desc:   'Verified advocates will submit proposals within 24–48 hours. Compare fees, experience, and approach.',
      done:   hasProposals,
      href:   hasBriefs ? '/client/proposals' : undefined,
      label:  'View Proposals',
    },
    {
      number: 3,
      title:  'Accept a proposal & start your case',
      desc:   'Once you accept a proposal, a case is opened and you can communicate securely with your advocate.',
      done:   hasCases,
      href:   hasCases ? '/client/cases' : undefined,
      label:  'View Cases',
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
            Getting Started
          </h2>
          <div style={{ fontSize: '12px', color: 'rgba(14,12,10,0.45)' }}>
            {completedCount} of {steps.length} steps complete
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {steps.map((s) => (
            <div
              key={s.number}
              style={{
                width: '32px', height: '4px', borderRadius: '2px',
                background: s.done ? 'var(--gold)' : 'rgba(14,12,10,0.1)',
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
              background:   step.done ? 'rgba(26,107,58,0.04)' : 'rgba(14,12,10,0.02)',
              border:       step.done ? '1px solid rgba(26,107,58,0.12)' : '1px solid rgba(14,12,10,0.06)',
              opacity:      step.done ? 0.7 : 1,
            }}
          >
            {/* Step indicator */}
            <div
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background:   step.done ? '#1A6B3A' : 'rgba(14,12,10,0.08)',
                color:        step.done ? 'white' : 'rgba(14,12,10,0.4)',
                display:      'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:     '12px', fontWeight: 700, flexShrink: 0,
              }}
            >
              {step.done ? '✓' : step.number}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: step.done ? 'rgba(14,12,10,0.5)' : 'var(--ink)', marginBottom: '2px' }}>
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
                      background: 'var(--gold)', color: 'white', textDecoration: 'none',
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
