-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "insights" JSONB;

-- CreateTable
CREATE TABLE "SocialInboxItem" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'COMMENT',
    "externalId" TEXT NOT NULL,
    "parentExternalId" TEXT,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "authorExternalId" TEXT,
    "text" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "permalinkUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "repliedAt" TIMESTAMP(3),
    "replyText" TEXT,
    "replyExternalId" TEXT,
    "sentiment" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialInboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialInboxItem_strategyId_status_publishedAt_idx" ON "SocialInboxItem"("strategyId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "SocialInboxItem_strategyId_platform_idx" ON "SocialInboxItem"("strategyId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialInboxItem_connectionId_externalId_key" ON "SocialInboxItem"("connectionId", "externalId");

-- AddForeignKey
ALTER TABLE "SocialInboxItem" ADD CONSTRAINT "SocialInboxItem_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInboxItem" ADD CONSTRAINT "SocialInboxItem_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
