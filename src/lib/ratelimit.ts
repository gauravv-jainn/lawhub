/**
 * Rate limiting via Upstash Redis.
 * Gracefully degrades (allows all requests) when UPSTASH_REDIS_REST_URL is not set,
 * so the app keeps working in local dev without Redis.
 */
import { NextRequest, NextResponse } from 'next/server';

type RateLimitConfig = {
  /** Max requests allowed */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

type RateLimiter = (
  req: NextRequest,
  identifier?: string
) => Promise<NextResponse | null>;

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Create a rate limiter. Returns null (allow) when Upstash is not configured. */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return async (req: NextRequest, identifier?: string): Promise<NextResponse | null> => {
    if (!isUpstashConfigured()) return null; // degrade gracefully in dev

    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      const redis = Redis.fromEnv();
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
        analytics: false,
      });

      // Use IP + optional identifier as the key
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown';
      const key = identifier ? `${identifier}:${ip}` : ip;

      const { success, limit, remaining, reset } = await ratelimit.limit(key);

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
              'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            },
          }
        );
      }
    } catch (err) {
      // Never let rate-limit errors block legitimate requests
      console.error('[ratelimit] Error:', err);
    }

    return null; // allowed
  };
}

/** Auth endpoints: 10 requests per 15 minutes per IP */
export const authRateLimit = createRateLimiter({ limit: 10, windowSeconds: 900 });

/** AI endpoints: 30 requests per minute per user (DB-level 20/day is the stricter guard) */
export const aiRateLimit = createRateLimiter({ limit: 30, windowSeconds: 60 });

/** General API endpoints: 60 requests per minute per IP */
export const apiRateLimit = createRateLimiter({ limit: 60, windowSeconds: 60 });
