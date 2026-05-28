# LawHub — Performance Review

**Performance Rating: 4 / 10**

---

## Critical Performance Issues

### PERF-1: Admin Dashboard Full-Table Scans
**File:** `src/app/admin/dashboard/page.tsx:14`  
**Impact:** 🔴 Will OOM at scale

```typescript
const [profiles, lawyers, briefs, bidsToday, payments] = await Promise.all([
  prisma.user.findMany({ select: { role: true } }),            // ALL users
  prisma.lawyerProfile.findMany({ select: { verification_status: true } }),  // ALL lawyers
  prisma.brief.findMany({ select: { status: true } }),         // ALL briefs
  prisma.bid.count({ where: { created_at: { gte: oneDayAgo } } }),
  prisma.payment.findMany({ select: { amount: true, platform_fee: true, status: true } }),  // ALL payments
]);
```

This loads **every row from 5 tables** into Node.js memory on every admin page load, then filters/counts in JavaScript. With 10,000 users this is a 10MB+ allocation per request. With 100,000 users it will OOM the serverless function.

**Fix:**
```typescript
const [totalClients, verifiedLawyers, pendingLawyers, openBriefs, bidsToday, revenue] = await Promise.all([
  prisma.user.count({ where: { role: 'client' } }),
  prisma.lawyerProfile.count({ where: { verification_status: 'verified' } }),
  prisma.lawyerProfile.count({ where: { verification_status: 'pending' } }),
  prisma.brief.count({ where: { status: 'open' } }),
  prisma.bid.count({ where: { created_at: { gte: oneDayAgo } } }),
  prisma.payment.aggregate({ where: { status: 'released' }, _sum: { platform_fee: true } }),
]);
```

Cost: 6 indexed COUNT queries vs. 4 full-table fetches. ~100x faster at any reasonable data volume.

---

### PERF-2: No Database Indexes
**File:** `prisma/schema.prisma`  
**Impact:** 🔴 Linear query degradation

The schema has zero `@@index` declarations. All queries against these high-frequency fields will do full sequential scans:

| Table | Missing Index | Query Pattern |
|-------|---------------|---------------|
| `briefs` | `(client_id)` | Client dashboard loads briefs |
| `briefs` | `(status, created_at)` | Open briefs listing for lawyers |
| `bids` | `(brief_id)` | Count bids per brief |
| `bids` | `(lawyer_id)` | Lawyer's bid history |
| `cases` | `(client_id, status)` | Client cases list |
| `cases` | `(lawyer_id, status)` | Lawyer cases list |
| `payments` | `(case_id)` | Payments per case |
| `payments` | `(status)` | Released payments aggregate |
| `notifications` | `(user_id, created_at DESC)` | Notification polling |
| `ai_usage` | `(user_id, created_at)` | Daily limit check |
| `connections` | `(requester_id)`, `(recipient_id)` | Network page |
| `internship_applications` | `(applicant_id)` | Student applications |

The `ai_usage` index is the most immediately painful — `isAiLimitReached` runs a COUNT on every AI request with no index, doing a full scan of an ever-growing table.

**Fix:** Add to schema.prisma:
```prisma
model Brief {
  @@index([client_id])
  @@index([status, created_at(sort: Desc)])
}
model AiUsage {
  @@index([user_id, created_at])
}
model Notification {
  @@index([user_id, created_at(sort: Desc)])
  @@index([user_id, is_read])
}
// ... etc for all tables above
```

---

### PERF-3: N+1 in Brief Creation — Sequential Admin Notifications
**File:** `src/app/api/briefs/route.ts:74`  
**Impact:** 🟠 High — grows linearly with admin count

```typescript
const admins = await prisma.user.findMany({ where: { role: 'admin' } });
for (const admin of admins) {
  await prisma.notification.create({ ... });  // Sequential INSERT per admin
}
```

If there are 5 admins, brief creation does 5 sequential DB writes in a for-loop. This adds latency to the end-user's brief creation request and is an N+1 pattern.

**Fix:**
```typescript
await prisma.notification.createMany({
  data: admins.map(admin => ({
    user_id: admin.id,
    type: 'new_brief',
    title: 'New Brief Posted',
    body: `A new brief "${brief.title}" was posted.`,
    link: `/admin/briefs`,
  })),
});
```

Or better: push to a background job queue so the user doesn't wait for admin notifications at all.

---

### PERF-4: Review Aggregate Recalculated by Fetching All Reviews
**File:** `src/app/api/reviews/route.ts:29`  
**Impact:** 🟠 High — grows O(n) with lawyer's review count

```typescript
const allReviews = await prisma.review.findMany({
  where: { lawyer_id },
  select: { rating: true },
});
const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
```

A lawyer with 1,000 reviews: this fetches 1,000 rows and computes the average in JavaScript on every new review.

**Fix — SQL aggregate:**
```typescript
const result = await prisma.review.aggregate({
  where: { lawyer_id },
  _avg: { rating: true },
  _count: { rating: true },
});
await prisma.lawyerProfile.update({
  where: { id: lawyer_id },
  data: { avg_rating: result._avg.rating ?? 0, review_count: result._count.rating },
});
```

