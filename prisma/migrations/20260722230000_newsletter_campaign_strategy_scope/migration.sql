-- ADR-0166 — NewsletterCampaign scoping par marque (additif nullable, backfill-safe).
-- Aligne la campagne sur les abonnés (CrmContact.strategyId) et le fournisseur
-- email (BrandEmailConnector) déjà par-marque. Ferme deux fuites cross-marque :
--   * newslettersList lisait TOUTES les campagnes (toutes marques confondues) ;
--   * newslettersStats exposait les emails/noms des destinataires de N'IMPORTE
--     quelle campagne.
-- Les campagnes existantes restent strategyId=NULL → visibles opérateur seul
-- (fail-closed pour les fondateurs).
ALTER TABLE "NewsletterCampaign" ADD COLUMN "strategyId" TEXT;

CREATE INDEX "NewsletterCampaign_strategyId_createdAt_idx" ON "NewsletterCampaign"("strategyId", "createdAt");
