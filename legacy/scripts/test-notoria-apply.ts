#!/usr/bin/env tsx
/**
 * Test: Apply 3 ACCEPTED recos via Notoria lifecycle to verify Gateway writes.
 */

import { db } from "../src/lib/db";
import { applyRecos } from "../src/server/services/notoria/lifecycle";

const STRATEGY_ID = "cmntfdyox00fj01coe4pvifwd";

async function test() {
  console.log("═══ NOTORIA APPLY TEST ═══\n");

  // Pick 3 ACCEPTED recos (one from each pillar a, d, v)
  const sample = await db.recommendation.findMany({
    where: { strategyId: STRATEGY_ID, status: "ACCEPTED" },
    select: { id: true, targetPillarKey: true, targetField: true, operation: true },
    take: 3,
  });

  if (sample.length === 0) {
    console.log("No ACCEPTED recos to apply.");
    await db.$disconnect();
    return;
  }

  console.log("Applying sample recos:");
  for (const r of sample) {
    console.log(`  - ${r.operation} ${r.targetPillarKey}.${r.targetField} (${r.id})`);
  }

  const ids = sample.map((r) => r.id);

  try {
    const result = await applyRecos(STRATEGY_ID, ids);
    console.log(`\n✅ Result: applied=${result.applied}`);
    if (result.warnings.length > 0) {
      console.log("Warnings:");
      for (const w of result.warnings) console.log(`  ⚠️ ${w}`);
    }

    // Verify status changed
    const after = await db.recommendation.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, appliedAt: true },
    });
    console.log("\nPost-apply status:");
    for (const r of after) {
      console.log(`  ${r.id}: ${r.status} (appliedAt=${r.appliedAt?.toISOString() ?? "null"})`);
    }

    // Check completionLevel was updated
    const affectedPillars = [...new Set(sample.map((r) => r.targetPillarKey))];
    for (const pk of affectedPillars) {
      const pillar = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId: STRATEGY_ID, key: pk } },
        select: { completionLevel: true },
      });
      console.log(`  Pillar ${pk} completionLevel: ${pillar?.completionLevel ?? "null"}`);
    }

  } catch (err) {
    console.error("❌ Apply failed:", err);
  }

  console.log("\n═══ TEST COMPLETE ═══");
  await db.$disconnect();
}

test().catch(err => { console.error("❌", err); process.exit(1); });
