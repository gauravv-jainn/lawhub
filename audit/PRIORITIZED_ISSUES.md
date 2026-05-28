# LawHub — Prioritized Issue Table

---

## All Issues — Ranked by Severity × Impact

| # | Category | Severity | Issue | File(s) | Effort | Fix Now / Later |
|---|----------|----------|-------|---------|--------|-----------------|
| 1 | Security | 🔴 Critical | Client-controlled payment amount — any amount accepted from request body | `api/payments/create-order` | 1 hr | **NOW** |
| 2 | Security | 🔴 Critical | IDOR on review — no case ownership check | `api/reviews/route.ts` | 30 min | **NOW** |
| 3 | Security | 🔴 Critical | Lawyer impersonation — `lawyer_id` accepted from request body | `api/bids/route.ts:37` | 15 min | **NOW** |
| 4 | Security | 🔴 Critical | Arbitrary file deletion — no ownership check | `api/files/delete` | 1 hr | **NOW** |
| 5 | Quality | 🔴 Critical | Zero test coverage on financial logic | Entire codebase | 2 weeks | **NOW** |
| 6 | Architecture | 🔴 Critical | No database migrations — using `db push` | `prisma/` | 4 hrs | **NOW** |
| 7 | Architecture | 🔴 Critical | Payment disbursement missing — releases don't move money | `api/payments/release` | 2–3 days | **NOW** |
| 8 | Security | 🟠 High | AI rate limit race condition (TOCTOU) | `lib/ai/usage.ts` | 2 hrs | **NOW** |
| 9 | Security | 🟠 High | Zero rate limiting on all endpoints | All routes | 4 hrs | **NOW** |
| 10 | Architecture | 🟠 High | Payment request creates phantom "held" records | `api/payments/request` | 3 hrs | **NOW** |
| 11 | Security | 🟠 High | Role baked into JWT, never refreshed | `lib/auth.ts:44` | 2 hrs | Soon |
| 12 | Security | 🟠 High | PrismaAdapter + JWT strategy mismatch | `lib/auth.ts:7` | 1 hr | Soon |
| 13 | Architecture | 🟠 High | No background job system — side effects block user requests | All API routes | 1 day | Soon |
| 14 | Architecture | 🟠 High | No email verification or password reset | Missing entirely | 1 day | Soon |
| 15 | Performance | 🔴 Critical | Admin dashboard full-table scans (all users/payments in memory) | `admin/dashboard/page.tsx` | 2 hrs | **NOW** |
| 16 | Performance | 🔴 Critical | No database indexes on any high-query field | `prisma/schema.prisma` | 1 hr | **NOW** |
| 17 | Performance | 🟠 High | 30s notification polling — 1000 queries/min at 500 users | `hooks/useRealtimeNotifications.ts` | 4 hrs | Soon |
| 18 | Performance | 🟠 High | Review aggregate fetches all reviews for recalculation | `api/reviews/route.ts:29` | 1 hr | **NOW** |
| 19 | Performance | 🟠 High | N+1 sequential admin notification inserts | `api/briefs/route.ts:74` | 30 min | **NOW** |
| 20 | Quality | 🟠 High | Zod validators exist but not used server-side | `api/auth/register`, all routes | 4 hrs | Soon |
| 21 | Quality | 🟠 High | Magic status strings — no type safety, typo-prone | Entire codebase | 3 hrs | Soon |
| 22 | Security | 🟡 Medium | Devtools Zustand middleware active in production | `store/useAppStore.ts` | 15 min | **NOW** |
| 23 | Security | 🟡 Medium | Webhook signature timing attack | `api/payments/webhook` | 15 min | **NOW** |
| 24 | Security | 🟡 Medium | AI input has no maximum length | All AI routes | 30 min | **NOW** |
| 25 | Security | 🟡 Medium | Cookie security not explicitly configured | `lib/auth.ts` | 30 min | Soon |
| 26 | Security | 🟡 Medium | NEXT_PUBLIC_ prefix on Cloudinary server config | `lib/cloudinary-server.ts` | 15 min | Soon |
| 27 | Architecture | 🟡 Medium | No caching layer — stable data re-fetched every request | All GET routes | 2 hrs | Soon |
| 28 | Architecture | 🟡 Medium | String enums in schema — no DB-level constraints | `prisma/schema.prisma` | 1 day | Soon |
| 29 | Performance | 🟡 Medium | No cursor pagination — data beyond take limit inaccessible | All list endpoints | 4 hrs | Soon |
| 30 | Performance | 🟡 Medium | Unused `razorpay` package (580KB) in dependencies | `package.json` | 30 min | **NOW** |
| 31 | Performance | 🟡 Medium | Anthropic client instantiated per request | `lib/ai/provider.ts:35` | 30 min | Soon |
| 32 | Performance | 🟡 Medium | No HTTP cache headers on any GET endpoint | All GET routes | 2 hrs | Soon |
| 33 | Performance | 🟡 Medium | Cloudinary images served at full resolution | Components | 2 days | Soon |
| 34 | Quality | 🟡 Medium | Dead code: supabase/, ai/anthropic.ts, `openai` package | Multiple | 30 min | **NOW** |
| 35 | Quality | 🟡 Medium | Admin pages use inline CSS instead of Tailwind | `app/admin/**` | 4 hrs | Eventually |
| 36 | Quality | 🟡 Medium | No error boundaries — unhandled errors crash pages | No error.tsx files | 2 hrs | Soon |
| 37 | Quality | 🟡 Medium | `addNotification` in useEffect deps but never called | `hooks/useRealtimeNotifications.ts` | 15 min | **NOW** |
| 38 | Quality | 🟡 Medium | TypeScript casts undermining type system | `lib/auth.ts:47`, multiple | 2 hrs | Soon |
| 39 | Quality | 🟡 Medium | Notification state diverges after mark-read (overwritten by poll) | `hooks/useRealtimeNotifications.ts` | 2 hrs | Soon |
| 40 | Architecture | 🟡 Medium | No observability — no Sentry, no structured logs, no metrics | Entire codebase | 1 day | Soon |
| 41 | Security | 🔵 Low | No .env.example file | Missing | 30 min | **NOW** |
| 42 | Security | 🔵 Low | Next.js 14.2.5 outdated (security patches available) | `package.json` | 1 hr | Soon |
| 43 | Security | 🔵 Low | Registration API has no server-side validation | `api/auth/register` | 2 hrs | Soon |
| 44 | Security | 🔵 Low | Console.error logs Prisma errors (may leak schema info) | Multiple | 1 hr | Soon |
| 45 | Security | 🔵 Low | bcryptjs (pure JS) vs bcrypt (native) — 3x slower | `package.json` | 30 min | Eventually |
| 46 | Quality | 🔵 Low | `force-dynamic` inconsistently applied across routes | Multiple | 1 hr | Eventually |

---

## Fix Now vs Later Summary

### Fix Now (Before Any Real Traffic)
Issues #1–4, #15–16, #18–19, #22–24, #30, #34, #37, #41 — estimated **12–16 hours of engineering work**.

These fix:
- 4 exploitable security vulnerabilities
- Critical performance time bombs
- Dead code and obvious quick wins

### Fix This Week (Before Marketing)
Issues #5–14, #17, #20–21, #25–27, #29, #31–33, #36, #38–40 — estimated **2–3 weeks**.

These make the product safe to put real users on at scale.

### Fix Eventually (Ongoing Improvement)
Issues #28, #35, #42–46 — estimated **1 week** total.

Quality-of-life and operational maturity improvements.
