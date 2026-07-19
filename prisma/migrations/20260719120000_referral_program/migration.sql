-- ADR-0157 — Parrainage manual-first (additif, backfill-safe)
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "codeUsed" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "refereeEmail" TEXT NOT NULL,
    "refereeName" TEXT,
    "companyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");
CREATE INDEX "Referral_referrerUserId_idx" ON "Referral"("referrerUserId");
CREATE INDEX "Referral_refereeEmail_idx" ON "Referral"("refereeEmail");
