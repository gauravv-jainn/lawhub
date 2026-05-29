-- LawHub Consolidation Migration 001
-- Removes dead models, rebuilds milestone + dispute systems
-- Run: npx prisma migrate deploy

-- ─── Step 1: Drop removed tables ─────────────────────────────────────────────

DROP TABLE IF EXISTS "connections" CASCADE;
DROP TABLE IF EXISTS "ngo_cases" CASCADE;
DROP TABLE IF EXISTS "internship_applications" CASCADE;
DROP TABLE IF EXISTS "internship_postings" CASCADE;
DROP TABLE IF EXISTS "enterprise_associates" CASCADE;
DROP TABLE IF EXISTS "student_profiles" CASCADE;
DROP TABLE IF EXISTS "ai_usage" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;

-- ─── Step 2: Drop removed enums ──────────────────────────────────────────────

DROP TYPE IF EXISTS "ConnectionStatus";
DROP TYPE IF EXISTS "InternshipStatus";
DROP TYPE IF EXISTS "ApplicationStatus";
DROP TYPE IF EXISTS "NGOCaseStatus";

-- ─── Step 3: Update Role enum — remove student ───────────────────────────────

-- Safely remove student value (fail if any user has role=student)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE role = 'student') THEN
    RAISE EXCEPTION 'Cannot remove student role: active student users exist. Reassign them first.';
  END IF;
END
$$;

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('client', 'lawyer', 'enterprise', 'ngo', 'admin');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";

-- ─── Step 4: Update BriefStatus enum — add expired ───────────────────────────

ALTER TYPE "BriefStatus" ADD VALUE IF NOT EXISTS 'expired';

-- ─── Step 5: Rename BidStatus → ProposalStatus ────────────────────────────────

ALTER TYPE "BidStatus" RENAME TO "ProposalStatus";

-- Update enum values from old bid terminology (values stay same, type renamed)
-- Existing: pending, accepted, rejected, withdrawn — no value changes needed

-- ─── Step 6: Update CaseStatus enum — add completion_requested ───────────────

ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'completion_requested';

-- ─── Step 7: Create new enums ─────────────────────────────────────────────────

CREATE TYPE "MilestoneStatus" AS ENUM (
  'active',
  'submitted',
  'approved',
  'disputed',
  'paid',
  'cancelled'
);

CREATE TYPE "DisputeReason" AS ENUM (
  'work_not_delivered',
  'poor_quality',
  'payment_withheld',
  'lawyer_unresponsive',
  'client_unresponsive',
  'scope_disagreement',
  'other'
);

CREATE TYPE "DisputeStatus" AS ENUM (
  'open',
  'under_review',
  'resolved_client',
  'resolved_lawyer',
  'settled',
  'withdrawn'
);

-- ─── Step 8: Modify briefs table ─────────────────────────────────────────────

ALTER TABLE "briefs"
  ADD COLUMN IF NOT EXISTS "pro_bono" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

-- Back-fill expires_at for existing briefs (30 days from created_at)
UPDATE "briefs"
SET "expires_at" = "created_at" + INTERVAL '30 days'
WHERE "expires_at" IS NULL;

-- Back-fill updated_at
UPDATE "briefs" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- Make expires_at NOT NULL after back-fill
ALTER TABLE "briefs" ALTER COLUMN "expires_at" SET NOT NULL;
ALTER TABLE "briefs" ALTER COLUMN "updated_at" SET NOT NULL;

-- Add index for expiry job
CREATE INDEX IF NOT EXISTS "briefs_expires_at_idx" ON "briefs"("expires_at");

-- ─── Step 9: Rename bids table — update column type ──────────────────────────

-- bids table stays "bids" for zero-risk rename
-- Update status column type from BidStatus to ProposalStatus
ALTER TABLE "bids"
  ALTER COLUMN "status" TYPE "ProposalStatus" USING "status"::text::"ProposalStatus";

-- Add withdrawn_at column
ALTER TABLE "bids"
  ADD COLUMN IF NOT EXISTS "withdrawn_at" TIMESTAMP(3);

-- ─── Step 10: Modify cases table ─────────────────────────────────────────────

