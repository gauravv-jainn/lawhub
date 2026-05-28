# LawHub — Security Audit

**Security Rating: 3 / 10**

---

## Critical Vulnerabilities (Fix Before Any Real Users)

### CRIT-1: Client-Controlled Payment Amount
**File:** `src/app/api/payments/create-order/route.ts:12`  
**Severity:** 🔴 CRITICAL

```typescript
const { caseId, milestoneNumber, amount } = await req.json();
// ... no validation that `amount` matches the agreed fee
body: JSON.stringify({ amount, currency: 'INR', ... })
```

The `amount` parameter comes directly from the client request body. A malicious client can set `amount: 1` (1 paise) and create a legitimate Razorpay order for 1 paise, which will pass signature verification and mark the payment as "held." The lawyer has agreed to ₹50,000 but the client pays ₹0.01.

**Fix:**
```typescript
// Fetch the case and compute expected amount from DB
const caseData = await prisma.case.findFirst({
  where: { id: caseId, client_id: session.user.id },
  select: { total_fee: true, milestone_count: true }
});
const expectedAmount = Math.round(caseData.total_fee / caseData.milestone_count);
if (Math.abs(amount - expectedAmount) > 100) { // 1 rupee tolerance
  return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
}
```

---

### CRIT-2: IDOR on Review Submission
**File:** `src/app/api/reviews/route.ts:6`  
**Severity:** 🔴 CRITICAL

```typescript
const { case_id, lawyer_id, rating, review } = body;
// ... no check that session.user.id was the client of case_id
const newReview = await prisma.review.create({
  data: { case_id, client_id: session.user.id, lawyer_id, rating, review }
});
```

Any authenticated user — including competing lawyers — can submit a 1-star review for any lawyer by supplying any `case_id` and `lawyer_id`. The `client_id` is taken from the session (correct), but there's no verification that the session user was actually the client of that case.

