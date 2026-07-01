-- Vague 5 — MCP billable : metering à la frontière HTTP + relevés mensuels gelés.

ALTER TABLE "McpApiKey" ADD COLUMN "ratePerCallUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.002;
ALTER TABLE "McpApiKey" ADD COLUMN "includedMonthlyCalls" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "McpApiKey" ADD COLUMN "ownerEmail" TEXT;

CREATE TABLE "McpApiCall" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "userId" TEXT,
    "server" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpApiCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "McpApiCall_apiKeyId_createdAt_idx" ON "McpApiCall"("apiKeyId", "createdAt");
CREATE INDEX "McpApiCall_server_createdAt_idx" ON "McpApiCall"("server", "createdAt");
ALTER TABLE "McpApiCall" ADD CONSTRAINT "McpApiCall_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "McpApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "McpUsageStatement" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL,
    "billableCalls" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "McpUsageStatement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "McpUsageStatement_apiKeyId_period_key" ON "McpUsageStatement"("apiKeyId", "period");
CREATE INDEX "McpUsageStatement_status_period_idx" ON "McpUsageStatement"("status", "period");
ALTER TABLE "McpUsageStatement" ADD CONSTRAINT "McpUsageStatement_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "McpApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
