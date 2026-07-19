-- Fix prod 2026-07-19 (ADR-0161) — rate-limit des scans frais du scoreur
-- partagé entre workers : le compteur en mémoire par instance multipliait
-- MAX_PER_WINDOW par le nombre de workers Coolify. Table technique éphémère.

-- CreateTable
CREATE TABLE "ScanRateHit" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanRateHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanRateHit_ip_at_idx" ON "ScanRateHit"("ip", "at");

-- CreateIndex
CREATE INDEX "ScanRateHit_at_idx" ON "ScanRateHit"("at");
