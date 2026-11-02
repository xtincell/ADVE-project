ALTER TABLE "Deal" ADD COLUMN "customerAccessTokenHash" TEXT, ADD COLUMN "customerAccessTokenEncrypted" TEXT;
CREATE UNIQUE INDEX "Deal_customerAccessTokenHash_key" ON "Deal"("customerAccessTokenHash");
ALTER TABLE "CrmMessage" ADD COLUMN "salesDealId" TEXT;
ALTER TABLE "CrmMessage" ALTER COLUMN "contactId" DROP NOT NULL;
CREATE INDEX "CrmMessage_salesDealId_createdAt_idx" ON "CrmMessage"("salesDealId", "createdAt");
CREATE TABLE "SalesRepresentative" (
 "id" TEXT PRIMARY KEY, "strategyId" TEXT NOT NULL, "operatorId" TEXT,
 "name" TEXT NOT NULL, "mode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
 "humanUserId" TEXT, "mcpKeyId" TEXT, "encryptedApiKey" TEXT, "conversationId" TEXT,
 "maxTurns" INTEGER NOT NULL DEFAULT 12, "maxTokens" INTEGER NOT NULL DEFAULT 60000,
 "dailyTokenBudget" INTEGER NOT NULL DEFAULT 150000, "dailyRunLimit" INTEGER NOT NULL DEFAULT 10,
 "lastWorkerSeenAt" TIMESTAMP(3), "budgetDay" TEXT, "dailyTokensReserved" INTEGER NOT NULL DEFAULT 0,
 "dailyRunsClaimed" INTEGER NOT NULL DEFAULT 0, "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SalesRepresentative_mcpKeyId_key" ON "SalesRepresentative"("mcpKeyId");
CREATE UNIQUE INDEX "SalesRepresentative_conversationId_key" ON "SalesRepresentative"("conversationId");
CREATE INDEX "SalesRepresentative_strategyId_status_idx" ON "SalesRepresentative"("strategyId", "status");
CREATE INDEX "SalesRepresentative_operatorId_idx" ON "SalesRepresentative"("operatorId");
CREATE TABLE "SalesRun" (
 "id" TEXT PRIMARY KEY, "representativeId" TEXT NOT NULL, "dealId" TEXT,
 "requestId" TEXT NOT NULL, "instruction" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
 "leaseToken" TEXT, "claimRequestId" TEXT, "claimedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
 "result" TEXT, "tokensUsed" INTEGER, "reservedTokens" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SalesRun_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SalesRun_requestId_key" ON "SalesRun"("requestId");
CREATE INDEX "SalesRun_representativeId_status_createdAt_idx" ON "SalesRun"("representativeId", "status", "createdAt");
CREATE INDEX "SalesRun_dealId_idx" ON "SalesRun"("dealId");
CREATE UNIQUE INDEX "SalesRun_claimRequestId_key" ON "SalesRun"("claimRequestId");
CREATE UNIQUE INDEX "CrmMessage_salesDealId_providerRef_direction_key" ON "CrmMessage"("salesDealId", "providerRef", "direction");
