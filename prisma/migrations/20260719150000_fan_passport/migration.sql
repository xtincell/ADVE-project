-- ADR-0158 — Passeport fan v1 (Phase B état-final, boucle B2 FANS).
-- Additif + backfill-safe : colonnes nullable, aucun défaut fabriqué.

-- SuperfanProfile : passeport (token public non-devinable) + code parrain fan.
ALTER TABLE "SuperfanProfile" ADD COLUMN "passportToken" TEXT;
ALTER TABLE "SuperfanProfile" ADD COLUMN "passportIssuedAt" TIMESTAMP(3);
ALTER TABLE "SuperfanProfile" ADD COLUMN "fanCode" TEXT;

CREATE UNIQUE INDEX "SuperfanProfile_passportToken_key" ON "SuperfanProfile"("passportToken");
CREATE UNIQUE INDEX "SuperfanProfile_fanCode_key" ON "SuperfanProfile"("fanCode");

-- Referral : le parrain peut désormais être un fan (profil) et non un compte.
ALTER TABLE "Referral" ALTER COLUMN "referrerUserId" DROP NOT NULL;
ALTER TABLE "Referral" ADD COLUMN "referrerProfileId" TEXT;

CREATE INDEX "Referral_referrerProfileId_idx" ON "Referral"("referrerProfileId");