-- Remove old integer milestone tracking
ALTER TABLE "cases"
  DROP COLUMN IF EXISTS "current_milestone",
  DROP COLUMN IF EXISTS "milestone_count";

-- Add completion/cancellation tracking
ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "completion_requested_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelled_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

-- Add FK for cancelled_by_id
ALTER TABLE "cases"
  ADD CONSTRAINT "cases_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL;

-- ─── Step 11: Create milestones table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "milestones" (
  "id"           TEXT NOT NULL,
  "case_id"      TEXT NOT NULL,
  "number"       INTEGER NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "deliverables" TEXT,
  "amount"       INTEGER NOT NULL,
  "due_date"     TIMESTAMP(3),
  "status"       "MilestoneStatus" NOT NULL DEFAULT 'active',
  "submitted_at" TIMESTAMP(3),
  "approved_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milestones_case_id_number_key" UNIQUE ("case_id", "number"),
  CONSTRAINT "milestones_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "milestones_case_id_status_idx" ON "milestones"("case_id", "status");

-- ─── Step 12: Create milestone_attachments table ──────────────────────────────

CREATE TABLE IF NOT EXISTS "milestone_attachments" (
  "id"           TEXT NOT NULL,
  "milestone_id" TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "uploaded_by"  TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "milestone_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milestone_attachments_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "milestone_attachments_milestone_id_idx" ON "milestone_attachments"("milestone_id");

-- ─── Step 13: Modify payments table — link to milestones ─────────────────────

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "milestone_id" TEXT,
  ADD CONSTRAINT "payments_milestone_id_key" UNIQUE ("milestone_id"),
  ADD CONSTRAINT "payments_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id")
    ON DELETE SET NULL;

-- ─── Step 14: Create disputes table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "disputes" (
  "id"           TEXT NOT NULL,
  "case_id"      TEXT NOT NULL,
  "raised_by_id" TEXT NOT NULL,
  "reason"       "DisputeReason" NOT NULL,
  "description"  TEXT NOT NULL,
  "milestone_id" TEXT,
  "status"       "DisputeStatus" NOT NULL DEFAULT 'open',
  "admin_id"     TEXT,
  "resolution"   TEXT,
  "resolved_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "disputes_case_id_key" UNIQUE ("case_id"),
  CONSTRAINT "disputes_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT,
  CONSTRAINT "disputes_raised_by_id_fkey"
    FOREIGN KEY ("raised_by_id") REFERENCES "users"("id"),
  CONSTRAINT "disputes_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "disputes_status_created_at_idx" ON "disputes"("status", "created_at" DESC);

-- ─── Step 15: Add file attachment columns to messages ────────────────────────

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "file_url"  TEXT,
  ADD COLUMN IF NOT EXISTS "file_name" TEXT;

-- ─── Step 16: Add email_sent to notifications ─────────────────────────────────

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "email_sent" BOOLEAN NOT NULL DEFAULT false;

-- ─── Step 17: Drop wins from lawyer_profiles (phantom metric) ────────────────

ALTER TABLE "lawyer_profiles"
  DROP COLUMN IF EXISTS "wins";

-- Remove subscription fields from users (subscription model removed)
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "subscription_tier",
  DROP COLUMN IF EXISTS "subscription_expires_at";

-- ─── Step 18: Migrate existing cases to milestone records ────────────────────
-- For active cases that had milestone_count, create placeholder Milestone rows.
-- IMPORTANT: Run this ONLY if you have existing production data.
-- New cases will have milestones created by the accept-proposal flow.

-- (Intentionally left as a comment — run manually after verifying case data)
-- INSERT INTO "milestones" (id, case_id, number, title, amount, status, updated_at)
-- SELECT
--   gen_random_uuid()::text,
--   c.id,
--   generate_series(1, COALESCE(c.milestone_count_backup, 1)),
--   'Milestone ' || generate_series(1, COALESCE(c.milestone_count_backup, 1)),
--   c.total_fee / COALESCE(c.milestone_count_backup, 1),
--   'active',
--   NOW()
-- FROM cases c
-- WHERE c.status = 'active';
