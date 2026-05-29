-- LawHub Consolidation Migration 002
-- Adds: plan-approval milestone states, partial_refund dispute resolution,
--       user suspension, milestone revision history, dispute evidence, admin audit log.
-- Run: npx prisma migrate deploy
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside an explicit transaction in PostgreSQL.
-- Each ADD VALUE statement must commit before subsequent DDL that uses the new value.
-- Prisma migrate deploy handles this correctly (each migration runs in its own session).

-- ─── Step 1: Extend MilestoneStatus enum ─────────────────────────────────────
-- Add the three new values needed for the plan-approval flow.
-- PostgreSQL requires these to be committed before they can be used as column defaults.

ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'draft'                  BEFORE 'active';
ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'pending_client_approval' BEFORE 'active';
ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'plan_rejected'           BEFORE 'active';

-- ─── Step 2: Extend DisputeStatus enum ───────────────────────────────────────

ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'partial_refund' BEFORE 'settled';

-- ─── Step 3: Add user suspension fields ──────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "suspended"        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspended_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "suspended_at"     TIMESTAMP(3);

-- ─── Step 4: Add plan-approval tracking columns to milestones ────────────────

ALTER TABLE "milestones"
  ADD COLUMN IF NOT EXISTS "plan_submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "plan_approved_at"  TIMESTAMP(3);

-- ─── Step 5: Change milestones.status default from 'active' to 'draft' ───────
-- This only affects NEW rows — existing milestones keep their current status.

ALTER TABLE "milestones"
  ALTER COLUMN "status" SET DEFAULT 'draft';

-- ─── Step 6: Create milestone_revisions table ─────────────────────────────────
-- Stores a change record every time a milestone is updated after plan approval.

CREATE TABLE IF NOT EXISTS "milestone_revisions" (
  "id"           TEXT         NOT NULL,
  "milestone_id" TEXT         NOT NULL,
  "changed_by"   TEXT         NOT NULL,
  "title"        TEXT,
  "description"  TEXT,
  "deliverables" TEXT,
  "due_date"     TIMESTAMP(3),
  "amount"       INTEGER,
  "change_note"  TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "milestone_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milestone_revisions_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE,
  CONSTRAINT "milestone_revisions_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "milestone_revisions_milestone_id_idx"
  ON "milestone_revisions"("milestone_id");

-- ─── Step 7: Create dispute_evidence table ────────────────────────────────────
-- Stores files (screenshots, documents, etc.) uploaded to support a dispute.

CREATE TABLE IF NOT EXISTS "dispute_evidence" (
  "id"          TEXT         NOT NULL,
  "dispute_id"  TEXT         NOT NULL,
  "uploaded_by" TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "url"         TEXT         NOT NULL,
  "file_type"   TEXT         NOT NULL DEFAULT 'document',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dispute_evidence_dispute_id_fkey"
    FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE,
  CONSTRAINT "dispute_evidence_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "dispute_evidence_dispute_id_idx"
  ON "dispute_evidence"("dispute_id");

-- ─── Step 8: Create admin_logs table ─────────────────────────────────────────
-- Immutable audit trail for every significant admin action.

CREATE TABLE IF NOT EXISTS "admin_logs" (
  "id"          TEXT         NOT NULL,
  "admin_id"    TEXT         NOT NULL,
  "action"      TEXT         NOT NULL,
  "target_id"   TEXT,
  "target_type" TEXT,
  "notes"       TEXT,
  "metadata"    JSONB,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_logs_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "admin_logs_admin_id_created_at_idx"
  ON "admin_logs"("admin_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "admin_logs_target_id_target_type_idx"
  ON "admin_logs"("target_id", "target_type");
