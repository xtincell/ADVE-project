-- Fix migration desync (2026-06-22).
-- `_prisma_migrations` recorded 20260612122500_talent_payout_phone as applied,
-- but the column was missing in the live DB (DDL never took effect / DB branched).
-- `migrate deploy` skips an already-recorded migration, so it would never repair
-- it. This NEW migration re-adds the column idempotently — applied on next deploy.
ALTER TABLE "TalentProfile" ADD COLUMN IF NOT EXISTS "payoutPhone" TEXT;
