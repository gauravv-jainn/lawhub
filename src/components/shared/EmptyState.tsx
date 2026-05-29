/**
 * EmptyState — standardised empty-state panel used across the platform.
 *
 * Usage:
 *   <EmptyState
 *     icon="📋"
 *     title="No briefs yet"
 *     description="Post your first brief to start receiving proposals from advocates."
 *     action={{ label: 'Post a Brief', href: '/client/briefs/new' }}
 *   />
 */

import Link from 'next/link';

interface Action {
  label: string;
  href:  string;
  /** Optional secondary/muted look */
  variant?: 'primary' | 'secondary';
}

interface Props {
  icon?:        string;
  title:        string;
  description?: string;
  action?:      Action;
  secondaryAction?: Action;
  /** Extra vertical padding. Default: 48px */
  compact?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: Props) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        padding:        compact ? '28px 20px' : '56px 32px',
        gap:            '12px',
      }}
    >
      {icon && (
        <div style={{ fontSize: compact ? '28px' : '40px', lineHeight: 1 }}>{icon}</div>
      )}
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize:   compact ? '17px' : '20px',
          fontWeight: 600,
          color:      'var(--ink)',
        }}
      >
        {title}
      </div>
      {description && (
        <p
          style={{
            fontSize:   compact ? '12px' : '13px',
            color:      'rgba(14,12,10,0.5)',
            maxWidth:   '380px',
            lineHeight: 1.5,
            margin:     0,
          }}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <Link
              href={action.href}
              style={{
                padding:        '9px 22px',
                borderRadius:   '8px',
                textDecoration: 'none',
                fontSize:       '13px',
                fontWeight:     600,
                background:     action.variant === 'secondary' ? 'rgba(14,12,10,0.06)' : 'var(--gold)',
                color:          action.variant === 'secondary' ? 'var(--ink)' : 'white',
              }}
            >
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              style={{
                padding:        '9px 22px',
                borderRadius:   '8px',
                textDecoration: 'none',
                fontSize:       '13px',
                fontWeight:     600,
                background:     'rgba(14,12,10,0.06)',
                color:          'var(--ink)',
              }}
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
