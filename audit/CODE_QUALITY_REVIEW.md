# LawHub — Code Quality Review

**Maintainability Rating: 5.5 / 10**

---

## What's Done Well

### Consistent Route Structure
Every API route follows the same pattern: get session → check auth → validate input → DB operation → return JSON. This predictability makes the codebase navigable even without documentation.

### Good Use of Transactions
`bids/accept` correctly wraps multi-table writes in a `$transaction`. The payment request endpoint also uses a transaction for the three-operation write. This is correct and reflects real understanding of atomicity requirements.

### Server-Only Imports
`src/lib/cloudinary-server.ts` correctly imports `'server-only'` at the top, preventing the Cloudinary Node.js SDK (which uses `fs`) from being bundled into client code.

### Zod Validation Schemas
The validators in `src/lib/utils/validators.ts` are well-defined. The problem is they're only used on the frontend — but the schemas themselves are correct and comprehensive.

### AI Prompt Quality
The prompts in `src/lib/ai/prompts.ts` are genuinely good for the domain: Indian-law specific, structured output with clear field definitions, explicitly references post-2023 legislation (BNS/BNSS/BSA). This is thoughtful domain work.

---

## Code Quality Problems

### CQ-1: Zod Schemas Exist But Aren't Used in API Routes
**Files:** `lib/utils/validators.ts` vs. all API routes  
**Severity:** 🟠 High

The validators are well-defined but are only used in React Hook Form on the frontend. Every API route performs manual validation:

```typescript
// From briefs/route.ts — manual checks
if (!title || !category || !description) { ... }
if (description.length < 50) { ... }
```

This means:
1. Direct API calls bypass all validation
2. Validation logic is duplicated (frontend Zod + backend manual)
3. Frontend and backend validation can silently diverge

**Fix:** Each API route should parse the request body with its corresponding Zod schema:
```typescript
const result = briefStep2Schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
}
const { description, budget_min, budget_max } = result.data; // typed and validated
```

---

### CQ-2: Status Fields as Magic Strings
**Files:** Throughout codebase  
**Severity:** 🟠 High

```typescript
status: 'held'     // payments
status: 'open'     // briefs
status: 'pending'  // bids, connections, applications
status: 'verified' // lawyer profiles
```

These are raw strings sprinkled across 15+ files with no central definition. There are no TypeScript const objects, no Prisma enums, nothing. A typo (`'Held'` vs `'held'`) silently produces wrong behavior.

**Fix:** Define a constants file:
```typescript
// src/lib/constants.ts
export const PaymentStatus = {
  PENDING: 'pending',
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];
```

Or better: use Prisma enums in schema.prisma.

---

### CQ-3: `err: any` Anti-Pattern
**Files:** `briefs/route.ts:88`, `bids/route.ts:67`, `reviews/route.ts:43`, others  
**Severity:** 🟡 Medium

```typescript
} catch (err: any) {
  if (err?.code === 'P2002') { ... }
```

Using `any` on caught errors defeats TypeScript entirely. The correct pattern:

```typescript
} catch (err: unknown) {
  if (err instanceof Error && 'code' in err && err.code === 'P2002') { ... }
}
```

Or define a type guard for Prisma errors. The `P2002` unique constraint check is done in multiple places — this should be a utility function.

---

### CQ-4: Dead Code — Supabase, Anthropic Direct Client
**Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/ai/anthropic.ts`  
**Severity:** 🟡 Medium

Three files that are never imported anywhere:

1. `src/lib/supabase/client.ts` — Supabase replaced by Cloudinary
2. `src/lib/supabase/server.ts` — same
3. `src/lib/ai/anthropic.ts` — superseded by `provider.ts`, the comment even says "kept for future reference"

The `openai` npm package (4.56.0, ~3MB) is in `dependencies` but is never imported anywhere in the codebase.

**Impact:** Confuses new developers, pollutes the codebase, adds to bundle analysis noise.

---

### CQ-5: Admin Pages Use Inline Styles Exclusively
**Files:** `src/app/admin/**/*.tsx`  
**Severity:** 🟡 Medium

```typescript
// From admin/dashboard/page.tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
  marginBottom: '40px'
}} className="stats-grid">
```

The entire admin section uses raw inline styles while every other part of the app uses Tailwind. This inconsistency means:
1. Responsive styles require `<style>` tags injected into JSX (already doing this)
2. Theme changes require editing inline values vs. Tailwind config
3. No component-level DX from Tailwind utilities

Not a functional bug but a maintenance smell.

---

### CQ-6: Notification System Has Diverged State Problem
**File:** `src/store/useAppStore.ts`, `src/hooks/useRealtimeNotifications.ts`

```typescript
// Polling sets all notifications
setNotifications: (notifications) =>
  set({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length }),

