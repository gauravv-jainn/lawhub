import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  client:     '/client/dashboard',
  lawyer:     '/lawyer/dashboard',
  enterprise: '/enterprise/dashboard',
  ngo:        '/ngo/dashboard',
  admin:      '/admin/dashboard',
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect authenticated users away from auth pages to their home
    if (token && (pathname === '/auth/login' || pathname.startsWith('/auth/register'))) {
      const home = ROLE_HOME[token.role as string] ?? '/client/dashboard';
      return NextResponse.redirect(new URL(home, req.url));
    }

    // Role-based route protection
    if (pathname.startsWith('/lawyer') && token?.role !== 'lawyer' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Admin 2FA enforcement — all /admin routes except /admin/2fa/*
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/2fa') && token?.role === 'admin') {
      if (!token.twoFactorVerified) {
        if (!token.adminTwoFactorSetupDone) {
          return NextResponse.redirect(new URL('/admin/2fa/setup', req.url));
        }
        return NextResponse.redirect(new URL('/admin/2fa/verify', req.url));
      }
    }
    if (pathname.startsWith('/enterprise') && token?.role !== 'enterprise' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (pathname.startsWith('/ngo') && token?.role !== 'ngo' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (pathname.startsWith('/client') && token?.role !== 'client' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes — no token required
        if (
          pathname.startsWith('/auth') ||
          pathname.startsWith('/api/auth') ||
          pathname === '/' ||
          pathname.startsWith('/lawyer-profile')
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webpo)$).*)',
  ],
};
