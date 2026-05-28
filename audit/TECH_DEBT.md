# LawHub — Tech Debt Register

Organized by: Fix Now / Fix Soon / Fix Eventually / Accept

---

## FIX NOW (Blocking Production)

### TD-1: Zero Test Coverage
**Cost if left:** Unknown breakage risk on every deployment

A legal/financial marketplace has zero automated tests. The TDS calculation, Razorpay signature verification, bid-accept transaction, and payment state machine have no regression coverage. Every deploy is a pray-and-ship.

**Minimum viable test plan:**
1. Unit: TDS calculation function (`amount * 0.10`, threshold check)
2. Unit: Razorpay HMAC signature validation
3. Integration: `POST /api/bids/accept` — verify transaction atomicity
4. Integration: Payment state machine (pending → held → released)
5. E2E (Playwright): Happy path — register → post brief → submit bid → accept → pay

**Effort:** 1–2 weeks for meaningful coverage

---

### TD-2: No Database Migrations
**Cost if left:** Schema changes destroy production data

There are no Prisma migration files (only `schema.prisma`). This means the schema was deployed with `prisma db push`, which is explicitly documented as not for production:

> "prisma db push is not recommended for production environments — use prisma migrate deploy instead"

If a schema change is needed now (e.g., adding indexes, adding a new status enum), running `prisma migrate dev` will create a new migration from the current diff — but without a migration history, there's no way to know what the production DB actually looks like vs. what the schema says.

**Fix:** Run `prisma migrate diff` against the live DB, generate a baseline migration, commit it, and from here forward use `prisma migrate dev` for all changes.

---

### TD-3: No Password Reset / Email Verification
**Cost if left:** Users locked out; no trust establishment

A marketplace where real lawyers are being paid real money has no password recovery and no email verification. Any email can be registered without verification, enabling trivial fake account creation.

**Fix:**
1. Email verification: Add `email_verified_at DateTime?` to User model; Resend sends verification link; API validates token
2. Password reset: Add `reset_token String?` + `reset_token_expires DateTime?`; 1-hour token via Resend

**Effort:** 1 day

---

## FIX SOON (Before Marketing Push)

### TD-4: Payment Disbursement Is Missing
**Cost if left:** Lawyers never get paid; platform collapse

The payment release endpoint (`POST /api/payments/release`) only updates a DB record. No money moves to the lawyer. Razorpay Route (marketplace payout API) needs to be integrated to actually transfer `lawyer_final_amount` to lawyers' bank accounts.

Until this is fixed, all "released" payments exist only as numbers in a database.

**Effort:** 2–3 days to integrate Razorpay Route payout API

---

### TD-5: Rate Limiting Infrastructure
**Cost if left:** Credential stuffing, AI cost blowout, DDoS

Add `@upstash/ratelimit` with a Redis backend (Upstash has a free tier suitable for early stage):

```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:auth',
});

export const aiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(20, '1 d'),
  prefix: 'rl:ai',
});
```

Apply to `/api/auth/register`, `/api/auth/[...nextauth]`, and all `/api/ai/*` routes.

**Effort:** 4 hours

---

### TD-6: Background Job Queue
**Cost if left:** Side effect failures break core operations; no retry

Email sends, admin notifications, and Razorpay event logging are synchronously coupled to user-facing API calls. A transient email service outage will fail brief creation.

**Recommended:** Inngest (zero infra for Netlify/Vercel):

```typescript
// Move notification creation to a background function
export const sendAdminBriefNotification = inngest.createFunction(
  { id: 'brief-created-notify-admins' },
  { event: 'brief/created' },
  async ({ event }) => {
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    await prisma.notification.createMany({ data: admins.map(...) });
  }
);
```

**Effort:** 1 day to integrate Inngest; 2 days to migrate all side effects

---

### TD-7: Replace Notification Polling with SSE
**Cost if left:** 1,000 req/min at 500 users just for notifications

Server-Sent Events implementation for Next.js App Router:

```typescript
// src/app/api/notifications/stream/route.ts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial notifications
      const notifications = await prisma.notification.findMany({
        where: { user_id: session.user.id, is_read: false },
        orderBy: { created_at: 'desc' }, take: 10,
      });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(notifications)}\n\n`));
      // Keep alive
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 25000);
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Effort:** 1 day

