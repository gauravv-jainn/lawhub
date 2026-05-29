-- LawHub Consolidation Migration 003
-- Adds: payment ledger (immutable audit), webhook deduplication,
--       idempotency on payments, lawyer quality metrics,
--       languages & resubmission_note on lawyer profiles.
-- Run: npx prisma migrate deploy

-- ─── Step 1: LedgerEventType enum ────────────────────────────────────────────

CREATE TYPE "LedgerEventType" AS ENUM (
  'PAYMENT_CREATED',
  'ESCROW_HELD',
  'PAYMENT_CAPTURED',
  'MILESTONE_RELEASED',
  'PARTIAL_REFUND',
  'FULL_REFUND',
  'PLATFORM_FEE_DEDUCTED',
  'TDS_DEDUCTED',
  'DISPUTE_FROZEN',
  'DISPUTE_RESOLVED',
  'ADMIN_OVERRIDE',
  'PAYMENT_FAILED'
);

-- ─── Step 2: Create payment_ledger table (append-only) ───────────────────────

CREATE TABLE IF NOT EXISTS "payment_ledger" (
  "id"             TEXT         NOT NULL,
  "payment_id"     TEXT         NOT NULL,
  "case_id"        TEXT         NOT NULL,
  "milestone_id"   TEXT,
  "dispute_id"     TEXT,
  "actor_id"       TEXT,
  "event_type"     "LedgerEventType" NOT NULL,
  "amount"         INTEGER      NOT NULL,
  "currency"       TEXT         NOT NULL DEFAULT 'INR',
  "balance_before" INTEGER      NOT NULL,
  "balance_after"  INTEGER      NOT NULL,
  "metadata"       JSONB,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_ledger_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_ledger_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_ledger_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Prevent any UPDATE or DELETE on the ledger table
-- (RLS / trigger approach — postgres only)
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'payment_ledger is append-only: UPDATE and DELETE are not permitted.';
END;
$$;

DROP TRIGGER IF EXISTS no_ledger_update ON "payment_ledger";
CREATE TRIGGER no_ledger_update
  BEFORE UPDATE OR DELETE ON "payment_ledger"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE INDEX IF NOT EXISTS "payment_ledger_payment_id_created_at_idx"
  ON "payment_ledger"("payment_id", "created_at" ASC);

CREATE INDEX IF NOT EXISTS "payment_ledger_case_id_created_at_idx"
  ON "payment_ledger"("case_id", "created_at" DESC);

-- ─── Step 3: Create webhook_events table (deduplication) ─────────────────────

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id"           TEXT         NOT NULL,
  "provider"     TEXT         NOT NULL,
  "event_id"     TEXT         NOT NULL,
  "event_type"   TEXT         NOT NULL,
  "processed"    BOOLEAN      NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "payload"      JSONB        NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_events_provider_event_id_key" UNIQUE ("provider", "event_id")
);

CREATE INDEX IF NOT EXISTS "webhook_events_provider_event_type_created_at_idx"
  ON "webhook_events"("provider", "event_type", "created_at" DESC);

-- ─── Step 4: Add idempotency_key to payments ─────────────────────────────────

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key"
  ON "payments"("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- ─── Step 5: Add quality metrics to lawyer_profiles ──────────────────────────

ALTER TABLE "lawyer_profiles"
  ADD COLUMN IF NOT EXISTS "languages"         TEXT[]  NOT NULL DEFAULT ARRAY['English','Hindi'],
  ADD COLUMN IF NOT EXISTS "resubmission_note" TEXT,
  ADD COLUMN IF NOT EXISTS "completion_rate"   FLOAT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dispute_rate"      FLOAT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "response_rate"     FLOAT   NOT NULL DEFAULT 0;
