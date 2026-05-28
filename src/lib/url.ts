/**
 * Deployment-safe URL generation.
 *
 * Server-side: use APP_URL (never exposed to browser).
 * Client-side: use NEXT_PUBLIC_APP_URL.
 *
 * Set NEXTAUTH_URL / APP_URL in production to your deployed domain, e.g.:
 *   APP_URL=https://lawhub.in
 *   NEXT_PUBLIC_APP_URL=https://lawhub.in
 *
 * Falls back to NEXTAUTH_URL (which Next-Auth also requires), then to localhost
 * in local development only.
 */

function resolveBaseUrl(): string {
  // Server-side priority: APP_URL → NEXTAUTH_URL → localhost (dev only)
  if (typeof window === 'undefined') {
    return (
      process.env.APP_URL ??
      process.env.NEXTAUTH_URL ??
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '')
    );
  }
  // Client-side: NEXT_PUBLIC_APP_URL → current origin
  return process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
}

/** Absolute URL from a path — works on both server and client */
export function appUrl(path: string): string {
  const base = resolveBaseUrl();
  if (!base) {
    console.error('[url] APP_URL / NEXTAUTH_URL is not set — cannot generate absolute URL');
    return path; // return relative as fallback, better than throwing
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${normalized}`;
}

/** Auth callback URL — used in NextAuth config and email links */
export function authCallbackUrl(provider = 'credentials'): string {
  return appUrl(`/api/auth/callback/${provider}`);
}

/** Client-facing deep link for email notifications */
export function notificationLink(link: string): string {
  return appUrl(link);
}
