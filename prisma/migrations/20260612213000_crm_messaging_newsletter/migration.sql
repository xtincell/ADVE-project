-- Vague 10 — CRM backend : contacts unifiés, messagerie, newsletter.

CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strategyId" TEXT,
    "userId" TEXT,
    "newsletterOptIn" BOOLEAN NOT NULL DEFAULT false,
    "subscribedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CrmContact_email_key" ON "CrmContact"("email");
CREATE UNIQUE INDEX "CrmContact_unsubscribeToken_key" ON "CrmContact"("unsubscribeToken");
CREATE INDEX "CrmContact_source_idx" ON "CrmContact"("source");
CREATE INDEX "CrmContact_newsletterOptIn_idx" ON "CrmContact"("newsletterOptIn");

CREATE TABLE "CrmMessage" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT,
    "providerRef" TEXT,
    "error" TEXT,
    "sentBy" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmMessage_contactId_createdAt_idx" ON "CrmMessage"("contactId", "createdAt");
CREATE INDEX "CrmMessage_campaignId_idx" ON "CrmMessage"("campaignId");
CREATE INDEX "CrmMessage_status_idx" ON "CrmMessage"("status");
ALTER TABLE "CrmMessage" ADD CONSTRAINT "CrmMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyMjml" TEXT,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NewsletterCampaign_status_createdAt_idx" ON "NewsletterCampaign"("status", "createdAt");
