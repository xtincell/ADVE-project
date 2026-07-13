-- Increment 2b — préférences/sécurité du compte fondateur (additif, backfill-safe).
-- themePreference : défaut cockpit par utilisateur ("light"/"dark", NULL = défaut système).
-- passwordChangeInvited : invitation dismissable à changer un mot de passe provisoire.
ALTER TABLE "User" ADD COLUMN "themePreference" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordChangeInvited" BOOLEAN NOT NULL DEFAULT false;
