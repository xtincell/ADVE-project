#!/usr/bin/env tsx
import { db } from "../src/lib/db";

async function main() {
  const total = await db.recommendation.count();
  console.log(`Total Recommendation rows: ${total}`);

  if (total > 0) {
    const byStatus = await db.recommendation.groupBy({ by: ["status", "targetPillarKey"], _count: true });
    console.log("\nBy status + pillar:");
    for (const c of byStatus) {
      console.log(`  ${c.status} | ${c.targetPillarKey} | ${c._count}`);
    }
  }

  const batches = await db.recommendationBatch.findMany({
    select: { id: true, missionType: true, totalRecos: true, pendingCount: true, appliedCount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(`\nBatches (${batches.length}):`);
  for (const b of batches) {
    console.log(`  ${b.id} | ${b.missionType} | total=${b.totalRecos} pending=${b.pendingCount} applied=${b.appliedCount} | ${b.createdAt.toISOString()}`);
  }

  // Check pipeline state
  const strategies = await db.strategy.findMany({
    where: { notoriaPipeline: { not: null } },
    select: { id: true, name: true, notoriaPipeline: true },
  });
  console.log(`\nStrategies with pipeline: ${strategies.length}`);
  for (const s of strategies) {
    console.log(`  ${s.id} (${s.name}): ${JSON.stringify(s.notoriaPipeline)}`);
  }

  await db.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
