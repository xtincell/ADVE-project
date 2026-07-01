#!/usr/bin/env tsx
import { db } from "../src/lib/db";
async function main() {
  const sid = "cmntfdyox00fj01coe4pvifwd";
  const dRecos = await db.recommendation.findMany({
    where: { strategyId: sid, targetPillarKey: "d" },
    select: { id: true, status: true, source: true, targetField: true, operation: true, missionType: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`D recos (${dRecos.length}):`);
  for (const r of dRecos) console.log(`  ${r.status} | ${r.operation} ${r.targetField} | source=${r.source} | mission=${r.missionType}`);

  // Also check: what batch generated ADVE recos? Did D error?
  const adveBatches = await db.recommendationBatch.findMany({
    where: { strategyId: sid, missionType: "ADVE_UPDATE" },
    select: { id: true, targetPillars: true, totalRecos: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\nADVE_UPDATE batches (${adveBatches.length}):`);
  for (const b of adveBatches) console.log(`  ${b.id} | targets=${JSON.stringify(b.targetPillars)} | total=${b.totalRecos} | ${b.createdAt.toISOString()}`);

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
