-- F7 (audit adversarial 2026-07-22) — anti-rejeu du cycle d'abonnement mobile
-- money. Le garde d'idempotence ne retenait que `providerSnapshot.lastCycleRef`
-- (mono-slot) : un webhook PAID d'un cycle ANTÉRIEUR ré-étendait +30 j. On
-- déduplique désormais par paiement (`IntakePayment.cycleAppliedAt`). Purement
-- additif, backfill-safe (NULL = cycle non encore appliqué).

-- AlterTable
ALTER TABLE "IntakePayment" ADD COLUMN "cycleAppliedAt" TIMESTAMP(3);
