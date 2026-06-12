-- Vague 7 — traque sociale unifiée + candidatures missions.

CREATE TABLE "MissionApplication" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "talentProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "proposedRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MissionApplication_missionId_applicantId_key" ON "MissionApplication"("missionId", "applicantId");
CREATE INDEX "MissionApplication_missionId_status_idx" ON "MissionApplication"("missionId", "status");
CREATE INDEX "MissionApplication_applicantId_status_idx" ON "MissionApplication"("applicantId", "status");
ALTER TABLE "MissionApplication" ADD CONSTRAINT "MissionApplication_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MissionApplication" ADD CONSTRAINT "MissionApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FollowerSnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "followingCount" INTEGER,
    "mentionsCount" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FollowerSnapshot_strategyId_platform_capturedAt_idx" ON "FollowerSnapshot"("strategyId", "platform", "capturedAt");
CREATE INDEX "FollowerSnapshot_handle_capturedAt_idx" ON "FollowerSnapshot"("handle", "capturedAt");
