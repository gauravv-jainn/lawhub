# LawHub — Architecture Review

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER                                     │
│  React 18 + Next.js 14 (App Router) + Zustand + React Query        │
│  Tailwind CSS · Radix UI · Framer Motion · React Hook Form + Zod   │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────────────────┐
│                    NEXT.JS SERVERLESS (Netlify)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MIDDLEWARE (src/middleware.ts)                               │   │
│  │  withAuth(NextAuth) · Role-based route guards · Redirects    │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────────── ──▼──────────────────────────────────┐    │
│  │  API ROUTES (src/app/api/**/route.ts)                        │    │
│  │  Auth · Briefs · Bids · Cases · Payments · AI · Files        │    │
│  │  Notifications · Network · Reviews · Internships · NGO       │    │
│  └──────────────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────────── ──▼──────────────────────────────────┐    │
│  │  LIB LAYER (src/lib/*)                                       │    │
│  │  auth.ts · prisma.ts · ai/provider.ts · cloudinary-server   │    │
│  │  resend/index.ts · utils/validators.ts                       │    │
│  └────────┬─────────┬──────────┬──────────┬────────────────────┘   │
└───────────┼─────────┼──────────┼──────────┼─────────────────────────┘
            │         │          │          │
     ┌──────▼──┐  ┌───▼────┐  ┌─▼────┐  ┌─▼──────────┐
     │Postgres │  │Cloudinary  │Resend│  │Anthropic   │
     │(Prisma) │  │(Files) │  │(Email)  │/ Ollama     │
     └────┬────┘  └────────┘  └──────┘  └────────────┘
          │
     ┌────▼────────┐
     │  Razorpay   │
     │(Orders only)│
     │ ⚠ No payout │
     └─────────────┘
```

---

## Data Flow: Brief-to-Case Lifecycle

```
Client posts Brief → Lawyers browse Open Briefs → Lawyers submit Bids
  → Client reviews Bids → Client accepts Bid
     → [TRANSACTION] Bid:accepted + Case:created + Brief:closed
        → Client creates Razorpay order (amount from client — SECURITY HOLE)
           → Razorpay payment captured
              → Webhook + verify: Payment:held
                 → Lawyer marks milestone complete
                    → Lawyer requests Payment
                       ⚠ Payment record created as 'held' (LOGIC BUG)
                       → Client releases → Payment:released
                          ⚠ DB record only, no actual bank transfer
```

---

## What Works Well

### 1. Domain Model Fidelity
The Prisma schema faithfully models a complex legal marketplace. The Case→Payment→Milestone relationship, BCI verification workflow, TDS tracking (Section 194J with ₹30,000 threshold), and multi-role hierarchy are correctly expressed. This is the strongest part of the codebase.

### 2. Transaction Safety on Bid Accept
`POST /api/bids/accept` uses `prisma.$transaction` to atomically accept a bid, create a case, and close the brief. A partial failure won't leave the system in a corrupt state.

### 3. AI Provider Abstraction
`src/lib/ai/provider.ts` wraps both Anthropic and Ollama behind a common interface. Switching providers is a single env var change. Practical for a startup balancing development costs.

### 4. Role-Based Middleware at the Edge
`src/middleware.ts` enforces route-level access control using NextAuth's `withAuth` before requests reach API handlers. The ROLE_HOME redirect map is clean and auditable.

### 5. Serverless-Friendly Prisma Singleton
The global singleton pattern for PrismaClient is correctly implemented, preventing connection pool exhaustion in serverless hot-reload environments.

---

## Architectural Problems

### ARCH-1: No Background Job System
**Severity:** 🟠 High

All side effects (email notifications, admin alerts) happen synchronously inside API route handlers:

```typescript
// From briefs/route.ts — user waits for notification writes
const admins = await prisma.user.findMany({ where: { role: 'admin' } });
for (const admin of admins) {
  await prisma.notification.create({ ... });  // Sequential, user-blocking
}
return NextResponse.json({ brief }, { status: 201 });  // User waits for all of this
```

If notification writes fail, the user's brief creation appears to fail even though the brief was saved. There's no retry, no dead-letter queue, no async processing.

**Recommended:** Inngest (zero infra for Netlify/Vercel serverless).

---

### ARCH-2: Polling Instead of Real-Time Push
**Severity:** 🟡 Medium

```typescript
const interval = setInterval(() => {
  fetch('/api/notifications')  // Full fetch of 50 rows every 30s per user
}, 30000)
```

500 concurrent users = 1,000 DB queries/minute for notifications alone. Replace with Server-Sent Events (SSE) — supported natively in Next.js 14 App Router without any additional infrastructure.

---

### ARCH-3: Payment Architecture Is Incomplete
**Severity:** 🔴 Critical (business logic)

The payment release endpoint only updates a database record:

```typescript
// api/payments/release/route.ts
const updated = await prisma.payment.update({
  where: { id: paymentId },
  data: { status: 'released', tds_applicable, tds_amount, lawyer_final_amount },
});
// That's it. No money moves.
```

No Razorpay payout API call. No bank transfer. No actual disbursement to lawyers. The platform is collecting money but has no mechanism to pay it out.

**Fix:** Integrate Razorpay Route for marketplace payouts:
```typescript
const payout = await razorpay.payouts.create({
  account_number: RAZORPAY_ESCROW_ACCOUNT,
  fund_account_id: lawyer.razorpay_fund_account_id,
  amount: lawyer_final_amount,
  currency: 'INR',
  mode: 'NEFT',
  purpose: 'payout',
  queue_if_low_balance: true,
});
```

---

### ARCH-4: Payment Request Flow Has Phantom "Held" State
**Severity:** 🟠 High

When a lawyer requests payment (`POST /api/payments/request`), the payment is immediately created with `status: 'held'`:

```typescript
prisma.payment.create({
  data: {
    status: 'held',  // Immediate "held" without any payment
    ...
  },
}),
```

`status: 'held'` is supposed to mean "money collected from client." But no money has moved. The client hasn't been asked to pay. This creates phantom records that will confuse the release flow.

The actual Razorpay payment flow (`create-order` → `verify`) also sets `status: 'held'`. There are now two paths to the same state with different meanings.

**Correct state machine:**
- Lawyer requests → `pending_payment`
- Client initiates Razorpay → `pending_razorpay`  
- Payment captured (webhook/verify) → `held`
- Client releases → `released`

---

### ARCH-5: No Caching Layer
**Severity:** 🟡 Medium

Zero caching:
- No Redis
- No in-memory cache
- No HTTP `Cache-Control` headers on any response
- No Next.js `unstable_cache` or `revalidate`

The verified lawyer listing changes rarely but is queried on every page load. Admin stats are recomputed on every dashboard load. Simple HTTP caching (`Cache-Control: s-maxage=60`) would eliminate 90% of repeated queries for stable data.

---

### ARCH-6: Supabase Dead Code
**Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

Supabase was replaced by Cloudinary + PostgreSQL, but the Supabase client files remain. `next.config.mjs` still has `remotePatterns` for `*.supabase.co`. Dead code that misleads contributors.

---

### ARCH-7: Authentication Architecture Inconsistency
**Severity:** 🟠 High

Three compounding issues:

**1. PrismaAdapter + JWT = wrong combination:**
```typescript
adapter: PrismaAdapter(prisma),   // creates DB sessions
session: { strategy: 'jwt' },    // JWT ignores those DB sessions
```
The adapter writes `Session` rows that are never read. This wastes DB writes and creates false revocability — you can delete the DB session but the JWT still works for 30 days.

**2. No email verification:** Any email can register immediately. A non-existent email address creates a fully functional account.

**3. No password reset:** Users who forget passwords are locked out permanently.

---

### ARCH-8: String Enums Throughout Schema
**Severity:** 🟡 Medium

```prisma
status  String  @default("open")      // "open" | "closed" | "active"
status  String  @default("pending")   // "pending" | "held" | "released" | "refunded"
```

Only `Role` is a proper Prisma enum. All other status fields are raw strings. A typo produces silently wrong behavior with no DB-level constraint catching it.

**Fix:** Define Prisma enums for `PaymentStatus`, `CaseStatus`, `BriefStatus`, `VerificationStatus`, `BidStatus`, `ConnectionStatus`.

---

## Architecture Scalability Assessment

| Component | Current State | Scales To | Bottleneck |
|-----------|--------------|-----------|------------|
| Database | PostgreSQL, no indexes | ~1K rows | Missing indexes |
| API Layer | Next.js serverless | ~50K req/day | Fine |
| Auth | JWT stateless | Scales fine | Adapter mismatch |
| Notifications | 30s polling | ~500 users | Replace with SSE |
| File Storage | Cloudinary | Scales fine | Add transforms |
| Payments | Orders only, no payout | Broken | Add Razorpay Route |
| AI | Anthropic per request | Cost scales | Add queue + retry |
| Admin Analytics | Full-table scans | ~1K rows | Use SQL aggregates |
| Background Jobs | None (synchronous) | ~100 users | Add Inngest |
| Email | Resend (synchronous) | Scales fine | Make async |

---

## Missing Systems

These systems are absent and are blockers for production:

1. **Payment disbursement** — Razorpay Route payout integration (BLOCKING)
2. **Email verification** — trust establishment for marketplace
3. **Password reset** — user onboarding blocker
4. **Background job queue** — Inngest or Trigger.dev
5. **Database migrations** — no migration history
6. **Rate limiting** — see Security audit
7. **Observability** — no Sentry, no structured logging, no metrics
8. **API cursor pagination** — data inaccessible beyond take limits