**Fix:**
```typescript
const caseData = await prisma.case.findFirst({
  where: { id: case_id, client_id: session.user.id, lawyer_id, status: 'completed' }
});
if (!caseData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

---

### CRIT-3: Lawyer Impersonation in Bid Submission
**File:** `src/app/api/bids/route.ts:37`  
**Severity:** 🔴 CRITICAL

```typescript
lawyer_id: lawyer_id ?? session.user.id,
```

The `lawyer_id` field is accepted from the request body. Any authenticated lawyer can pass another lawyer's ID and submit a bid on their behalf. This bypasses all identity constraints and allows one lawyer to poison another's reputation (submitting bad proposals) or game the bidding system.

**Fix:** Remove `lawyer_id` from the destructured body entirely. Always use `session.user.id`.

---

### CRIT-4: Arbitrary File Deletion (No Ownership Check)
**File:** `src/app/api/files/delete/route.ts:6`  
**Severity:** 🔴 CRITICAL

```typescript
const { path } = await req.json();
// ... parses public_id from URL, deletes it
await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, ...);
```

Any authenticated user can call `DELETE /api/files/delete` with any Cloudinary URL and delete it. There is no check that the requesting user owns the file. All lawyer verification documents (BCI certificates, Aadhaar scans, degree certificates), brief documents, and avatar images can be deleted by any logged-in user.

**Fix:** Require a `briefId` or `documentId` parameter, look it up in the DB, verify ownership, then delete.

---

## High Severity

### HIGH-1: AI Rate Limit Race Condition (TOCTOU)
**File:** `src/lib/ai/usage.ts:4`  
**Severity:** 🟠 HIGH

```typescript
// Check happens here
if (await isAiLimitReached(session.user.id)) { return 429 }
// Time gap — multiple concurrent requests pass this check simultaneously
const { text: responseText, tokensUsed } = await generateCompletion(...)
// Logged here — too late
await logAiUsage(session.user.id, 'structure-brief', tokensUsed);
```

A user firing 5 concurrent requests will have all 5 pass `isAiLimitReached` before any of them logs usage. This allows bypass of the 20-calls/day limit. With Claude API costs at ~$15/million tokens, a coordinated user could cause significant cost overrun.

**Fix:** Use an atomic DB increment with a conditional: `prisma.aiUsage` upsert with a count check, or use Redis INCR with TTL. Alternatively, wrap in a DB transaction that checks and inserts atomically.

---

### HIGH-2: Zero Rate Limiting on All Endpoints
**Severity:** 🟠 HIGH

Not a single API route has rate limiting. This means:
- `POST /api/auth/register` — brute-forceable credential stuffing / account enumeration
- `POST /api/auth/[...nextauth]` — brute-force login attempts
- `POST /api/ai/*` — cost amplification (TOCTOU above)
- `POST /api/network/connections` — spam connection requests to all users
- `GET /api/internships` — completely unauthenticated, scrapeable without limit

**Fix:** Add `@upstash/ratelimit` or `next-rate-limit` middleware. At minimum, apply to auth routes (5 req/15min per IP) and AI routes (20 req/day per user, enforced atomically).

---

### HIGH-3: Payment "Request" Creates Phantom "Held" Record
**File:** `src/app/api/payments/request/route.ts:48`  
**Severity:** 🟠 HIGH

```typescript
prisma.payment.create({
  data: {
    ...
    status: 'held',  // Created as "held" before any money moves
  },
}),
```

When a lawyer requests payment, a Payment record is created with `status: 'held'` immediately. The `status: 'held'` state is supposed to mean "money has been collected from the client and is in escrow." But at this point, no money has moved. The client hasn't even been asked to pay yet.

This means:
1. Payment records are in an inconsistent state from birth
2. The `/api/payments/release` endpoint will find a "held" payment and release it to the lawyer even though the client never actually paid
3. The `verify` endpoint also sets status to `'held'` — so there are now two paths to the same state, making it impossible to know which path was taken

**Fix:** Payment flow should be:
- Lawyer requests → Payment status: `'pending_payment'`  
- Client initiates Razorpay → Payment status: `'pending_razorpay'`  
- Razorpay confirms → Payment status: `'held'`  
- Client releases → Payment status: `'released'`

---

### HIGH-4: JWT Role Never Refreshed
**File:** `src/lib/auth.ts:44`  
**Severity:** 🟠 HIGH

```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = (user as unknown as { role: string }).role;
  }
  return token;
}
```

The role is baked into the JWT at login time and never refreshed from the DB. If:
- An admin revokes a lawyer's verified status
- A user's role is changed  
- A lawyer is suspended

...the user continues operating with their old role until their session token expires (NextAuth default: 30 days). An admin cannot immediately revoke access.

**Fix:** Add a `trigger === "update"` check in the JWT callback that re-fetches the user role from DB, or set session `maxAge` to a shorter value (e.g., 4 hours) to limit exposure.

---

### HIGH-5: PrismaAdapter + JWT Strategy Mismatch
**File:** `src/lib/auth.ts:7`  
**Severity:** 🟠 HIGH

```typescript
adapter: PrismaAdapter(prisma),   // stores sessions in DB
session: { strategy: 'jwt' },    // but we use stateless JWTs
```

Using `PrismaAdapter` with `strategy: 'jwt'` is a NextAuth anti-pattern. The adapter creates and stores `Session` records in the database that are never used (since JWT strategy is stateless). This:
1. Wastes database writes on every login
2. Creates a false sense of session revocability (you can delete the DB session record but the JWT will still work)
3. Pollutes the `sessions` table with dead rows

**Fix:** Either drop the `PrismaAdapter` entirely (use `session: { strategy: 'jwt' }` without an adapter) or switch to `strategy: 'database'` and use the database session for real revocability.

---

## Medium Severity

### MED-1: Cloudinary Uses `NEXT_PUBLIC_` for API Credentials
**File:** `src/lib/cloudinary-server.ts:7`

```typescript
cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
```

The `NEXT_PUBLIC_` prefix exposes the variable to the browser bundle. The cloud name itself isn't secret, but the pattern trains developers to carelessly prefix actual secrets with `NEXT_PUBLIC_`. Not a direct vulnerability but a dangerous convention.

**Fix:** Use `CLOUDINARY_CLOUD_NAME` (no `NEXT_PUBLIC_`) in server-side code.

---

### MED-2: AI Input Has No Length Cap or Sanitization
**File:** `src/app/api/ai/structure-brief/route.ts:17`

```typescript
const { text } = await req.json();
if (!text || text.length < 20) { ... }
// No upper bound — 1MB of text sent to Anthropic API
```

There is a minimum length check (20 chars) but no maximum. A user could send a 100,000-character string to every AI endpoint, running up API costs. There is also no sanitization for prompt injection — a user could embed `"Ignore all previous instructions..."` in their brief text.

**Fix:** Add `text.length > 4000` guard. For prompt injection mitigation, the system prompt structure (user content separate from system) already provides some isolation with Claude — but input length limits are still essential for cost control.

---

### MED-3: No NEXTAUTH_SECRET Validation
**File:** `src/lib/auth.ts`

If `NEXTAUTH_SECRET` is not set, NextAuth will auto-generate a random secret in development but fail silently or use a weak default in some configurations. There's no startup validation that critical env vars are present.

**Fix:** Add a startup check:
```typescript
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET must be set');
```

---

### MED-4: Cookie Security Not Configured
**File:** `src/lib/auth.ts`

NextAuth cookies are not explicitly configured with `sameSite: 'strict'` or `secure: true`. While NextAuth sets these in production by default when `NEXTAUTH_URL` is HTTPS, this is implicit and not auditable from the code.

**Fix:** Add explicit cookie configuration:
```typescript
cookies: {
  sessionToken: {
    options: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' }
  }
}
```

---

### MED-5: Devtools Middleware Enabled in Production
**File:** `src/store/useAppStore.ts:30`

```typescript
export const useAppStore = create<AppState>()(
  devtools(...)  // Exposes full app state via Redux DevTools in production
)
```

The `devtools` Zustand middleware is active in all environments. In production, this exposes the entire app state (notifications, profile data including email) to anyone with Redux DevTools browser extension.

**Fix:**
```typescript
create<AppState>()(
  process.env.NODE_ENV === 'development' ? devtools(storeImpl, { name: 'lawhub' }) : storeImpl
)
```

---

### MED-6: Webhook Signature Comparison Timing Attack
**File:** `src/app/api/payments/webhook/route.ts:21`

```typescript
if (expectedSignature !== signature) {
```

String comparison with `!==` is not constant-time. For HMAC signature comparisons, use `crypto.timingSafeEqual()` to prevent timing attacks.

**Fix:**
```typescript
if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
```

---

## Low Severity

### LOW-1: No `.env.example` File
No `.env.example` file exists in the repository. New developers and CI/CD pipelines have no reference for required environment variables, leading to runtime errors or insecure defaults.

### LOW-2: next.js 14.2.5 — Outdated
Current version: 14.2.5. Multiple security patches released since. Upgrade to 14.2.x latest or Next.js 15.

### LOW-3: `bcryptjs` instead of `bcrypt`  
`bcryptjs` is a pure-JS implementation that is significantly slower than native `bcrypt`. At bcrypt cost factor 12, this is ~2–3x slower. Not a security hole but impacts login performance and CPU usage under load.

### LOW-4: Registration Endpoint Has No Input Validation
`POST /api/auth/register` accepts raw JSON and passes fields directly to Prisma without running the Zod validators defined in `src/lib/utils/validators.ts`. The validators exist on the frontend only. A direct API call bypasses all validation.

**Example:** A lawyer can register with `experience_years: -999` or `bci_number: ""` by calling the API directly.

### LOW-5: `err: any` Type Usage
Multiple routes catch errors as `any`:
```typescript
} catch (err: any) {
```
This disables TypeScript type checking on errors and is an anti-pattern. Use `unknown` and narrow with `instanceof Error`.

### LOW-6: Console.error Leaks Internal State
Several routes log the full `err` object to console including `err.message` from Prisma, which can contain schema information, query fragments, or row data. In a serverless environment these logs may appear in public-accessible log streams.

---

## Summary Table

| ID | Severity | Category | File | Fix Effort |
|----|----------|----------|------|-----------|
| CRIT-1 | 🔴 Critical | Financial manipulation | `payments/create-order` | 1 hr |
| CRIT-2 | 🔴 Critical | IDOR | `reviews/route.ts` | 30 min |
| CRIT-3 | 🔴 Critical | Impersonation | `bids/route.ts` | 15 min |
| CRIT-4 | 🔴 Critical | Unauthorized deletion | `files/delete` | 1 hr |
| HIGH-1 | 🟠 High | Rate limit bypass | `ai/usage.ts` | 2 hrs |
| HIGH-2 | 🟠 High | No rate limiting | All routes | 4 hrs |
| HIGH-3 | 🟠 High | Payment state corruption | `payments/request` | 3 hrs |
| HIGH-4 | 🟠 High | Stale role in JWT | `auth.ts` | 2 hrs |
| HIGH-5 | 🟠 High | Adapter/strategy mismatch | `auth.ts` | 1 hr |
| MED-1 | 🟡 Medium | Secret exposure pattern | `cloudinary-server.ts` | 15 min |
| MED-2 | 🟡 Medium | AI input unbounded | All AI routes | 30 min |
| MED-3 | 🟡 Medium | Missing env validation | `auth.ts` | 30 min |
| MED-4 | 🟡 Medium | Cookie security implicit | `auth.ts` | 30 min |
| MED-5 | 🟡 Medium | State exposed in prod | `useAppStore.ts` | 15 min |
| MED-6 | 🟡 Medium | Timing attack | `payments/webhook` | 15 min |
| LOW-1 | 🔵 Low | Missing .env.example | — | 30 min |
| LOW-2 | 🔵 Low | Outdated Next.js | `package.json` | 1 hr |
| LOW-3 | 🔵 Low | Slow bcryptjs | `package.json` | 30 min |
| LOW-4 | 🔵 Low | Validation client-only | `register/route.ts` | 2 hrs |
| LOW-5 | 🔵 Low | `any` error types | Multiple | 1 hr |
| LOW-6 | 🔵 Low | Log leakage | Multiple | 1 hr |