**Better fix — incremental update:** Use a Prisma raw query or atomic increment to avoid re-reading all reviews:
```typescript
// Incremental avg: new_avg = (old_avg * old_count + new_rating) / (old_count + 1)
await prisma.$transaction(async tx => {
  const profile = await tx.lawyerProfile.findUnique({ where: { id: lawyer_id }, select: { avg_rating: true, review_count: true }});
  const newCount = profile.review_count + 1;
  const newAvg = (profile.avg_rating * profile.review_count + rating) / newCount;
  await tx.lawyerProfile.update({ where: { id: lawyer_id }, data: { avg_rating: Math.round(newAvg * 10) / 10, review_count: newCount }});
});
```

---

### PERF-5: Notification Polling — 30-Second Full Fetch
**File:** `src/hooks/useRealtimeNotifications.ts:24`  
**Impact:** 🟠 High at scale

```typescript
const interval = setInterval(() => {
  fetch('/api/notifications')   // fetches latest 50 notifications
    .then(({ notifications }) => setNotifications(notifications))
}, 30000)
```

Every 30 seconds, every connected user makes a DB query for 50 notification rows. With 1,000 concurrent users: 2,000 DB queries/minute just for notification polling. The query has no index on `(user_id, created_at)`.

**Fix short-term:** Add `Last-Modified` or `ETag` header support and only return new notifications since last fetch. Or use `since` timestamp parameter.

**Fix proper:** Replace polling with Server-Sent Events (SSE):
```typescript
// app/api/notifications/stream/route.ts
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({ ... });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

---

## Medium Performance Issues

### PERF-6: Razorpay SDK Unused — Raw HTTP Instead
**File:** `src/app/api/payments/create-order/route.ts:27`

```typescript
// razorpay is in dependencies but not used
const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: { 'Authorization': `Basic ${authHeader}`, ... },
  body: JSON.stringify({ amount, ... }),
});
```

The `razorpay` npm package (v2.9.6, ~580KB) is in `dependencies` but never imported. The code uses raw `fetch` with manual base64 auth. This means:
1. You're paying the bundle weight of the Razorpay SDK for nothing
2. You lose the SDK's built-in retry logic and type safety

**Fix:** Either use the SDK (`import Razorpay from 'razorpay'`) or remove it from dependencies.

---

### PERF-7: Anthropic Client Instantiated Per Request
**File:** `src/lib/ai/provider.ts:29`

```typescript
async function callAnthropic(req: CompletionRequest): Promise<CompletionResponse> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });  // New client every call
```

A new Anthropic SDK client is instantiated on every AI API call. The SDK client maintains a connection pool internally — creating it fresh each time discards the pooled connections. In a serverless environment this is less bad (cold start anyway), but it's still wasteful.

**Fix:** Use a module-level singleton, similar to the Prisma pattern:
```typescript
const globalForAI = globalThis as unknown as { anthropic: Anthropic };
export const anthropic = globalForAI.anthropic ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
if (process.env.NODE_ENV !== 'production') globalForAI.anthropic = anthropic;
```

---

### PERF-8: No HTTP Caching Headers
**File:** All GET API routes

Not a single GET endpoint returns cache-control headers. Public/semi-public data that changes infrequently (verified lawyer listings, open internship postings) is fetched fresh on every request.

`GET /api/network/lawyers` with stable verified lawyer data could be cached for 60 seconds with a `Cache-Control: s-maxage=60` header, eliminating ~90% of that query load.

---

### PERF-9: No Pagination on List Endpoints
**File:** Multiple routes

All list endpoints use a hardcoded `take` limit with no cursor or offset pagination:
- `GET /api/notifications` — `take: 50`
- `GET /api/briefs/open` — `take: 50`  
- `GET /api/network/lawyers` — `take: 60`

Users cannot page through results. When the data grows past the limit, older entries become inaccessible. None of these endpoints return `nextCursor` or total count for the frontend.

---

### PERF-10: Cloudinary Images Not Transformed
**File:** Multiple components using `avatar_url` and `bci_doc_url`

Lawyer profile photos, avatars, and documents are stored as full-resolution Cloudinary URLs with no transformation applied:
```
https://res.cloudinary.com/xxx/image/upload/v123/lawhub/photo.jpg
```

A 4MB photo uploaded as avatar is served at full resolution in a 48x48px avatar component. Next.js `<Image>` component is not used for these — they're raw `<img>` tags in several places.

**Fix:** Use Cloudinary URL transformations:
```
https://res.cloudinary.com/xxx/image/upload/c_fill,w_96,h_96,q_auto,f_auto/v123/lawhub/photo.jpg
```

---

## Summary

| ID | Impact | Issue | Effort |
|----|--------|-------|--------|
| PERF-1 | 🔴 Critical | Admin full-table scans in memory | 2 hrs |
| PERF-2 | 🔴 Critical | No database indexes | 1 hr |
| PERF-3 | 🟠 High | N+1 admin notification loop | 30 min |
| PERF-4 | 🟠 High | Review aggregate full-scan | 1 hr |
| PERF-5 | 🟠 High | 30s polling for notifications | 4 hrs |
| PERF-6 | 🟡 Medium | Unused Razorpay SDK | 30 min |
| PERF-7 | 🟡 Medium | Anthropic client per request | 30 min |
| PERF-8 | 🟡 Medium | No HTTP cache headers | 2 hrs |
| PERF-9 | 🟡 Medium | No pagination | 4 hrs |
| PERF-10 | 🟡 Medium | Unoptimized image URLs | 2 hrs |
