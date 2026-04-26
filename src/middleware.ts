import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  client:     '/client/dashboard',
  lawyer:     '/lawyer/dashboard',
  enterprise: '/enterprise/dashboard',
  ngo:        '/ngo/dashboard',
  student:    '/student/internships',
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
    if (pathname.startsWith('/enterprise') && token?.role !== 'enterprise' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (pathname.startsWith('/ngo') && token?.role !== 'ngo' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (pathname.startsWith('/student') && token?.role !== 'student' && token?.role !== 'admin') {
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
          pathname.startsWith('/internships') ||
          pathname.startsWith('/network') ||
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
