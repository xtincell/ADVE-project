-- ADR-0156 — Registre des prédictions (additive, backfill-safe)
CREATE TABLE "PredictionRecord" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "kind" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectKey" TEXT,
    "statement" TEXT NOT NULL,
    "baseline" DOUBLE PRECISION,
    "predictedValue" DOUBLE PRECISION,
    "predictedDirection" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "horizonAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "backtestMape" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcomeValue" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "brier" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictionRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PredictionRecord_strategyId_kind_status_idx" ON "PredictionRecord"("strategyId", "kind", "status");
CREATE INDEX "PredictionRecord_kind_subjectType_horizonAt_idx" ON "PredictionRecord"("kind", "subjectType", "horizonAt");
