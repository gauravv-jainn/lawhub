-- LawHub Consolidation Migration 004
-- Adds: public_id + file_size + mime_type to milestone_attachments and dispute_evidence
--       for Cloudinary authenticated delivery (signed URLs) and secure deletion.
-- Run: npx prisma migrate deploy

-- ─── Step 1: Enhance milestone_attachments ────────────────────────────────────

ALTER TABLE "milestone_attachments"
  ADD COLUMN IF NOT EXISTS "public_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "file_size"  INTEGER,
  ADD COLUMN IF NOT EXISTS "mime_type"  TEXT;

-- ─── Step 2: Enhance dispute_evidence ────────────────────────────────────────

ALTER TABLE "dispute_evidence"
  ADD COLUMN IF NOT EXISTS "public_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "file_size"  INTEGER,
  ADD COLUMN IF NOT EXISTS "mime_type"  TEXT;
