'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const clientNav: NavItem[] = [
  { label: 'Dashboard',     href: '/client/dashboard',    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { label: 'My Briefs',     href: '/client/briefs',       icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 1H4a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 004 15h8a1.5 1.5 0 001.5-1.5V5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 1v4h4M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Proposals',     href: '/client/proposals',    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10a1 1 0 01-1 1H3l-2 2V2a1 1 0 011-1h11a1 1 0 011 1v8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'Active Cases',  href: '/client/cases',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 1v2M10.5 1v2M2 6h12M3 2.5h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Payments',      href: '/client/payments',     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5"/><circle cx="4.5" cy="9.5" r="1" fill="currentColor"/></svg> },
  { label: 'Find Advocates',href: '/client/find-lawyers', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Network',       href: '/network',             icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5l6-3M5 8.5l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

const lawyerNav: NavItem[] = [
  { label: 'Dashboard',   href: '/lawyer/dashboard', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { label: 'Browse Briefs',href: '/lawyer/briefs',    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 1H4a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 004 15h8a1.5 1.5 0 001.5-1.5V5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 1v4h4M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Bids',     href: '/lawyer/bids',      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10a1 1 0 01-1 1H3l-2 2V2a1 1 0 011-1h11a1 1 0 011 1v8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'Active Cases', href: '/lawyer/cases',     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 1v2M10.5 1v2M2 6h12M3 2.5h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Earnings',    href: '/lawyer/earnings',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10.5L6 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 5h-3V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Reviews',  href: '/lawyer/reviews',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.9 3.8 4.1.6-3 2.9.7 4.1L8 10.2l-3.7 2.2.7-4.1-3-2.9 4.1-.6L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'My Profile',  href: '/lawyer/profile',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Network',     href: '/network',          icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5l6-3M5 8.5l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

const enterpriseNav: NavItem[] = [
  { label: 'Overview',    href: '/enterprise/dashboard',   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { label: 'Team',        href: '/enterprise/associates',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="10.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5S10 11.5 10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10.5 9.5c2.5 0 4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Internships', href: '/enterprise/internships', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.9 3.8 4.1.6-3 2.9.7 4.1L8 10.2l-3.7 2.2.7-4.1-3-2.9 4.1-.6L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'Network',     href: '/network',                icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5l6-3M5 8.5l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Profile',  href: '/enterprise/profile',     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

const ngoNav: NavItem[] = [
  { label: 'Dashboard',     href: '/ngo/dashboard', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { label: 'Post a Brief',  href: '/ngo/briefs/new', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Briefs',     href: '/ngo/briefs',     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 1H4a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 004 15h8a1.5 1.5 0 001.5-1.5V5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 1v4h4M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Active Cases',  href: '/ngo/cases',      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5.5 1v2M10.5 1v2M2 6h12M3 2.5h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Find Advocates',href: '/network',        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5l6-3M5 8.5l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Profile',    href: '/ngo/profile',    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

const studentNav: NavItem[] = [
  { label: 'Internships',     href: '/student/internships',  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.9 3.8 4.1.6-3 2.9.7 4.1L8 10.2l-3.7 2.2.7-4.1-3-2.9 4.1-.6L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'My Applications', href: '/student/applications', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 1H4a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 004 15h8a1.5 1.5 0 001.5-1.5V5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 1v4h4M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Network',         href: '/network',              icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5l6-3M5 8.5l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'My Profile',      href: '/student/profile',      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

const ROLE_LABELS: Record<string, string> = {
  client: 'Client Portal',
  lawyer: 'Advocate Portal',
  enterprise: 'Firm Portal',
  ngo: 'NGO Portal',
  student: 'Student Portal',
};

const navMap: Record<string, NavItem[]> = {
  client: clientNav,
  lawyer: lawyerNav,
  enterprise: enterpriseNav,
  ngo: ngoNav,
  student: studentNav,
};

interface AppSidebarProps {
  role: 'client' | 'lawyer' | 'enterprise' | 'ngo' | 'student';
  userInitials: string;
  userName: string;
  subtitle?: string;
}

export default function AppSidebar({ role, userInitials, userName, subtitle }: AppSidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const nav = navMap[role] ?? clientNav;

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <style>{`
        .app-sidebar {
          width: 240px;
          min-height: 100vh;
          background: var(--ink);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          z-index: 50;
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 49;
          transition: opacity 0.28s ease;
        }
        @media (max-width: 1023px) {
          .app-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100dvh;
            transform: translateX(-100%);
          }
          .app-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 32px rgba(0,0,0,0.35);
          }
          .sidebar-overlay {
            display: block;
          }
        }
      `}</style>

      {/* Mobile overlay backdrop */}
      <div
        className="sidebar-overlay"
        onClick={closeSidebar}
        style={{ opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'auto' : 'none' }}
      />

      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '14px' }}>L</span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: 'var(--cream)' }}>
              LawHub
            </span>
          </Link>
          <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.25)' }}>
            {subtitle ?? ROLE_LABELS[role] ?? 'Portal'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
          {nav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar}
                className={isActive ? 'sidebar-link-active' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px', borderRadius: '8px', textDecoration: 'none',
                  marginBottom: '2px', fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--gold-light)' : 'rgba(245,240,232,0.55)',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  background: isActive ? 'rgba(184,134,11,0.1)' : 'transparent',
                  position: 'relative',
                }}>
                {isActive && (
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2.5px', background: 'var(--gold)', borderRadius: '0 2px 2px 0' }} />
                )}
                <span style={{ color: isActive ? 'var(--gold)' : 'rgba(245,240,232,0.4)' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', marginBottom: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(184,134,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', textTransform: 'capitalize' }}>{role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '12px', color: 'rgba(245,240,232,0.35)', borderRadius: '6px',
            transition: 'color 0.15s ease',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 1H2a1 1 0 00-1 1v10a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
