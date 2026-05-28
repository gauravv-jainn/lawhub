# LawHub — Quick Wins

These are high-value, low-risk changes. Each can be done in isolation without breaking other features.

---

## Priority 1 — Do Today (Critical Security)

### QW-1: Fix Lawyer Impersonation in Bids (15 min)
**File:** `src/app/api/bids/route.ts:37`

Remove `lawyer_id` from the request body. Always use `session.user.id`.

```typescript
// BEFORE
lawyer_id: lawyer_id ?? session.user.id,

// AFTER  
lawyer_id: session.user.id,
```

Also remove `lawyer_id` from the destructuring above: `const { brief_id, proposed_fee, ... } = body;`

---

### QW-2: Fix IDOR on Reviews (30 min)
**File:** `src/app/api/reviews/route.ts`

Add ownership verification before inserting a review:

```typescript
// Add after the missing-fields check
const caseRecord = await prisma.case.findFirst({
  where: {
    id: case_id,
    client_id: session.user.id,
    lawyer_id,
    status: 'completed',
  },
});
if (!caseRecord) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

### QW-3: Fix Arbitrary File Deletion (1 hr)
**File:** `src/app/api/files/delete/route.ts`

Replace URL-based deletion with ID-based deletion that checks ownership:

```typescript
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  // Verify ownership
  const doc = await prisma.briefDocument.findFirst({
    where: { id: documentId },
    include: { brief: { select: { client_id: true } } },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.brief.client_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const publicId = doc.url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)?.[1];
  if (!publicId) return NextResponse.json({ error: 'Invalid file' }, { status: 400 });

  await deleteFileServer(publicId);
  await prisma.briefDocument.delete({ where: { id: documentId } });

  return NextResponse.json({ ok: true });
}
```

---

### QW-4: Validate Payment Amount Server-Side (1 hr)
**File:** `src/app/api/payments/create-order/route.ts`

Fetch the agreed fee from the DB and validate the client-submitted amount:

```typescript
const { caseId, milestoneNumber, amount } = await req.json();

const caseData = await prisma.case.findFirst({
  where: { id: caseId, client_id: session.user.id },
  select: { lawyer_id: true, total_fee: true, milestone_count: true },
});
if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

// Compute expected amount from agreed terms
const expectedAmount = Math.round(caseData.total_fee / (caseData.milestone_count || 1));
const tolerance = 100; // 1 rupee tolerance for rounding
if (Math.abs(amount - expectedAmount) > tolerance) {
  return NextResponse.json({ error: 'Payment amount does not match agreed fee' }, { status: 400 });
}
```

---

## Priority 2 — Do This Week (High Impact, Low Risk)

### QW-5: Add Critical Database Indexes (1 hr)
**File:** `prisma/schema.prisma`

Add these indexes then run `prisma migrate dev --name add-indexes`:

```prisma
model Brief {
  @@index([client_id])
  @@index([status, created_at(sort: Desc)])
}

model Bid {
  @@index([brief_id])
  @@index([lawyer_id])
}

model Case {
  @@index([client_id, status])
  @@index([lawyer_id, status])
}

model Payment {
  @@index([case_id])
  @@index([status])
  @@index([client_id])
  @@index([lawyer_id])
}

model Notification {
  @@index([user_id, created_at(sort: Desc)])
  @@index([user_id, is_read])
}

model AiUsage {
  @@index([user_id, created_at])
}

model Connection {
  @@index([requester_id])
  @@index([recipient_id])
}

model InternshipApplication {
  @@index([applicant_id])
}
```

---

### QW-6: Fix Admin Dashboard Full-Table Scans (2 hrs)
**File:** `src/app/admin/dashboard/page.tsx`

Replace all `findMany` + JS filter with SQL aggregates:

```typescript
const [totalClients, totalLawyers, verifiedLawyers, pendingLawyers,
       openBriefs, bidsToday, revenueResult, gmvResult] = await Promise.all([
  prisma.user.count({ where: { role: 'client' } }),
  prisma.lawyerProfile.count(),
  prisma.lawyerProfile.count({ where: { verification_status: 'verified' } }),
  prisma.lawyerProfile.count({ where: { verification_status: 'pending' } }),
  prisma.brief.count({ where: { status: 'open' } }),
  prisma.bid.count({ where: { created_at: { gte: oneDayAgo } } }),
  prisma.payment.aggregate({ where: { status: 'released' }, _sum: { platform_fee: true } }),
  prisma.payment.aggregate({ where: { status: { not: 'refunded' } }, _sum: { amount: true } }),
]);

