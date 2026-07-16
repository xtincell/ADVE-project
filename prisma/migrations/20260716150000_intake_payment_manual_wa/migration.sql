-- Audit 2026-07-16 `intake-paywall-env-vars-shown-to-lead-no-manual-fallback` :
-- rail manuel WhatsApp pour les paiements one-shot du funnel (INTAKE_PDF /
-- ORACLE_FULL) quand aucun provider n'est configuré. Additif, backfill-safe.
ALTER TYPE "IntakePaymentProvider" ADD VALUE IF NOT EXISTS 'MANUAL_WA';
