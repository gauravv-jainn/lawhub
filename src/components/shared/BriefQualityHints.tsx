'use client';

/**
 * BriefQualityHints — shown during brief creation.
 * Displays category-specific required info prompts and a quality score.
 * Pure client-side — no API calls needed; uses the static config.
 */

import { useMemo } from 'react';
import { getCategoryPrompts, scoreBrief } from '@/lib/briefQuality';

interface Props {
  category:    string;
  description: string;
  budgetMin:   number;
  budgetMax:   number;
  hasDocuments?: boolean;
}

const GRADE_STYLES = {
  excellent: { bar: '#2b8a3e', bg: '#f0faf2', label: 'Excellent' },
  good:      { bar: '#1971c2', bg: '#f0f6ff', label: 'Good' },
  fair:      { bar: '#e67700', bg: '#fff9f0', label: 'Fair' },
  poor:      { bar: '#c92a2a', bg: '#fff5f5', label: 'Needs improvement' },
};

export default function BriefQualityHints({
  category,
  description,
  budgetMin,
  budgetMax,
  hasDocuments = false,
}: Props) {
  const { score, warnings, tips, grade } = useMemo(
    () => scoreBrief(description, category, budgetMin, budgetMax, hasDocuments),
    [category, description, budgetMin, budgetMax, hasDocuments]
  );

  const prompts  = getCategoryPrompts(category);
  const styles   = GRADE_STYLES[grade];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quality score meter */}
      <div
        style={{
          padding:      '14px 16px',
          background:   styles.bg,
          borderRadius: '10px',
          border:       `1px solid ${styles.bar}33`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Brief Quality</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: styles.bar }}>
            {score}/100 — {styles.label}
          </span>
        </div>
        <div style={{ background: '#e9ecef', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div
            style={{
              width:        `${score}%`,
              height:       '100%',
              background:   styles.bar,
              borderRadius: '4px',
              transition:   'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Active warnings */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '8px',
                padding:      '8px 12px',
                background:   '#fff9f0',
                borderRadius: '8px',
                border:       '1px solid rgba(230,119,0,0.2)',
              }}
            >
              <span style={{ flexShrink: 0, fontSize: '13px' }}>⚠</span>
              <span style={{ fontSize: '12px', color: '#664d03' }}>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category-specific tips */}
      <div
        style={{
          padding:      '12px 14px',
          background:   '#f8f9fa',
          borderRadius: '10px',
          border:       '1px solid #e9ecef',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Recommended for {prompts.category} briefs
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tips.map((tip, i) => (
            <li key={i} style={{ fontSize: '12px', color: 'rgba(14,12,10,0.65)', lineHeight: 1.5 }}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
