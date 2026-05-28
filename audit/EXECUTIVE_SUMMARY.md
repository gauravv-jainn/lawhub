# LawHub — Executive Summary

**Audit Date:** 2026-05-28  
**Auditor:** Claude Sonnet 4.6 (Principal Engineer Review)  
**Codebase:** `civilcaseos` / LawHub — Indian Legal Marketplace

---

## Overall Ratings

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Overall Engineering** | **4.5 / 10** | Structurally sound MVP; multiple critical security holes |
| **Production Readiness** | **3 / 10** | Not safe to scale past ~100 active users without security fixes |
| **Security** | **3 / 10** | Three critical exploitable vulnerabilities; zero rate limiting |
| **Scalability** | **3 / 10** | Full-table scans in admin, no indexes, polling architecture |
| **Maintainability** | **5.5 / 10** | Reasonable separation of concerns; inconsistencies in style |

---

## What This Is

LawHub is a multi-role legal services marketplace for the Indian market. Clients post legal briefs, verified advocates bid on them, cases are managed through milestones, and payments are escrowed via Razorpay with TDS (Section 194J) handling. Additional verticals include enterprise law firm management, NGO pro-bono case assignment, and student internship applications.

**Stack:** Next.js 14 (App Router) · PostgreSQL + Prisma · NextAuth.js (JWT) · Razorpay · Cloudinary · Resend · Anthropic Claude / Ollama · Zustand · TailwindCSS

The project is 3–4 months of solo-founder work. The architecture is sensible and the domain model is surprisingly complete. However, the security posture is not production-safe. Several vulnerabilities would allow a malicious user to manipulate financial records, impersonate lawyers, and arbitrarily delete other users' files today.

---

## Top 10 Critical Findings

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | 🔴 CRITICAL | Client-controlled payment amount — client sends `amount` to `create-order`, server trusts it without validating against case's agreed fee | `api/payments/create-order/route.ts:12` |
| 2 | 🔴 CRITICAL | IDOR on reviews — any authenticated user can submit a review for any case/lawyer without proof they were the client | `api/reviews/route.ts:6` |
| 3 | 🔴 CRITICAL | Lawyer impersonation in bids — `lawyer_id` is taken from request body with `lawyer_id ?? session.user.id`; any lawyer can bid on behalf of another | `api/bids/route.ts:37` |
| 4 | 🔴 CRITICAL | Arbitrary file deletion — `DELETE /api/files/delete` deletes any Cloudinary file by URL with no ownership check | `api/files/delete/route.ts:6` |
| 5 | 🟠 HIGH | AI rate limit race condition (TOCTOU) — check-then-act pattern allows burst of concurrent calls to exceed the 20/day limit | `lib/ai/usage.ts:4` |
| 6 | 🟠 HIGH | Zero rate limiting on all endpoints — register, login, AI, payments, notifications have no HTTP-level rate limiting | All API routes |
| 7 | 🟠 HIGH | Payment "request" creates "held" record without actual payment — skips Razorpay flow entirely, corrupts payment state | `api/payments/request/route.ts:48` |
| 8 | 🟠 HIGH | Role baked into JWT, never refreshed — role changes (e.g., lawyer deactivation) don't take effect until token expiry | `lib/auth.ts:44` |
| 9 | 🟡 MEDIUM | Admin dashboard full-table scans — loads all users/payments/lawyers into memory for in-JS counting | `admin/dashboard/page.tsx:14` |
| 10 | 🟡 MEDIUM | No database indexes declared — zero `@@index` on high-query fields; queries will degrade linearly | `prisma/schema.prisma` |

---

## Top 10 Quick Wins

| # | Effort | Win |
|---|--------|-----|
| 1 | 30 min | Fix `api/bids` — remove `lawyer_id` from accepted body fields, always use `session.user.id` |
| 2 | 30 min | Fix `api/reviews` — verify `case.client_id === session.user.id` before inserting |
| 3 | 30 min | Fix `api/files/delete` — look up who owns the file in DB before deleting |
| 4 | 1 hr | Fix `api/payments/create-order` — fetch `case.total_fee` from DB, validate `amount` matches |
| 5 | 1 hr | Add 12 critical DB indexes to `schema.prisma` |
| 6 | 2 hrs | Add `next-rate-limit` or Upstash Redis rate limiting middleware on login/register/AI routes |
| 7 | 2 hrs | Replace admin dashboard full-table-scan counts with `prisma.user.count({ where: { role }})` |
| 8 | 2 hrs | Delete `src/lib/supabase/` and `src/lib/ai/anthropic.ts` dead code; remove unused `openai` dependency |
| 9 | 30 min | Add `NEXTAUTH_SECRET` rotation guidance + `httpOnly`, `secure`, `sameSite=strict` cookie config |
| 10 | 1 hr | Add `Notification` index on `(user_id, created_at DESC)` and cursor pagination to stop full-table polling |

---

## Candid Assessment

This is a well-intentioned solo-founder MVP. The domain model is thoughtful — TDS handling, milestone escrow, BCI verification workflow, multi-role routing — these are non-trivial decisions made correctly at the schema level.

The problem is that the author wrote the happy path well and punted on adversarial inputs entirely. There is not a single rate-limited endpoint. An attacker with a free account can:

- Submit fake reviews on any lawyer in the system (destroys marketplace trust)  
- Bid on any brief as any lawyer (impersonation)  
- Delete any other user's uploaded documents (data destruction)  
- Create Razorpay orders for 1 paise and have them marked "verified" (financial manipulation)

None of these require any special access. They are exploitable by any registered user today.

The payment architecture has a logical incoherence: `POST /api/payments/request` creates a payment with `status: 'held'` without any money actually moving. This is a phantom payment record that will confuse the release flow.

Before putting real lawyers and real clients on this, fix findings #1–4 from the critical list. They are each a 30-minute fix. The absence of them is not an architecture problem — it's an oversight that needs immediate remediation.

The rest of the codebase is standard Next.js-with-Prisma patterns, implemented competently but not with production scale in mind. The polling-based notification system, no indexes, full-table admin scans, and no background job queue will all hurt as volume grows past ~500 active users. These are solvable and don't require architectural upheaval — they are optimization passes.

**Bottom line:** Fix the four critical exploitables immediately. Add indexes. Add rate limiting. This can be a solid product with 2–3 weeks of focused hardening work.
