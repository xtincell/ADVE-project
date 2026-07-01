-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('SERVER', 'CLIENT', 'PRISMA', 'NSP', 'PTAH', 'STRESS_TEST', 'CRON', 'WEBHOOK', 'UNKNOWN');

-- CreateTable
CREATE TABLE "ErrorEvent" (
    "id" TEXT NOT NULL,
    "source" "ErrorSource" NOT NULL DEFAULT 'UNKNOWN',
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'ERROR',
    "code" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "userId" TEXT,
    "operatorId" TEXT,
    "strategyId" TEXT,
    "campaignId" TEXT,
    "intentId" TEXT,
    "trpcProcedure" TEXT,
    "componentPath" TEXT,
    "userAgent" TEXT,
    "signature" TEXT NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedReason" TEXT,
    "knownFalsePositive" BOOLEAN NOT NULL DEFAULT false,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorEvent_signature_resolved_idx" ON "ErrorEvent"("signature", "resolved");

-- CreateIndex
CREATE INDEX "ErrorEvent_source_severity_resolved_idx" ON "ErrorEvent"("source", "severity", "resolved");

-- CreateIndex
CREATE INDEX "ErrorEvent_operatorId_resolved_idx" ON "ErrorEvent"("operatorId", "resolved");

-- CreateIndex
CREATE INDEX "ErrorEvent_createdAt_idx" ON "ErrorEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_lastSeenAt_idx" ON "ErrorEvent"("lastSeenAt");