const totalRevenue = revenueResult._sum.platform_fee ?? 0;
const gmv = gmvResult._sum.amount ?? 0;
```

---

### QW-7: Delete Dead Code (30 min)

```bash
# Remove files
rm src/lib/supabase/client.ts
rm src/lib/supabase/server.ts  
rm src/lib/ai/anthropic.ts

# Remove dead package
npm uninstall openai

# Fix next.config.mjs — remove dead Supabase remotePattern
```

In `next.config.mjs`, add Cloudinary to remote patterns:
```javascript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'res.cloudinary.com' },
    // Remove the *.supabase.co entry
  ],
},
```

---

### QW-8: Fix N+1 Admin Notification Loop (30 min)
**File:** `src/app/api/briefs/route.ts:74`

```typescript
// BEFORE: sequential INSERTs in a loop
for (const admin of admins) {
  await prisma.notification.create({ ... });
}

// AFTER: single bulk INSERT
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

---

### QW-9: Fix Review Aggregate Calculation (1 hr)
**File:** `src/app/api/reviews/route.ts:29`

```typescript
// BEFORE: fetch all reviews, calculate in JS
const allReviews = await prisma.review.findMany({ where: { lawyer_id }, select: { rating: true } });
const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

// AFTER: SQL aggregate
const { _avg, _count } = await prisma.review.aggregate({
  where: { lawyer_id },
  _avg: { rating: true },
  _count: { rating: true },
});
await prisma.lawyerProfile.update({
  where: { id: lawyer_id },
  data: {
    avg_rating: Math.round(((_avg.rating ?? 0) * 10)) / 10,
    review_count: _count.rating,
  },
});
```

---

### QW-10: Fix Zustand Devtools in Production (15 min)
**File:** `src/store/useAppStore.ts`

```typescript
// BEFORE: devtools always active
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({ ... }),
    { name: 'lawhub-store' }
  )
)

// AFTER: only in development
const storeImpl = (set: any) => ({ ... }); // extract impl

export const useAppStore = create<AppState>()(
  process.env.NODE_ENV === 'development'
    ? devtools(storeImpl, { name: 'lawhub-store' })
    : storeImpl
)
```

---

### QW-11: Add Server-Side Zod Validation to Registration (2 hrs)
**File:** `src/app/api/auth/register/route.ts`

Import and use the existing validators:

```typescript
import { clientRegisterSchema, lawyerStep1Schema } from '@/lib/utils/validators';

if (type === 'client') {
  const result = clientRegisterSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const validated = result.data;
  // Use validated.email, validated.full_name, etc.
}
```

---

### QW-12: Fix Webhook Timing Attack (15 min)
**File:** `src/app/api/payments/webhook/route.ts`

```typescript
// BEFORE
if (expectedSignature !== signature) {

// AFTER
if (!crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'hex'),
  Buffer.from(signature, 'hex')
)) {
```

---

## Priority 3 — Do This Sprint (Good Hygiene)

### QW-13: Add AI Input Length Limit (30 min)
All five AI routes need a maximum input length check:
```typescript
if (!text || text.length < 20 || text.length > 5000) {
  return NextResponse.json({ error: 'Text must be 20–5000 characters' }, { status: 400 });
}
```

### QW-14: Move to `prisma.user.count` for Session Role Check (15 min)
The JWT callback should optionally re-validate the role from DB on each token refresh:
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.role = (user as any).role;
  }
  if (trigger === 'update' && token.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true }});
    if (dbUser) token.role = dbUser.role;
  }
  return token;
}
```

### QW-15: Add `.env.example` (30 min)
Create `/.env.example` documenting all required env vars:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```
