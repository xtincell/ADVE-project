ALTER TABLE "PillarVersion" ADD COLUMN "checkpoint" JSONB, ADD COLUMN "compensatedFrom" TEXT;
CREATE UNIQUE INDEX "PillarVersion_pillarId_compensatedFrom_key" ON "PillarVersion"("pillarId", "compensatedFrom");
