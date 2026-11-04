CREATE TABLE "SalesPublicEntry" (
  "id" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "representativeId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "authorizedBy" TEXT NOT NULL,
  "intentId" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesPublicEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SalesPublicSession" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesPublicSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesPublicEntry_strategyId_key" ON "SalesPublicEntry"("strategyId");
CREATE UNIQUE INDEX "SalesPublicEntry_publicId_key" ON "SalesPublicEntry"("publicId");
CREATE INDEX "SalesPublicEntry_representativeId_idx" ON "SalesPublicEntry"("representativeId");
CREATE UNIQUE INDEX "SalesPublicSession_dealId_key" ON "SalesPublicSession"("dealId");
CREATE UNIQUE INDEX "SalesPublicSession_entryId_requestId_key" ON "SalesPublicSession"("entryId", "requestId");
CREATE UNIQUE INDEX "SalesPublicSession_entryId_secretHash_key" ON "SalesPublicSession"("entryId", "secretHash");
CREATE INDEX "SalesPublicSession_entryId_createdAt_idx" ON "SalesPublicSession"("entryId", "createdAt");
CREATE INDEX "SalesPublicSession_entryId_ipHash_createdAt_idx" ON "SalesPublicSession"("entryId", "ipHash", "createdAt");
ALTER TABLE "SalesPublicSession" ADD CONSTRAINT "SalesPublicSession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SalesPublicEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
