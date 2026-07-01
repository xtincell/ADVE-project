/*
  Warnings:

  - The `clientState` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `creativeState` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CreativeProductionStatus" AS ENUM ('BRIEF_RECU', 'BRIEF_QUALIFIE', 'EN_PRODUCTION', 'BLOQUE', 'LIVRE');

-- CreateEnum
CREATE TYPE "ClientReviewStatus" AS ENUM ('PENDING', 'BRAINSTORMING', 'EN_ATTENTE_FEEDBACK', 'RETOUR_RECU', 'TOOL_KIT_A_EXECUTER', 'EN_ATTENTE_PACKAGING', 'VALIDE', 'REJETE');

-- CreateEnum
CREATE TYPE "OperationalPriority" AS ENUM ('CRITIQUE', 'HAUTE', 'MOYENNE', 'BASSE');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "isCritical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" "OperationalPriority" NOT NULL DEFAULT 'MOYENNE',
DROP COLUMN "clientState",
ADD COLUMN     "clientState" "ClientReviewStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "creativeState",
ADD COLUMN     "creativeState" "CreativeProductionStatus" NOT NULL DEFAULT 'BRIEF_RECU';

-- CreateIndex
CREATE INDEX "Campaign_creativeState_idx" ON "Campaign"("creativeState");

-- CreateIndex
CREATE INDEX "Campaign_clientState_idx" ON "Campaign"("clientState");

-- CreateIndex
CREATE INDEX "Campaign_isCritical_idx" ON "Campaign"("isCritical");

-- CreateIndex
CREATE INDEX "Campaign_priority_idx" ON "Campaign"("priority");
