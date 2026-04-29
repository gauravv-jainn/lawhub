'use client';

import { signOut } from 'next-auth/react';

export default function AdminSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: `${window.location.origin}/auth/login` })}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '9px 10px',
        borderRadius: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'rgba(245,240,232,0.45)',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(192,57,43,0.15)';
        (e.currentTarget as HTMLButtonElement).style.color = '#e87461';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'none';
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,240,232,0.45)';
      }}
    >
      ↩ Sign Out
    </button>
  );
}
