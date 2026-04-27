/**
 * Backfill script: Set tenantId = operatorId for all tenant-scoped models.
 *
 * Usage: npx tsx scripts/backfill-tenant-id.ts
 *
 * This backfills the v4 tenantId column from existing operatorId relationships.
 * Idempotent: only updates records where tenantId is NULL.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling tenantId from operatorId relationships...\n");

  // Strategy — direct operatorId
  const strategies = await prisma.$executeRaw`
    UPDATE "Strategy"
    SET "tenantId" = "operatorId"
    WHERE "tenantId" IS NULL AND "operatorId" IS NOT NULL
  `;
  console.log(`Strategy: ${strategies} rows updated`);

  // Campaign — via strategy.operatorId
  const campaigns = await prisma.$executeRaw`
    UPDATE "Campaign" c
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE c."strategyId" = s.id
    AND c."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`Campaign: ${campaigns} rows updated`);

  // Mission — via strategy.operatorId
  const missions = await prisma.$executeRaw`
    UPDATE "Mission" m
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE m."strategyId" = s.id
    AND m."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`Mission: ${missions} rows updated`);

  // Signal — via strategy.operatorId
  const signals = await prisma.$executeRaw`
    UPDATE "Signal" sig
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE sig."strategyId" = s.id
    AND sig."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`Signal: ${signals} rows updated`);

  // Driver — via strategy.operatorId
  const drivers = await prisma.$executeRaw`
    UPDATE "Driver" d
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE d."strategyId" = s.id
    AND d."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`Driver: ${drivers} rows updated`);

  // Pillar — via strategy.operatorId
  const pillars = await prisma.$executeRaw`
    UPDATE "Pillar" p
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE p."strategyId" = s.id
    AND p."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`Pillar: ${pillars} rows updated`);

  // GloryOutput — via strategy.operatorId
  const gloryOutputs = await prisma.$executeRaw`
    UPDATE "GloryOutput" g
    SET "tenantId" = s."operatorId"
    FROM "Strategy" s
    WHERE g."strategyId" = s.id
    AND g."tenantId" IS NULL
    AND s."operatorId" IS NOT NULL
  `;
  console.log(`GloryOutput: ${gloryOutputs} rows updated`);

  // KnowledgeEntry — no direct strategy link, set to NULL for now
  // These are shared knowledge — tenantId may remain NULL for sector-level entries
  console.log(`KnowledgeEntry: skipped (shared knowledge, no direct strategy link)`);

  // Audit: check for remaining NULLs
  console.log("\n--- Remaining NULL tenantId counts ---");
  const nullCounts = await Promise.all([
    prisma.strategy.count({ where: { tenantId: null, operatorId: { not: null } } }),
    prisma.campaign.count({ where: { tenantId: null } }),
    prisma.mission.count({ where: { tenantId: null } }),
    prisma.signal.count({ where: { tenantId: null } }),
    prisma.driver.count({ where: { tenantId: null } }),
    prisma.pillar.count({ where: { tenantId: null } }),
    prisma.gloryOutput.count({ where: { tenantId: null } }),
  ]);

  const models = ["Strategy", "Campaign", "Mission", "Signal", "Driver", "Pillar", "GloryOutput"];
  for (let i = 0; i < models.length; i++) {
    const count = nullCounts[i];
    const status = count === 0 ? "OK" : `${count} remaining`;
    console.log(`  ${models[i]}: ${status}`);
  }

  console.log("\nBackfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
