'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const clientNav: NavItem[] = [
  { href: '/client/dashboard',   label: 'Home',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="1" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { href: '/client/briefs',      label: 'Briefs',  icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 2H6a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7L14 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v5h5M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/client/cases',       label: 'Cases',   icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 2v3M15 2v3M3 9h16M4 4h14a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/client/payments',    label: 'Pay',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M1 10h20" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="14" r="1.5" fill="currentColor"/></svg> },
  { href: '/network',            label: 'Network', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10L15.5 6M6.5 12L15.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

const lawyerNav: NavItem[] = [
  { href: '/lawyer/dashboard', label: 'Home',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="1" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { href: '/lawyer/briefs',    label: 'Briefs',  icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 2H6a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7L14 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v5h5M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/lawyer/cases',     label: 'Cases',   icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 2v3M15 2v3M3 9h16M4 4h14a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/lawyer/earnings',  label: 'Earnings',icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 15L8 10l4 4 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 7h-4V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/network',          label: 'Network', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10L15.5 6M6.5 12L15.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

const enterpriseNav: NavItem[] = [
  { href: '/enterprise/dashboard',   label: 'Overview', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="1" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { href: '/enterprise/associates',  label: 'Team',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="7" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="15" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M1 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M15 14c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/enterprise/internships', label: 'Internship',icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L11 15.3l-5.2 2.7 1-5.8L2.6 8.1l5.8-.8L11 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { href: '/network',                label: 'Network',  icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10L15.5 6M6.5 12L15.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

const ngoNav: NavItem[] = [
  { href: '/ngo/dashboard',  label: 'Home',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="1" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/></svg> },
  { href: '/ngo/briefs/new', label: 'Post',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
  { href: '/ngo/briefs',     label: 'Briefs',  icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 2H6a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7L14 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v5h5M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/ngo/cases',      label: 'Cases',   icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M7 2v3M15 2v3M3 9h16M4 4h14a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/network',        label: 'Network', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10L15.5 6M6.5 12L15.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

const studentNav: NavItem[] = [
  { href: '/student/internships',  label: 'Internships', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L11 15.3l-5.2 2.7 1-5.8L2.6 8.1l5.8-.8L11 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { href: '/student/applications', label: 'Applied',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 2H6a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7L14 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v5h5M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { href: '/network',              label: 'Network',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10L15.5 6M6.5 12L15.5 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

const roleNavMap: Record<string, NavItem[]> = { client: clientNav, lawyer: lawyerNav, enterprise: enterpriseNav, ngo: ngoNav, student: studentNav }

interface MobileBottomNavProps {
  role: 'client' | 'lawyer' | 'enterprise' | 'ngo' | 'student'
}

export default function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname()
  const items = roleNavMap[role] ?? clientNav

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t" style={{ background: 'var(--ink)', borderColor: 'rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? 'var(--gold)' : 'rgba(245,240,232,0.35)' }}>
              {item.icon}
              <span style={{ fontSize: '9px', fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>{item.label}</span>
              {active && <span style={{ position: 'absolute', top: 0, width: '24px', height: '2px', background: 'var(--gold)', borderRadius: '0 0 3px 3px' }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
