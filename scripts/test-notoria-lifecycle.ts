#!/usr/bin/env tsx
/**
 * NOTORIA Lifecycle Headless Test (HANDOFF #2.4)
 *
 * Exercises pendingRecos → accept → apply → pillar update on the
 * Wakanda demo dataset (vibranium has 15 PENDING by design).
 *
 * Run:  npx tsx scripts/test-notoria-lifecycle.ts
 */

import { db } from "../src/lib/db";
import { acceptRecos, applyRecos } from "../src/server/services/notoria/lifecycle";

const REVIEWER_ID = "wk-user-mestor"; // Wakanda admin from seed

async function main() {
  console.log("═══ NOTORIA LIFECYCLE TEST (Wakanda demo) ═══\n");

  // ── 1. Inventory: find a demo strategy with PENDING recos ──
  const demoStrategyIds = (await db.strategy.findMany({
    where: { isDummy: true },
    select: { id: true },
  })).map((s) => s.id);
  const candidates = await db.recommendation.groupBy({
    by: ["strategyId"],
    where: { strategyId: { in: demoStrategyIds }, status: "PENDING" },
    _count: true,
    orderBy: { _count: { strategyId: "desc" } },
  });
  if (candidates.length === 0) {
    console.error("❌ No demo strategy has PENDING recos. Did you run the Wakanda seed?");
    process.exit(1);
  }
  const target = candidates[0];
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: target.strategyId },
    select: { id: true, name: true },
  });
  console.log(`1. Target: ${strategy.name} (${strategy.id}) — ${target._count} PENDING\n`);

  // ── 2. Pick 3 PENDING recos to push through the lifecycle ──
  const sample = await db.recommendation.findMany({
    where: { strategyId: strategy.id, status: "PENDING" },
    select: { id: true, targetPillarKey: true, targetField: true, operation: true },
    take: 3,
  });
  console.log("2. Sample PENDING (3):");
  for (const r of sample) console.log(`   - ${r.id}  ${r.operation} ${r.targetPillarKey}.${r.targetField}`);
  const recoIds = sample.map((r) => r.id);

  // ── 3. acceptRecos ──
  const accepted = await acceptRecos(strategy.id, recoIds, REVIEWER_ID);
  console.log(`\n3. acceptRecos: ${accepted.accepted}/${recoIds.length}`);
  if (accepted.accepted !== recoIds.length) {
    console.error("❌ acceptRecos failed");
    process.exit(1);
  }
  const stillPending = await db.recommendation.count({
    where: { id: { in: recoIds }, status: "PENDING" },
  });
  const nowAccepted = await db.recommendation.count({
    where: { id: { in: recoIds }, status: "ACCEPTED" },
  });
  console.log(`   PENDING→ACCEPTED transition: pending=${stillPending}, accepted=${nowAccepted}`);

  // ── 4. Capture pillar content BEFORE apply ──
  const pillarKeys = [...new Set(sample.map((r) => r.targetPillarKey))];
  const before = await db.pillar.findMany({
    where: { strategyId: strategy.id, key: { in: pillarKeys } },
    select: { key: true, content: true, completionLevel: true },
  });

  // ── 5. applyRecos ──
  const applied = await applyRecos(strategy.id, recoIds);
  console.log(`\n5. applyRecos: applied=${applied.applied}, warnings=${applied.warnings.length}`);
  if (applied.warnings.length > 0) {
    for (const w of applied.warnings) console.log(`   ⚠ ${w}`);
  }

  // ── 6. Verify status transition + pillar content delta ──
  const finalStatus = await db.recommendation.groupBy({
    by: ["status"],
    where: { id: { in: recoIds } },
    _count: true,
  });
  console.log("\n6. Final reco status:");
  for (const s of finalStatus) console.log(`   ${s.status}: ${s._count}`);

  const after = await db.pillar.findMany({
    where: { strategyId: strategy.id, key: { in: pillarKeys } },
    select: { key: true, content: true, completionLevel: true },
  });
  console.log("\n7. Pillar content delta:");
  for (const a of after) {
    const b = before.find((x) => x.key === a.key);
    const beforeJson = JSON.stringify(b?.content ?? {});
    const afterJson = JSON.stringify(a.content ?? {});
    const changed = beforeJson !== afterJson;
    console.log(
      `   ${a.key}: completion ${b?.completionLevel ?? "?"} → ${a.completionLevel ?? "?"}, content ${changed ? "CHANGED" : "unchanged"}`,
    );
  }

  // ── 7. Acceptance criteria ──
  const allApplied = finalStatus.every((s) => s.status === "APPLIED");
  if (!allApplied) {
    console.error("\n❌ Some recos are not APPLIED — flow incomplete.");
    process.exit(1);
  }
  console.log("\n═══ ✅ LIFECYCLE PASS ═══");
  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
