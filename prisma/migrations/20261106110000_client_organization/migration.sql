-- Additive: existing CRM records and their status, contacts and billing remain intact.
CREATE TYPE "ClientOrganizationKind" AS ENUM ('UNSPECIFIED', 'INTERNATIONAL_GROUP', 'REGIONAL_OFFICE', 'GROUP_SUBSIDIARY');
ALTER TABLE "Client"
  ADD COLUMN "organizationKind" "ClientOrganizationKind" NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN "organizationKey" TEXT,
  ADD COLUMN "organizationSourceRefs" JSONB,
  ADD COLUMN "parentClientId" TEXT,
  ADD CONSTRAINT "Client_parentClientId_fkey" FOREIGN KEY ("parentClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Client_parentClientId_not_self" CHECK ("parentClientId" IS DISTINCT FROM "id");
CREATE INDEX "Client_parentClientId_idx" ON "Client"("parentClientId");
CREATE UNIQUE INDEX "Client_operatorId_organizationKey_key" ON "Client"("operatorId","organizationKey");