// Mark-read updates local state only
markNotificationRead: (id) =>
  set((state) => {
    const notifications = state.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    )
```

The `markNotificationRead` action updates local Zustand state, but the next polling cycle 30 seconds later will overwrite it with the DB state (which still has the notification as unread if the API call to mark it read failed or wasn't made). The state can "un-mark" itself as read.

**Fix:** The mark-read action should either optimistically update AND make the API call, or the polling should send a `since` timestamp to only fetch new notifications and not overwrite existing read state.

---

### CQ-7: `force-dynamic` Inconsistently Applied
**Files:** Various API routes

Some routes have `export const dynamic = 'force-dynamic'`, others don't. For routes that call `getServerSession`, Next.js will dynamically render them anyway, but the inconsistency suggests uncertainty about the caching model. Routes that genuinely need to be cached (like `GET /api/network/lawyers`) don't have any caching configuration.

---

### CQ-8: Missing Error Boundaries
**Files:** No `error.tsx` files found in the app directory

None of the route groups have Next.js `error.tsx` boundary files. Any unhandled error in a server component (e.g., DB connection failure on admin dashboard) will crash the entire page with a generic Next.js error overlay instead of a graceful degradation.

---

### CQ-9: `addNotification` in Dependency Array But Never Called
**File:** `src/hooks/useRealtimeNotifications.ts:36`

```typescript
const { setNotifications, addNotification } = useAppStore()

useEffect(() => {
  // ...
  setNotifications(notifications)  // Only setNotifications is used
  // addNotification is never called in this hook
}, [userId, setNotifications, addNotification])  // addNotification in deps
```

`addNotification` is destructured and added to the `useEffect` dependency array but never called inside the effect. This is a lingering half-implementation — probably intended to add incremental notifications via SSE but never finished. It's dead code in a dependency array, which will cause the effect to re-run if `addNotification` reference changes (it won't since Zustand actions are stable, but it's still wrong).

---

### CQ-10: TypeScript Strictness Partially Undermined

`tsconfig.json` presumably has strict mode on (standard for Next.js), but the code regularly undermines it:

```typescript
role: user.role as string,      // Unnecessary cast — role is already Role enum
(user as unknown as { role: string }).role  // Double cast to bypass type system
token.id = user.id as string;   // Why is this cast needed?
```

The double cast `as unknown as { role: string }` in `auth.ts:47` is a code smell indicating that the type system was fought instead of fixed. The NextAuth types for the user object are extensible — the correct fix is to extend the types, not to cast through `unknown`.

---

## Type Coverage Issues

1. **No type for payment status** — raw `string` everywhere
2. **`session.user.role`** typed as `string` not as the `Role` enum
3. **API response types** — no shared types between API routes and frontend consumers (React Query calls return `any`)
4. **`body` in API routes** — destructured from `await req.json()` which returns `any`; nothing is typed on arrival

---

## Test Coverage

**There are zero tests in this codebase.** No unit tests, no integration tests, no end-to-end tests. No test directory, no Jest config, no Playwright config.

This is the single most significant quality indicator for a payment-handling, legally-adjacent application. The TDS calculation logic, Razorpay signature verification, and bid-accept transaction — none of it has any automated verification.

For a marketplace that touches financial transactions, at minimum:
- Unit tests for TDS calculation logic
- Unit tests for Razorpay signature verification
- Integration tests for the bid-accept→case-create transaction
- Integration tests for the payment state machine

---

## Summary

| ID | Issue | Severity | Effort |
|----|-------|----------|--------|
| CQ-1 | Zod schemas unused in API routes | 🟠 High | 4 hrs |
| CQ-2 | Magic strings for all statuses | 🟠 High | 3 hrs |
| CQ-3 | `err: any` pattern | 🟡 Medium | 2 hrs |
| CQ-4 | Dead code (Supabase, anthropic.ts, openai pkg) | 🟡 Medium | 30 min |
| CQ-5 | Inline styles in admin vs Tailwind elsewhere | 🟡 Medium | 4 hrs |
| CQ-6 | Notification state divergence | 🟡 Medium | 2 hrs |
| CQ-7 | `force-dynamic` inconsistency | 🔵 Low | 1 hr |
| CQ-8 | No error boundaries | 🟡 Medium | 2 hrs |
| CQ-9 | Dead dep in useEffect | 🔵 Low | 15 min |
| CQ-10 | TypeScript casts undermining type system | 🟡 Medium | 2 hrs |
| — | Zero test coverage | 🔴 Critical | 2 weeks |
