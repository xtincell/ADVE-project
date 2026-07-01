-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('OWNER', 'LICENSED', 'TRIAL');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('HOLDING', 'COMMUNICATION', 'RELATIONS_PUBLIQUES', 'MEDIA_BUYING', 'DIGITAL', 'EVENEMENTIEL', 'PRODUCTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AllocationRole" AS ENUM ('LEAD', 'SUPPORT', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "GuildTier" AS ENUM ('APPRENTI', 'COMPAGNON', 'MAITRE', 'ASSOCIE');

-- CreateEnum
CREATE TYPE "DriverChannel" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'WEBSITE', 'PACKAGING', 'EVENT', 'PR', 'PRINT', 'VIDEO', 'RADIO', 'TV', 'OOH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('DIGITAL', 'PHYSICAL', 'EXPERIENTIAL', 'MEDIA');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('DAEMON', 'TRIGGERED', 'BATCH');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewVerdict" AS ENUM ('ACCEPTED', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('AUTOMATED', 'PEER', 'FIXER', 'CLIENT');

-- CreateEnum
CREATE TYPE "MissionMode" AS ENUM ('DISPATCH', 'COLLABORATIF');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'CANCELLED', 'EXEMPT');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('DIAGNOSTIC_RESULT', 'MISSION_OUTCOME', 'BRIEF_PATTERN', 'CREATOR_PATTERN', 'SECTOR_BENCHMARK', 'CAMPAIGN_TEMPLATE', 'FEEDBACK_VALIDATED');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('AWAITING_SIGNALS', 'PARTIAL', 'COMPLETE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuickIntakeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntakeMethod" AS ENUM ('GUIDED', 'IMPORT', 'LONG', 'SHORT', 'INGEST', 'INGEST_PLUS');

-- CreateEnum
CREATE TYPE "BrandNature" AS ENUM ('PRODUCT', 'SERVICE', 'CHARACTER_IP', 'FESTIVAL_IP', 'MEDIA_IP', 'RETAIL_SPACE', 'PLATFORM', 'INSTITUTION', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CampaignState" AS ENUM ('BRIEF_DRAFT', 'BRIEF_VALIDATED', 'PLANNING', 'CREATIVE_DEV', 'PRODUCTION', 'PRE_PRODUCTION', 'APPROVAL', 'READY_TO_LAUNCH', 'LIVE', 'POST_CAMPAIGN', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionCategory" AS ENUM ('ATL', 'BTL', 'TTL');

-- CreateEnum
CREATE TYPE "ProductionState" AS ENUM ('DEVIS', 'BAT', 'EN_PRODUCTION', 'LIVRAISON', 'INSTALLE', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "FieldOpStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AARRStage" AS ENUM ('ACQUISITION', 'ACTIVATION', 'RETENTION', 'REVENUE', 'REFERRAL');

-- CreateEnum
CREATE TYPE "FrameworkLayer" AS ENUM ('IDENTITY', 'VALUE', 'EXPERIENCE', 'VALIDATION', 'EXECUTION', 'MEASUREMENT', 'GROWTH', 'EVOLUTION', 'SURVIVAL');

-- CreateEnum
CREATE TYPE "FrameworkExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "MediaSyncStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY_ORANGE', 'MOBILE_MONEY_MTN', 'MOBILE_MONEY_WAVE', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntakePaymentProvider" AS ENUM ('CINETPAY', 'STRIPE', 'MOCK');

-- CreateEnum
CREATE TYPE "IntakePaymentCurrency" AS ENUM ('XAF', 'EUR');

-- CreateEnum
CREATE TYPE "IntakePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "AmbassadorTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'ESCALATE', 'EXPORT');

-- CreateEnum
CREATE TYPE "CampaignTeamRole" AS ENUM ('ACCOUNT_DIRECTOR', 'ACCOUNT_MANAGER', 'STRATEGIC_PLANNER', 'CREATIVE_DIRECTOR', 'ART_DIRECTOR', 'COPYWRITER', 'MEDIA_PLANNER', 'MEDIA_BUYER', 'SOCIAL_MANAGER', 'PRODUCTION_MANAGER', 'PROJECT_MANAGER', 'DATA_ANALYST', 'CLIENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "hashedPassword" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "operatorId" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDummy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OperatorStatus" NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "licensedAt" TIMESTAMP(3) NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "branding" JSONB,
    "maxBrands" INTEGER NOT NULL DEFAULT 50,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "agencyType" "AgencyType" NOT NULL DEFAULT 'COMMUNICATION',
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parentId" TEXT,
    "dataRegion" TEXT NOT NULL DEFAULT 'eu-west',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDummy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAllocation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "role" "AllocationRole" NOT NULL DEFAULT 'LEAD',
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "sector" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "billingInfo" JSONB,
    "operatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "operatorId" TEXT,
    "clientId" TEXT,
    "advertis_vector" JSONB,
    "businessContext" JSONB,
    "financialCapacity" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "brandNature" "BrandNature",
    "primaryChannel" "DriverChannel",
    "countryCode" VARCHAR(2),
    "currencyCode" VARCHAR(3),
    "notoriaPipeline" JSONB,
    "llmBudget" DOUBLE PRECISION,
    "llmBudgetAlerts" JSONB,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDummy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "advertis_vector" JSONB,
    "devotionObjective" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "state" "CampaignState" NOT NULL DEFAULT 'BRIEF_DRAFT',
    "budget" DOUBLE PRECISION,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "objectives" JSONB,
    "aarrTargets" JSONB,
    "parentCampaignId" TEXT,
    "code" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "campaignId" TEXT,
    "strategyId" TEXT NOT NULL,
    "advertis_vector" JSONB,
    "mode" "MissionMode",
    "driverId" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "assigneeId" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "briefData" JSONB,
    "budget" DOUBLE PRECISION,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionDeliverable" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "skills" JSONB,
    "tier" "GuildTier" NOT NULL DEFAULT 'APPRENTI',
    "advertis_vector" JSONB,
    "firstPassRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collabMissions" INTEGER NOT NULL DEFAULT 0,
    "peerReviews" INTEGER NOT NULL DEFAULT 0,
    "driverSpecialties" JSONB,
    "guildOrganizationId" TEXT,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "advertis_vector" JSONB,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceExecution" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "sequenceKey" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "campaignId" TEXT,
    "status" TEXT NOT NULL,
    "stepResults" JSONB NOT NULL,
    "finalContext" JSONB,
    "totalDurationMs" INTEGER,
    "qualityScore" DOUBLE PRECISION,
    "approval" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "supersedes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GloryOutput" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "output" JSONB,
    "advertis_vector" JSONB,
    "executionId" TEXT,
    "promptVersion" INTEGER,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GloryOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT,
    "pillarTags" JSONB,
    "assetType" TEXT,
    "sourceExecutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pillar" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" JSONB,
    "confidence" DOUBLE PRECISION,
    "validationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "staleAt" TIMESTAMP(3),
    "sources" JSONB,
    "pendingRecos" JSONB,
    "commentary" JSONB,
    "completionLevel" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PillarVersion" (
    "id" TEXT NOT NULL,
    "pillarId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "diff" JSONB,
    "author" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PillarVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDataSource" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "rawContent" TEXT,
    "rawData" JSONB,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedFields" JSONB,
    "pillarMapping" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientId" TEXT,
    "recipientType" TEXT,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "channel" "DriverChannel" NOT NULL,
    "channelType" "DriverType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "formatSpecs" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "briefTemplate" JSONB NOT NULL,
    "qcCriteria" JSONB NOT NULL,
    "pillarPriority" JSONB NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverGloryTool" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "gloryTool" TEXT NOT NULL,

    CONSTRAINT "DriverGloryTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "tier" "GuildTier" NOT NULL DEFAULT 'APPRENTI',
    "advertis_vector" JSONB,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "firstPassRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgQcScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specializations" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReview" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "verdict" "ReviewVerdict" NOT NULL,
    "pillarScores" JSONB NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT NOT NULL,
    "reviewType" "ReviewType" NOT NULL,
    "reviewDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "deliverableId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pillarTags" JSONB,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "type" "ProcessType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProcessStatus" NOT NULL,
    "frequency" TEXT,
    "triggerSignal" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "driverId" TEXT,
    "assigneeId" TEXT,
    "playbook" JSONB,
    "result" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "tierAtTime" "GuildTier",
    "operatorFee" DOUBLE PRECISION,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "tier" "GuildTier" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "MembershipStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevotionSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "spectateur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interesse" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ambassadeur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evangeliste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devotionScore" DOUBLE PRECISION NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevotionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "entryType" "KnowledgeType" NOT NULL,
    "sector" TEXT,
    "market" TEXT,
    "channel" TEXT,
    "pillarFocus" TEXT,
    "businessModel" TEXT,
    "data" JSONB NOT NULL,
    "successScore" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 1,
    "sourceHash" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableTracking" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "expectedSignals" JSONB NOT NULL,
    "receivedSignals" JSONB NOT NULL DEFAULT '[]',
    "pillarImpact" JSONB,
    "status" "TrackingStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "strategyId" TEXT,
    "missionId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "externalRef" TEXT,
    "participants" JSONB NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderAvatar" TEXT,
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "externalId" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickIntake" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT NOT NULL,
    "sector" TEXT,
    "country" TEXT,
    "businessModel" TEXT,
    "economicModel" TEXT,
    "positioning" TEXT,
    "method" "IntakeMethod" NOT NULL DEFAULT 'LONG',
    "responses" JSONB NOT NULL,
    "financialResponses" JSONB,
    "rawText" TEXT,
    "documentUrl" TEXT,
    "websiteUrl" TEXT,
    "advertis_vector" JSONB,
    "classification" TEXT,
    "diagnostic" JSONB,
    "shareToken" TEXT NOT NULL,
    "status" "QuickIntakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "convertedToId" TEXT,
    "source" TEXT,
    "brandNature" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAction" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ActionCategory" NOT NULL,
    "actionType" TEXT NOT NULL,
    "driverId" TEXT,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "specs" JSONB,
    "kpis" JSONB,
    "aarrStage" TEXT,
    "coutUnitaire" DOUBLE PRECISION,
    "uniteCosting" TEXT,
    "rendementDecroissant" DOUBLE PRECISION,
    "sovTarget" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignExecution" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productionState" "ProductionState" NOT NULL DEFAULT 'DEVIS',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "deliverableUrl" TEXT,
    "feedback" TEXT,
    "specs" JSONB,
    "executionType" TEXT,
    "vendor" TEXT,
    "devisAmount" DOUBLE PRECISION,
    "devisCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAmplification" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metrics" JSONB,
    "mediaType" TEXT,
    "mediaCost" DOUBLE PRECISION,
    "productionCost" DOUBLE PRECISION,
    "agencyFee" DOUBLE PRECISION,
    "reach" INTEGER,
    "views" INTEGER,
    "engagements" INTEGER,
    "aarrAttribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAmplification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTeamMember" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CampaignTeamRole" NOT NULL,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMilestone" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "gateReview" JSONB,
    "phase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isGateReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignApproval" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "fromState" "CampaignState" NOT NULL,
    "toState" "CampaignState" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "approvalType" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "category" TEXT,
    "pillarTags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "assetType" TEXT,
    "gloryOutputId" TEXT,
    "brandVaultPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBrief" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "targetDriver" TEXT,
    "advertis_vector" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "briefType" TEXT,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDependency" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "depType" TEXT NOT NULL DEFAULT 'BLOCKS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLink" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "linkedType" TEXT NOT NULL,
    "linkedId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "planned" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "actionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFieldOp" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "FieldOpStatus" NOT NULL DEFAULT 'PLANNED',
    "teamSize" INTEGER,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "briefData" JSONB,
    "results" JSONB,
    "team" JSONB,
    "ambassadors" JSONB,
    "aarrConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignFieldOp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFieldReport" (
    "id" TEXT NOT NULL,
    "fieldOpId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "photos" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatorOverrides" JSONB,
    "acquisitionCount" DOUBLE PRECISION,
    "acquisitionLabel" TEXT,
    "acquisitionUnit" TEXT,
    "activationCount" DOUBLE PRECISION,
    "activationLabel" TEXT,
    "activationUnit" TEXT,
    "retentionCount" DOUBLE PRECISION,
    "retentionLabel" TEXT,
    "retentionUnit" TEXT,
    "revenueCount" DOUBLE PRECISION,
    "revenueLabel" TEXT,
    "revenueUnit" TEXT,
    "referralCount" DOUBLE PRECISION,
    "referralLabel" TEXT,
    "referralUnit" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAARRMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stage" "AARRStage" NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION,
    "period" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAARRMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Framework" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layer" "FrameworkLayer" NOT NULL,
    "description" TEXT,
    "dependencies" JSONB,
    "inputSchema" JSONB,
    "outputSchema" JSONB,
    "promptTemplate" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Framework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkExecution" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "status" "FrameworkExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "aiCost" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkResult" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "pillarKey" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "prescriptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultIndexSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "engagementDepth" DOUBLE PRECISION NOT NULL,
    "superfanVelocity" DOUBLE PRECISION NOT NULL,
    "communityCohesion" DOUBLE PRECISION NOT NULL,
    "brandDefenseRate" DOUBLE PRECISION NOT NULL,
    "ugcGenerationRate" DOUBLE PRECISION NOT NULL,
    "ritualAdoption" DOUBLE PRECISION NOT NULL,
    "evangelismScore" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CultIndexSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperfanProfile" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "engagementDepth" DOUBLE PRECISION NOT NULL,
    "segment" TEXT NOT NULL,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperfanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "health" DOUBLE PRECISION NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,
    "activeRate" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandVariable" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariableHistory" (
    "id" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariableHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "advertis_vector" JSONB NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "status" "MediaSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "externalPostId" TEXT NOT NULL,
    "content" TEXT,
    "publishedAt" TIMESTAMP(3),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "sentiment" DOUBLE PRECISION,
    "pillarTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPlatformConnection" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "credentials" JSONB,
    "status" "MediaSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPerformanceSync" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "campaignRef" TEXT,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "spend" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "period" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPerformanceSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressRelease" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "pillarTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PressRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressDistribution" (
    "id" TEXT NOT NULL,
    "pressReleaseId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PressDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressClipping" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "pressReleaseId" TEXT,
    "outlet" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "reach" INTEGER,
    "sentiment" DOUBLE PRECISION,
    "pillarTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PressClipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "outlet" TEXT NOT NULL,
    "beat" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "terms" JSONB,
    "signedAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowCondition" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "met" BOOLEAN NOT NULL DEFAULT false,
    "metAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "EscrowCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "transactionRef" TEXT,
    "providerRef" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakePayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "intakeToken" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "IntakePaymentCurrency" NOT NULL,
    "provider" "IntakePaymentProvider" NOT NULL,
    "status" "IntakePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "userId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'LEAD',
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "source" TEXT,
    "intakeId" TEXT,
    "notes" TEXT,
    "wonAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelMapping" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "FunnelMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketStudy" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "summary" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSource" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "reliability" DOUBLE PRECISION,
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSynthesis" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "pillarImpact" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSynthesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "positioning" TEXT,
    "estimatedScore" DOUBLE PRECISION,
    "source" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightReport" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "pillarImpact" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionEvent" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "content" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "convertedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "cohortKey" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "retentionRate" DOUBLE PRECISION,
    "revenuePerUser" DOUBLE PRECISION,
    "churnRate" DOUBLE PRECISION,
    "metrics" JSONB,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorProgram" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tiers" JSONB NOT NULL,
    "rewards" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorMember" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "platform" TEXT,
    "handle" TEXT,
    "tier" "AmbassadorTier" NOT NULL DEFAULT 'BRONZE',
    "points" INTEGER NOT NULL DEFAULT 0,
    "referrals" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbassadorMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "category" TEXT NOT NULL,
    "pillarFocus" TEXT,
    "content" JSONB NOT NULL,
    "duration" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCertification" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "TalentCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentReview" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB,
    "improvements" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubType" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'MEMBER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "attendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoutiqueItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "imageUrl" TEXT,
    "category" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoutiqueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverUrl" TEXT,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pillarTags" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationDocument" (
    "id" TEXT NOT NULL,
    "sourceLocale" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT,
    "context" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "translatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICostLog" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "context" TEXT,
    "userId" TEXT,
    "strategyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICostLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandOSConfig" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "viewMode" TEXT NOT NULL DEFAULT 'EXECUTIVE',
    "theme" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandOSConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "actionTypes" JSONB NOT NULL,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "timeline" JSONB,
    "channels" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionRequest" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMNote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CRMNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMActivity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoutiqueOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingAddress" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoutiqueOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialComment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpServerConfig" (
    "id" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "healthUrl" TEXT,
    "lastHealthCheck" TIMESTAMP(3),
    "lastHealthStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildOrganizationMetric" (
    "id" TEXT NOT NULL,
    "guildOrganizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "completedMissions" INTEGER NOT NULL DEFAULT 0,
    "avgQcScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstPassRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildOrganizationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "quiet" JSONB,
    "digestFrequency" TEXT NOT NULL DEFAULT 'INSTANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "pillarTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "category" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MestorThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "strategyId" TEXT,
    "title" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MestorThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariableStoreConfig" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "stalenessThresholdDays" INTEGER NOT NULL DEFAULT 30,
    "propagationRules" JSONB,
    "autoRecalculate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableStoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationPlan" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "estimatedAiCalls" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestrationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationStep" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestrationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "targetPillarKey" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "operation" TEXT NOT NULL DEFAULT 'SET',
    "currentSnapshot" JSONB,
    "proposedValue" JSONB,
    "targetMatch" JSONB,
    "agent" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "modelVersion" TEXT,
    "inputSnapshotId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explain" TEXT NOT NULL,
    "advantages" JSONB,
    "disadvantages" JSONB,
    "urgency" TEXT NOT NULL DEFAULT 'SOON',
    "impact" TEXT NOT NULL,
    "destructive" BOOLEAN NOT NULL DEFAULT false,
    "applyPolicy" TEXT NOT NULL DEFAULT 'suggest',
    "validationWarning" TEXT,
    "sectionGroup" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "revertReason" TEXT,
    "batchId" TEXT,
    "missionType" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationBatch" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "missionType" TEXT NOT NULL,
    "sourcePillars" JSONB NOT NULL,
    "targetPillars" JSONB NOT NULL,
    "totalRecos" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "agent" TEXT NOT NULL,
    "modelVersion" TEXT,
    "pipelineStage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JehutyCuration" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JehutyCuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalConnector" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "connectorType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "avgConfidence" DOUBLE PRECISION,
    "errorLog" JSONB,
    "pillarMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentEmission" (
    "id" TEXT NOT NULL,
    "intentKind" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "caller" TEXT NOT NULL DEFAULT 'unknown',
    "version" INTEGER NOT NULL DEFAULT 1,
    "spawnedFrom" TEXT,
    "governor" TEXT NOT NULL DEFAULT 'MESTOR',
    "costUsd" DECIMAL(12,4),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "prevHash" TEXT,
    "selfHash" TEXT,
    "emittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IntentEmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentEmissionEvent" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "stepName" TEXT,
    "stepIndex" INTEGER,
    "stepTotal" INTEGER,
    "partial" JSONB,
    "costUsd" DECIMAL(12,4),
    "emittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentEmissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentQueue" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '',
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "usdRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'fr',
    "currencyCode" VARCHAR(3) NOT NULL,
    "purchasingPowerIndex" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "region" TEXT NOT NULL DEFAULT 'AFRICA',
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "marketMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OracleSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "parentIntentId" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'fr',
    "snapshotJson" JSONB NOT NULL,

    CONSTRAINT "OracleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalUserId" TEXT,
    "encryptedTokens" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretCipher" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "recoveryCodesCipher" TEXT,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBenchmark" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "businessModel" TEXT,
    "brandNature" TEXT,
    "premiumScope" TEXT,
    "metric" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "p10" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "sourceRef" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "MarketBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSizing" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "segment" TEXT,
    "year" INTEGER NOT NULL,
    "TAM" DOUBLE PRECISION,
    "SAM" DOUBLE PRECISION,
    "SOM" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "growthRate" DOUBLE PRECISION,
    "sourceRef" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSizing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostStructure" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "businessModel" TEXT,
    "line" TEXT NOT NULL,
    "pctRevenue_p10" DOUBLE PRECISION NOT NULL,
    "pctRevenue_p50" DOUBLE PRECISION NOT NULL,
    "pctRevenue_p90" DOUBLE PRECISION NOT NULL,
    "sourceRef" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveLandscape" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "segment" TEXT,
    "year" INTEGER NOT NULL,
    "leaderShare" DOUBLE PRECISION,
    "top3HHI" DOUBLE PRECISION,
    "notes" TEXT,
    "sourceRef" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitiveLandscape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "country" TEXT,
    "sector" TEXT,
    "year" INTEGER,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frontmatter" JSONB,
    "body" TEXT NOT NULL,
    "sourceRef" JSONB,
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandContextNode" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pillarKey" TEXT,
    "field" TEXT,
    "sourceId" TEXT,
    "payload" JSONB NOT NULL,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "embeddingProvider" TEXT,
    "embeddingModel" TEXT,
    "embeddingDim" INTEGER,
    "metadata" JSONB,
    "contentHash" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandContextNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketContextNode" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "metadata" JSONB,
    "contentHash" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketContextNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAction" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "touchpoint" TEXT,
    "aarrrIntent" TEXT,
    "persona" TEXT,
    "sku" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "budgetCurrency" TEXT DEFAULT 'XAF',
    "opportunity" TEXT,
    "locality" TEXT,
    "timingStart" TIMESTAMP(3),
    "timingEnd" TIMESTAMP(3),
    "priority" TEXT DEFAULT 'P2',
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'NOTORIA_GENERATED',
    "recoId" TEXT,
    "intentEmissionId" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostDecision" (
    "id" TEXT NOT NULL,
    "intentEmissionId" TEXT NOT NULL,
    "intentKind" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "strategyId" TEXT,
    "decision" TEXT NOT NULL,
    "estimatedUsd" DECIMAL(12,4) NOT NULL,
    "remainingBudgetUsd" DECIMAL(12,4) NOT NULL,
    "downgradeFromTier" TEXT,
    "downgradeToTier" TEXT,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "culturalAxis" JSONB,
    "dominantNarratives" TEXT[],
    "overtonState" JSONB,
    "lastObservedAt" TIMESTAMP(3),
    "countryCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyDoc" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "docKind" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "yState" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastEditor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_slug_key" ON "Operator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAllocation_clientId_operatorId_key" ON "ClientAllocation"("clientId", "operatorId");

-- CreateIndex
CREATE INDEX "Client_operatorId_idx" ON "Client"("operatorId");

-- CreateIndex
CREATE INDEX "Client_contactEmail_idx" ON "Client"("contactEmail");

-- CreateIndex
CREATE INDEX "Strategy_clientId_idx" ON "Strategy"("clientId");

-- CreateIndex
CREATE INDEX "Strategy_tenantId_idx" ON "Strategy"("tenantId");

-- CreateIndex
CREATE INDEX "Campaign_strategyId_idx" ON "Campaign"("strategyId");

-- CreateIndex
CREATE INDEX "Campaign_state_idx" ON "Campaign"("state");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- CreateIndex
CREATE INDEX "Mission_strategyId_idx" ON "Mission"("strategyId");

-- CreateIndex
CREATE INDEX "Mission_campaignId_idx" ON "Mission"("campaignId");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_tenantId_idx" ON "Mission"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentProfile_userId_key" ON "TalentProfile"("userId");

-- CreateIndex
CREATE INDEX "Signal_tenantId_idx" ON "Signal"("tenantId");

-- CreateIndex
CREATE INDEX "SequenceExecution_strategyId_sequenceKey_approval_idx" ON "SequenceExecution"("strategyId", "sequenceKey", "approval");

-- CreateIndex
CREATE INDEX "SequenceExecution_strategyId_tier_idx" ON "SequenceExecution"("strategyId", "tier");

-- CreateIndex
CREATE INDEX "GloryOutput_tenantId_idx" ON "GloryOutput"("tenantId");

-- CreateIndex
CREATE INDEX "Pillar_tenantId_idx" ON "Pillar"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Pillar_strategyId_key_key" ON "Pillar"("strategyId", "key");

-- CreateIndex
CREATE INDEX "PillarVersion_pillarId_idx" ON "PillarVersion"("pillarId");

-- CreateIndex
CREATE INDEX "PillarVersion_createdAt_idx" ON "PillarVersion"("createdAt");

-- CreateIndex
CREATE INDEX "BrandDataSource_strategyId_idx" ON "BrandDataSource"("strategyId");

-- CreateIndex
CREATE INDEX "BrandDataSource_processingStatus_idx" ON "BrandDataSource"("processingStatus");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Driver_strategyId_idx" ON "Driver"("strategyId");

-- CreateIndex
CREATE INDEX "Driver_tenantId_idx" ON "Driver"("tenantId");

-- CreateIndex
CREATE INDEX "DriverGloryTool_driverId_idx" ON "DriverGloryTool"("driverId");

-- CreateIndex
CREATE INDEX "QualityReview_deliverableId_idx" ON "QualityReview"("deliverableId");

-- CreateIndex
CREATE INDEX "QualityReview_reviewerId_idx" ON "QualityReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PortfolioItem_talentProfileId_idx" ON "PortfolioItem"("talentProfileId");

-- CreateIndex
CREATE INDEX "Process_strategyId_idx" ON "Process"("strategyId");

-- CreateIndex
CREATE INDEX "Process_status_idx" ON "Process"("status");

-- CreateIndex
CREATE INDEX "Commission_missionId_idx" ON "Commission"("missionId");

-- CreateIndex
CREATE INDEX "Membership_talentProfileId_idx" ON "Membership"("talentProfileId");

-- CreateIndex
CREATE INDEX "DevotionSnapshot_strategyId_idx" ON "DevotionSnapshot"("strategyId");

-- CreateIndex
CREATE INDEX "DevotionSnapshot_measuredAt_idx" ON "DevotionSnapshot"("measuredAt");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_entryType_idx" ON "KnowledgeEntry"("entryType");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_sector_idx" ON "KnowledgeEntry"("sector");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_market_idx" ON "KnowledgeEntry"("market");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_businessModel_idx" ON "KnowledgeEntry"("businessModel");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_tenantId_idx" ON "KnowledgeEntry"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableTracking_deliverableId_key" ON "DeliverableTracking"("deliverableId");

-- CreateIndex
CREATE INDEX "Conversation_strategyId_idx" ON "Conversation"("strategyId");

-- CreateIndex
CREATE INDEX "Conversation_channel_idx" ON "Conversation"("channel");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_channel_idx" ON "Message"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "QuickIntake_shareToken_key" ON "QuickIntake"("shareToken");

-- CreateIndex
CREATE INDEX "QuickIntake_shareToken_idx" ON "QuickIntake"("shareToken");

-- CreateIndex
CREATE INDEX "QuickIntake_contactEmail_idx" ON "QuickIntake"("contactEmail");

-- CreateIndex
CREATE INDEX "QuickIntake_status_idx" ON "QuickIntake"("status");

-- CreateIndex
CREATE INDEX "CampaignAction_campaignId_idx" ON "CampaignAction"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAction_category_idx" ON "CampaignAction"("category");

-- CreateIndex
CREATE INDEX "CampaignExecution_actionId_idx" ON "CampaignExecution"("actionId");

-- CreateIndex
CREATE INDEX "CampaignExecution_campaignId_idx" ON "CampaignExecution"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAmplification_campaignId_idx" ON "CampaignAmplification"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTeamMember_campaignId_userId_key" ON "CampaignTeamMember"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "CampaignMilestone_campaignId_idx" ON "CampaignMilestone"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignApproval_campaignId_idx" ON "CampaignApproval"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAsset_campaignId_idx" ON "CampaignAsset"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignBrief_campaignId_idx" ON "CampaignBrief"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignReport_campaignId_idx" ON "CampaignReport"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDependency_sourceId_targetId_key" ON "CampaignDependency"("sourceId", "targetId");

-- CreateIndex
CREATE INDEX "CampaignLink_campaignId_idx" ON "CampaignLink"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLink_campaignId_linkedType_linkedId_key" ON "CampaignLink"("campaignId", "linkedType", "linkedId");

-- CreateIndex
CREATE INDEX "BudgetLine_campaignId_idx" ON "BudgetLine"("campaignId");

-- CreateIndex
CREATE INDEX "BudgetLine_category_idx" ON "BudgetLine"("category");

-- CreateIndex
CREATE INDEX "CampaignFieldOp_campaignId_idx" ON "CampaignFieldOp"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignFieldReport_fieldOpId_idx" ON "CampaignFieldReport"("fieldOpId");

-- CreateIndex
CREATE INDEX "CampaignAARRMetric_campaignId_idx" ON "CampaignAARRMetric"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAARRMetric_stage_idx" ON "CampaignAARRMetric"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "Framework_slug_key" ON "Framework"("slug");

-- CreateIndex
CREATE INDEX "FrameworkExecution_resultId_idx" ON "FrameworkExecution"("resultId");

-- CreateIndex
CREATE INDEX "FrameworkResult_frameworkId_idx" ON "FrameworkResult"("frameworkId");

-- CreateIndex
CREATE INDEX "FrameworkResult_strategyId_idx" ON "FrameworkResult"("strategyId");

-- CreateIndex
CREATE INDEX "CultIndexSnapshot_strategyId_idx" ON "CultIndexSnapshot"("strategyId");

-- CreateIndex
CREATE INDEX "CultIndexSnapshot_measuredAt_idx" ON "CultIndexSnapshot"("measuredAt");

-- CreateIndex
CREATE INDEX "SuperfanProfile_strategyId_idx" ON "SuperfanProfile"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperfanProfile_strategyId_platform_handle_key" ON "SuperfanProfile"("strategyId", "platform", "handle");

-- CreateIndex
CREATE INDEX "CommunitySnapshot_strategyId_idx" ON "CommunitySnapshot"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandVariable_strategyId_key_key" ON "BrandVariable"("strategyId", "key");

-- CreateIndex
CREATE INDEX "VariableHistory_variableId_idx" ON "VariableHistory"("variableId");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_strategyId_idx" ON "ScoreSnapshot"("strategyId");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_measuredAt_idx" ON "ScoreSnapshot"("measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_strategyId_platform_accountId_key" ON "SocialConnection"("strategyId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "SocialPost_strategyId_idx" ON "SocialPost"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_connectionId_externalPostId_key" ON "SocialPost"("connectionId", "externalPostId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPlatformConnection_strategyId_platform_accountId_key" ON "MediaPlatformConnection"("strategyId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "MediaPerformanceSync_connectionId_idx" ON "MediaPerformanceSync"("connectionId");

-- CreateIndex
CREATE INDEX "PressRelease_strategyId_idx" ON "PressRelease"("strategyId");

-- CreateIndex
CREATE INDEX "PressClipping_strategyId_idx" ON "PressClipping"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaContact_email_outlet_key" ON "MediaContact"("email", "outlet");

-- CreateIndex
CREATE INDEX "Contract_strategyId_idx" ON "Contract"("strategyId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Escrow_contractId_idx" ON "Escrow"("contractId");

-- CreateIndex
CREATE INDEX "EscrowCondition_escrowId_idx" ON "EscrowCondition"("escrowId");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntakePayment_reference_key" ON "IntakePayment"("reference");

-- CreateIndex
CREATE INDEX "IntakePayment_intakeToken_idx" ON "IntakePayment"("intakeToken");

-- CreateIndex
CREATE INDEX "IntakePayment_status_idx" ON "IntakePayment"("status");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_strategyId_idx" ON "Deal"("strategyId");

-- CreateIndex
CREATE INDEX "FunnelMapping_dealId_idx" ON "FunnelMapping"("dealId");

-- CreateIndex
CREATE INDEX "MarketStudy_strategyId_idx" ON "MarketStudy"("strategyId");

-- CreateIndex
CREATE INDEX "MarketSource_studyId_idx" ON "MarketSource"("studyId");

-- CreateIndex
CREATE INDEX "MarketSynthesis_studyId_idx" ON "MarketSynthesis"("studyId");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_sector_idx" ON "CompetitorSnapshot"("sector");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_market_idx" ON "CompetitorSnapshot"("market");

-- CreateIndex
CREATE INDEX "InsightReport_strategyId_idx" ON "InsightReport"("strategyId");

-- CreateIndex
CREATE INDEX "InsightReport_reportType_idx" ON "InsightReport"("reportType");

-- CreateIndex
CREATE INDEX "AttributionEvent_strategyId_idx" ON "AttributionEvent"("strategyId");

-- CreateIndex
CREATE INDEX "AttributionEvent_eventType_idx" ON "AttributionEvent"("eventType");

-- CreateIndex
CREATE INDEX "CohortSnapshot_strategyId_idx" ON "CohortSnapshot"("strategyId");

-- CreateIndex
CREATE INDEX "CohortSnapshot_cohortKey_idx" ON "CohortSnapshot"("cohortKey");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorProgram_strategyId_key" ON "AmbassadorProgram"("strategyId");

-- CreateIndex
CREATE INDEX "AmbassadorMember_programId_idx" ON "AmbassadorMember"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_courseId_userId_key" ON "Enrollment"("courseId", "userId");

-- CreateIndex
CREATE INDEX "TalentCertification_talentProfileId_idx" ON "TalentCertification"("talentProfileId");

-- CreateIndex
CREATE INDEX "TalentReview_talentProfileId_idx" ON "TalentReview"("talentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_userId_clubType_key" ON "ClubMember"("userId", "clubType");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorialArticle_slug_key" ON "EditorialArticle"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AICostLog_createdAt_idx" ON "AICostLog"("createdAt");

-- CreateIndex
CREATE INDEX "AICostLog_context_idx" ON "AICostLog"("context");

-- CreateIndex
CREATE UNIQUE INDEX "McpApiKey_keyHash_key" ON "McpApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "BrandOSConfig_strategyId_key" ON "BrandOSConfig"("strategyId");

-- CreateIndex
CREATE INDEX "InterventionRequest_strategyId_idx" ON "InterventionRequest"("strategyId");

-- CreateIndex
CREATE INDEX "InterventionRequest_status_idx" ON "InterventionRequest"("status");

-- CreateIndex
CREATE INDEX "CRMNote_dealId_idx" ON "CRMNote"("dealId");

-- CreateIndex
CREATE INDEX "CRMActivity_dealId_idx" ON "CRMActivity"("dealId");

-- CreateIndex
CREATE INDEX "BoutiqueOrder_userId_idx" ON "BoutiqueOrder"("userId");

-- CreateIndex
CREATE INDEX "EditorialComment_articleId_idx" ON "EditorialComment"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "McpServerConfig_serverName_key" ON "McpServerConfig"("serverName");

-- CreateIndex
CREATE INDEX "GuildOrganizationMetric_guildOrganizationId_idx" ON "GuildOrganizationMetric"("guildOrganizationId");

-- CreateIndex
CREATE INDEX "GuildOrganizationMetric_period_idx" ON "GuildOrganizationMetric"("period");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "FileUpload_entityType_entityId_idx" ON "FileUpload"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FileUpload_uploaderId_idx" ON "FileUpload"("uploaderId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeDefinition_slug_key" ON "BadgeDefinition"("slug");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "MestorThread_userId_idx" ON "MestorThread"("userId");

-- CreateIndex
CREATE INDEX "MestorThread_strategyId_idx" ON "MestorThread"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "VariableStoreConfig_strategyId_key" ON "VariableStoreConfig"("strategyId");

-- CreateIndex
CREATE INDEX "OrchestrationPlan_strategyId_idx" ON "OrchestrationPlan"("strategyId");

-- CreateIndex
CREATE INDEX "OrchestrationPlan_status_idx" ON "OrchestrationPlan"("status");

-- CreateIndex
CREATE INDEX "OrchestrationStep_planId_idx" ON "OrchestrationStep"("planId");

-- CreateIndex
CREATE INDEX "OrchestrationStep_status_idx" ON "OrchestrationStep"("status");

-- CreateIndex
CREATE INDEX "Recommendation_strategyId_targetPillarKey_status_idx" ON "Recommendation"("strategyId", "targetPillarKey", "status");

-- CreateIndex
CREATE INDEX "Recommendation_strategyId_status_idx" ON "Recommendation"("strategyId", "status");

-- CreateIndex
CREATE INDEX "Recommendation_batchId_idx" ON "Recommendation"("batchId");

-- CreateIndex
CREATE INDEX "Recommendation_strategyId_publishedAt_idx" ON "Recommendation"("strategyId", "publishedAt");

-- CreateIndex
CREATE INDEX "Recommendation_strategyId_missionType_status_idx" ON "Recommendation"("strategyId", "missionType", "status");

-- CreateIndex
CREATE INDEX "RecommendationBatch_strategyId_missionType_idx" ON "RecommendationBatch"("strategyId", "missionType");

-- CreateIndex
CREATE INDEX "JehutyCuration_strategyId_action_idx" ON "JehutyCuration"("strategyId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "JehutyCuration_strategyId_itemType_itemId_key" ON "JehutyCuration"("strategyId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "PromptVersion_toolSlug_isActive_idx" ON "PromptVersion"("toolSlug", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_toolSlug_version_key" ON "PromptVersion"("toolSlug", "version");

-- CreateIndex
CREATE INDEX "ExternalConnector_status_idx" ON "ExternalConnector"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalConnector_operatorId_connectorType_key" ON "ExternalConnector"("operatorId", "connectorType");

-- CreateIndex
CREATE INDEX "IntentEmission_strategyId_emittedAt_idx" ON "IntentEmission"("strategyId", "emittedAt");

-- CreateIndex
CREATE INDEX "IntentEmission_strategyId_status_idx" ON "IntentEmission"("strategyId", "status");

-- CreateIndex
CREATE INDEX "IntentEmission_intentKind_status_idx" ON "IntentEmission"("intentKind", "status");

-- CreateIndex
CREATE INDEX "IntentEmission_intentKind_emittedAt_idx" ON "IntentEmission"("intentKind", "emittedAt");

-- CreateIndex
CREATE INDEX "IntentEmission_caller_idx" ON "IntentEmission"("caller");

-- CreateIndex
CREATE INDEX "IntentEmission_spawnedFrom_idx" ON "IntentEmission"("spawnedFrom");

-- CreateIndex
CREATE INDEX "IntentEmissionEvent_intentId_emittedAt_idx" ON "IntentEmissionEvent"("intentId", "emittedAt");

-- CreateIndex
CREATE INDEX "IntentEmissionEvent_phase_emittedAt_idx" ON "IntentEmissionEvent"("phase", "emittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntentQueue_intentId_key" ON "IntentQueue"("intentId");

-- CreateIndex
CREATE INDEX "IntentQueue_status_notBefore_idx" ON "IntentQueue"("status", "notBefore");

-- CreateIndex
CREATE INDEX "IntentQueue_kind_enqueuedAt_idx" ON "IntentQueue"("kind", "enqueuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE INDEX "Country_region_idx" ON "Country"("region");

-- CreateIndex
CREATE INDEX "Country_currencyCode_idx" ON "Country"("currencyCode");

-- CreateIndex
CREATE INDEX "OracleSnapshot_strategyId_takenAt_idx" ON "OracleSnapshot"("strategyId", "takenAt");

-- CreateIndex
CREATE INDEX "IntegrationConnection_operatorId_provider_idx" ON "IntegrationConnection"("operatorId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_operatorId_provider_externalUserId_key" ON "IntegrationConnection"("operatorId", "provider", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MfaSecret_userId_key" ON "MfaSecret"("userId");

-- CreateIndex
CREATE INDEX "MarketBenchmark_country_sector_metric_idx" ON "MarketBenchmark"("country", "sector", "metric");

-- CreateIndex
CREATE INDEX "MarketBenchmark_metric_idx" ON "MarketBenchmark"("metric");

-- CreateIndex
CREATE INDEX "MarketSizing_country_sector_idx" ON "MarketSizing"("country", "sector");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSizing_country_sector_segment_year_key" ON "MarketSizing"("country", "sector", "segment", "year");

-- CreateIndex
CREATE INDEX "CostStructure_sector_line_idx" ON "CostStructure"("sector", "line");

-- CreateIndex
CREATE INDEX "CompetitiveLandscape_country_sector_idx" ON "CompetitiveLandscape"("country", "sector");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveLandscape_country_sector_segment_year_key" ON "CompetitiveLandscape"("country", "sector", "segment", "year");

-- CreateIndex
CREATE INDEX "MarketDocument_country_sector_idx" ON "MarketDocument"("country", "sector");

-- CreateIndex
CREATE INDEX "BrandContextNode_strategyId_kind_idx" ON "BrandContextNode"("strategyId", "kind");

-- CreateIndex
CREATE INDEX "BrandContextNode_strategyId_pillarKey_idx" ON "BrandContextNode"("strategyId", "pillarKey");

-- CreateIndex
CREATE INDEX "BrandContextNode_sourceId_idx" ON "BrandContextNode"("sourceId");

-- CreateIndex
CREATE INDEX "BrandContextNode_embeddedAt_idx" ON "BrandContextNode"("embeddedAt");

-- CreateIndex
CREATE INDEX "BrandContextNode_embeddingModel_idx" ON "BrandContextNode"("embeddingModel");

-- CreateIndex
CREATE INDEX "MarketContextNode_kind_idx" ON "MarketContextNode"("kind");

-- CreateIndex
CREATE INDEX "MarketContextNode_embeddedAt_idx" ON "MarketContextNode"("embeddedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketContextNode_kind_refId_key" ON "MarketContextNode"("kind", "refId");

-- CreateIndex
CREATE INDEX "BrandAction_strategyId_status_idx" ON "BrandAction"("strategyId", "status");

-- CreateIndex
CREATE INDEX "BrandAction_strategyId_selected_idx" ON "BrandAction"("strategyId", "selected");

-- CreateIndex
CREATE INDEX "BrandAction_touchpoint_aarrrIntent_idx" ON "BrandAction"("touchpoint", "aarrrIntent");

-- CreateIndex
CREATE INDEX "BrandAction_recoId_idx" ON "BrandAction"("recoId");

-- CreateIndex
CREATE UNIQUE INDEX "CostDecision_intentEmissionId_key" ON "CostDecision"("intentEmissionId");

-- CreateIndex
CREATE INDEX "CostDecision_operatorId_decidedAt_idx" ON "CostDecision"("operatorId", "decidedAt");

-- CreateIndex
CREATE INDEX "CostDecision_decision_idx" ON "CostDecision"("decision");

-- CreateIndex
CREATE INDEX "CostDecision_strategyId_idx" ON "CostDecision"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_slug_key" ON "Sector"("slug");

-- CreateIndex
CREATE INDEX "StrategyDoc_strategyId_idx" ON "StrategyDoc"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyDoc_strategyId_docKind_docKey_key" ON "StrategyDoc"("strategyId", "docKind", "docKey");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAllocation" ADD CONSTRAINT "ClientAllocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAllocation" ADD CONSTRAINT "ClientAllocation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDeliverable" ADD CONSTRAINT "MissionDeliverable_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_guildOrganizationId_fkey" FOREIGN KEY ("guildOrganizationId") REFERENCES "GuildOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceExecution" ADD CONSTRAINT "SequenceExecution_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GloryOutput" ADD CONSTRAINT "GloryOutput_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GloryOutput" ADD CONSTRAINT "GloryOutput_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "SequenceExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_sourceExecutionId_fkey" FOREIGN KEY ("sourceExecutionId") REFERENCES "SequenceExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pillar" ADD CONSTRAINT "Pillar_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PillarVersion" ADD CONSTRAINT "PillarVersion_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDataSource" ADD CONSTRAINT "BrandDataSource_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverGloryTool" ADD CONSTRAINT "DriverGloryTool_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "MissionDeliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "TalentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevotionSnapshot" ADD CONSTRAINT "DevotionSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableTracking" ADD CONSTRAINT "DeliverableTracking_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "MissionDeliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAction" ADD CONSTRAINT "CampaignAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignExecution" ADD CONSTRAINT "CampaignExecution_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "CampaignAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignExecution" ADD CONSTRAINT "CampaignExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAmplification" ADD CONSTRAINT "CampaignAmplification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTeamMember" ADD CONSTRAINT "CampaignTeamMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTeamMember" ADD CONSTRAINT "CampaignTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMilestone" ADD CONSTRAINT "CampaignMilestone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAsset" ADD CONSTRAINT "CampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBrief" ADD CONSTRAINT "CampaignBrief_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReport" ADD CONSTRAINT "CampaignReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDependency" ADD CONSTRAINT "CampaignDependency_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDependency" ADD CONSTRAINT "CampaignDependency_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLink" ADD CONSTRAINT "CampaignLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFieldOp" ADD CONSTRAINT "CampaignFieldOp_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFieldReport" ADD CONSTRAINT "CampaignFieldReport_fieldOpId_fkey" FOREIGN KEY ("fieldOpId") REFERENCES "CampaignFieldOp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFieldReport" ADD CONSTRAINT "CampaignFieldReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAARRMetric" ADD CONSTRAINT "CampaignAARRMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkExecution" ADD CONSTRAINT "FrameworkExecution_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "FrameworkResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkResult" ADD CONSTRAINT "FrameworkResult_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkResult" ADD CONSTRAINT "FrameworkResult_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultIndexSnapshot" ADD CONSTRAINT "CultIndexSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperfanProfile" ADD CONSTRAINT "SuperfanProfile_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySnapshot" ADD CONSTRAINT "CommunitySnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVariable" ADD CONSTRAINT "BrandVariable_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableHistory" ADD CONSTRAINT "VariableHistory_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "BrandVariable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPlatformConnection" ADD CONSTRAINT "MediaPlatformConnection_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPerformanceSync" ADD CONSTRAINT "MediaPerformanceSync_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MediaPlatformConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressRelease" ADD CONSTRAINT "PressRelease_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressDistribution" ADD CONSTRAINT "PressDistribution_pressReleaseId_fkey" FOREIGN KEY ("pressReleaseId") REFERENCES "PressRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressDistribution" ADD CONSTRAINT "PressDistribution_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MediaContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressClipping" ADD CONSTRAINT "PressClipping_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressClipping" ADD CONSTRAINT "PressClipping_pressReleaseId_fkey" FOREIGN KEY ("pressReleaseId") REFERENCES "PressRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowCondition" ADD CONSTRAINT "EscrowCondition_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketStudy" ADD CONSTRAINT "MarketStudy_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSource" ADD CONSTRAINT "MarketSource_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "MarketStudy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSynthesis" ADD CONSTRAINT "MarketSynthesis_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "MarketStudy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightReport" ADD CONSTRAINT "InsightReport_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEvent" ADD CONSTRAINT "AttributionEvent_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortSnapshot" ADD CONSTRAINT "CohortSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorProgram" ADD CONSTRAINT "AmbassadorProgram_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorMember" ADD CONSTRAINT "AmbassadorMember_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AmbassadorProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCertification" ADD CONSTRAINT "TalentCertification_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentReview" ADD CONSTRAINT "TalentReview_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "BadgeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationPlan" ADD CONSTRAINT "OrchestrationPlan_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "OrchestrationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RecommendationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationBatch" ADD CONSTRAINT "RecommendationBatch_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JehutyCuration" ADD CONSTRAINT "JehutyCuration_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalConnector" ADD CONSTRAINT "ExternalConnector_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentEmissionEvent" ADD CONSTRAINT "IntentEmissionEvent_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "IntentEmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

