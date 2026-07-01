-- Phase 23 Epic 1 Story 1.6 — Campaign + CampaignAction additive nullable fields.
-- ADR-0077 + ADR-0080 + ADR-0081 + architecture D8.
--
-- Single additive migration covering all Phase 23 nullable column needs
-- (manual coefficient mode, calibration snapshot pointer, operator-tagged
-- Overton delta, manual-entry audit flag). Zero new table, zero existing
-- column altered or dropped, zero breaking change — Prisma migrate dev style.
--
-- Consumed downstream by :
--   Epic 3 Story 3.7  — culture.overtonShift reads CampaignAction.overtonDeltaManual
--                       when set ; flags manualEntryFlag=true.
--   Epic 4 Story 4.5  — RUN_ATTRIBUTION_CALIBRATION mode MANUAL_COEFFICIENTS
--                       reads Campaign.attributionCoefficients.
--   Epic 4 Story 4.4  — calibration acceptance writes the resulting snapshot's
--                       IntentEmission.id to Campaign.activeCalibrationSnapshotRef.
--   Epic 6 Story 6.2  — PROMOTE_PIVOT_SUBCLUSTER handler validates the
--                       calibrationSnapshotRef payload against this field
--                       (Mestor pre-flight gate, ADR-0080 §3).
--
-- Pattern P22-6 (ADR-0080) — calibration snapshots themselves live as
-- RUN_ATTRIBUTION_CALIBRATION IntentEmission payloads (hash-chained),
-- NOT as a new Prisma table. The HARD test phase22-no-calibration-table.test.ts
-- (Epic 6 Story 6.7) asserts no model named Calibration* exists.

-- AlterTable: Campaign — additive nullable fields for manual-first parity
-- (FR25 attribution coefficients) and lifecycle traceability (FR24 active
-- snapshot pointer for PRODUCTION promotion gate).
ALTER TABLE "Campaign"
    ADD COLUMN "attributionCoefficients" JSONB,
    ADD COLUMN "activeCalibrationSnapshotRef" TEXT;

-- AlterTable: CampaignAction — additive nullable fields for manual-first
-- Overton delta mode (FR26) and audit flag for manual-driven actions.
ALTER TABLE "CampaignAction"
    ADD COLUMN "overtonDeltaManual" DOUBLE PRECISION,
    ADD COLUMN "manualEntryFlag" BOOLEAN DEFAULT false;
