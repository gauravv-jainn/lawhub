'use client';

import { useState } from 'react';
import Link from 'next/link';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import ForSection from '@/components/landing/ForSection';
import FeaturedLawyers from '@/components/landing/FeaturedLawyers';
import CTABand from '@/components/landing/CTABand';
import Footer from '@/components/landing/Footer';

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(14,12,10,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '6px',
            background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '16px' }}>L</span>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: 'var(--cream)' }}>
            LawHub
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {[
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'For Lawyers', href: '/auth/register/lawyer' },
            { label: 'Find Advocates', href: '/client/find-lawyers' },
          ].map(link => (
            <Link key={link.label} href={link.href}
              className="nav-link-hover"
              style={{
                fontSize: '14px',
                color: 'rgba(250,248,243,0.65)',
                textDecoration: 'none',
                fontWeight: 400,
              }}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/auth/login" style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(250,248,243,0.7)',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.12)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}>
            Log In
          </Link>
          <Link href="/auth/register" style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'white',
            padding: '8px 20px',
            borderRadius: '6px',
            background: 'var(--gold)',
            textDecoration: 'none',
            transition: 'background 0.15s ease',
          }}>
            Post a Brief
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--cream)',
            padding: '8px',
          }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {mobileOpen
              ? <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              : <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{
          background: 'rgba(14,12,10,0.98)',
          padding: '16px 24px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {['How It Works', 'For Lawyers', 'Find Advocates'].map(label => (
            <a key={label} href="#" style={{ fontSize: '14px', color: 'rgba(250,248,243,0.7)', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
          <Link href="/auth/login" style={{ fontSize: '14px', color: 'var(--gold)', textDecoration: 'none' }}>Log In</Link>
          <Link href="/auth/register" style={{
            display: 'block',
            textAlign: 'center',
            background: 'var(--gold)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Post a Brief — Free
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '64px' }}>
        <Hero />
        <div id="how-it-works"><HowItWorks /></div>
        <ForSection />
        <FeaturedLawyers />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
