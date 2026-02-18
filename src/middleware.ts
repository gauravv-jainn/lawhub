export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/clients/:path*', '/matters/:path*', '/calendar/:path*', '/intake/:path*', '/templates/:path*', '/sync/:path*', '/settings/:path*']
};