---

## FIX EVENTUALLY (Operational Maturity)

### TD-8: Observability — Error Tracking and Structured Logging
**Cost if left:** Flying blind in production

Currently: `console.error(err)` everywhere. No structured logging, no error tracking, no metrics, no alerts.

Minimum viable observability stack:
- **Sentry** — error tracking (free tier adequate for MVP)
- **Structured logging** — replace `console.error` with `pino` or similar
- **Metrics** — Netlify Analytics or Vercel Analytics for basic traffic

**Effort:** 1 day for Sentry; 2 days for structured logging

---

### TD-9: Prisma Enums for All Status Fields
**Cost if left:** Type safety holes, silent bugs from typos

Define enums for all status-carrying fields:

```prisma
enum PaymentStatus { pending held released refunded }
enum CaseStatus { active completed cancelled }
enum BriefStatus { open closed }
enum VerificationStatus { pending verified rejected }
enum BidStatus { pending accepted rejected withdrawn }
enum ConnectionStatus { pending accepted rejected }
```

This is a schema migration + find-and-replace across ~20 files. Breaking change but enforces correctness at DB level.

**Effort:** 1 day

---

### TD-10: API Zod Validation Everywhere
**Cost if left:** Validation bypass via direct API calls

Move all Zod schema validation from frontend-only to API routes. Already have the schemas — just need to apply them. This prevents:
- Negative fee amounts
- Empty BCI numbers
- Invalid email addresses via API
- `milestone_count: 999`

**Effort:** 4 hours

---

### TD-11: Cursor-Based Pagination
**Cost if left:** Data inaccessible beyond `take: 50`; no infinite scroll possible

Every list endpoint needs proper pagination:

```typescript
// Pattern for all list endpoints
const { cursor, limit = 20 } = Object.fromEntries(searchParams);
const briefs = await prisma.brief.findMany({
  take: Math.min(Number(limit), 50),
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { created_at: 'desc' },
  where: { status: 'open' },
});
const nextCursor = briefs.length === limit ? briefs[briefs.length - 1].id : null;
return NextResponse.json({ briefs, nextCursor });
```

**Effort:** 4 hours across all routes

---

### TD-12: Image Optimization Pipeline
**Cost if left:** 4MB avatars served at 48px; slow page loads

All Cloudinary uploads should be stored with transformation parameters:

```typescript
// In uploadFileServer, add transformation
const result = await cloudinary.uploader.upload_stream({
  folder,
  public_id: filename,
  resource_type: 'auto',
  eager: [
    { width: 96, height: 96, crop: 'fill', quality: 'auto', format: 'webp' },  // avatar
    { width: 400, quality: 'auto', format: 'webp' },  // medium
  ],
  eager_async: true,
}, callback);
```

All `<img>` tags should be replaced with Next.js `<Image>` component.

**Effort:** 2 days

---

## ACCEPT (Won't Fix / By Design)

### TA-1: No WebSocket System
Polling is adequate for MVP notification latency requirements. SSE (TD-7) when volume demands it.

### TA-2: Single Database Instance  
Fine for MVP. When read latency becomes a concern, add a read replica. PgBouncer connection pooling should be added before that.

### TA-3: No Multi-Region Deployment
Not required at current scale. Indian market users expect India-region hosting. Netlify handles this adequately for now.

### TA-4: No GraphQL
REST is fine. The API surface is clear and the data fetching patterns don't warrant the overhead of GraphQL.

### TA-5: Razorpay Raw HTTP vs. SDK
Minor. The raw HTTP calls work correctly. Using the SDK would add retry logic — consider it when adding payout integration.

---

## Debt Score Summary

| Category | Items | Estimated Effort |
|----------|-------|-----------------|
| Fix Now | 3 items | 3–4 weeks |
| Fix Soon | 4 items | 1 week |
| Fix Eventually | 5 items | 2 weeks |
| **Total** | **12 items** | **~6–7 weeks** |

Current tech debt is significant but bounded. None of it requires architectural rewrites — it's all incremental improvement on a structurally sound foundation.
