-- AlterTable: extend Notification with type/priority/metadata/entity*/operatorId
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "Notification" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Notification" ADD COLUMN "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN "entityId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "operatorId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_operatorId_isRead_idx" ON "Notification"("operatorId", "isRead");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateTable: PushSubscription (Web Push subscriptions per user)
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- CreateTable: NotificationTemplate (Handlebars + MJML templates)
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "slug" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "bodyHbs" TEXT NOT NULL,
    "bodyMjml" TEXT,
    "variables" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_slug_key" ON "NotificationTemplate"("slug");
CREATE INDEX "NotificationTemplate_category_idx" ON "NotificationTemplate"("category");

-- CreateTable: McpRegistry (cartographie INBOUND/OUTBOUND MCP servers)
CREATE TABLE "McpRegistry" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "endpoint" TEXT,
    "credentialRef" TEXT,
    "toolsCache" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpRegistry_operatorId_direction_serverName_key" ON "McpRegistry"("operatorId", "direction", "serverName");
CREATE INDEX "McpRegistry_status_idx" ON "McpRegistry"("status");

-- CreateTable: McpToolInvocation (audit log lié à intentId)
CREATE TABLE "McpToolInvocation" (
    "id" TEXT NOT NULL,
    "registryId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "output" JSONB,
    "status" TEXT NOT NULL,
    "costUsd" DECIMAL(12,4),
    "durationMs" INTEGER,
    "intentId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToolInvocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "McpToolInvocation_registryId_createdAt_idx" ON "McpToolInvocation"("registryId", "createdAt");
CREATE INDEX "McpToolInvocation_intentId_idx" ON "McpToolInvocation"("intentId");
CREATE INDEX "McpToolInvocation_status_createdAt_idx" ON "McpToolInvocation"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "McpToolInvocation" ADD CONSTRAINT "McpToolInvocation_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "McpRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
