-- AlterTable
ALTER TABLE "MissionActivity" ADD COLUMN     "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "MissionActivity_assigneeId_idx" ON "MissionActivity"("assigneeId");
