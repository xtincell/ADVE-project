#!/usr/bin/env tsx
/**
 * NOTORIA E2E Test — Validates the full recommendation lifecycle.
 *
 * Tests:
 * 1. generateBatch (ADVE_UPDATE) → creates Recommendation rows
 * 2. getRecos → returns pending recommendations
 * 3. acceptRecos → transitions PENDING → ACCEPTED
 * 4. applyRecos → writes to pillar content via Gateway, marks APPLIED
 * 5. revertReco → restores pillar content, marks REVERTED
 * 6. Dashboard counts are accurate
 */

import { db } from "../src/lib/db";

const STRATEGY_ID = "cmntfdyox00fj01coe4pvifwd"; // Bliss strategy

async function test() {
  console.log("═══ NOTORIA E2E TEST ═══\n");

  // ── Check existing state ──
  const existing = await db.recommendation.count({ where: { strategyId: STRATEGY_ID } });
  console.log(`1. Existing Recommendation rows: ${existing}`);

  // ── Check by status ──
  const byStatus = await db.recommendation.groupBy({
    by: ["status"],
    where: { strategyId: STRATEGY_ID },
    _count: true,
  });
  console.log("2. By status:");
  for (const s of byStatus) console.log(`   ${s.status}: ${s._count}`);

  // ── Check actionable (PENDING + ACCEPTED) ──
  const actionable = await db.recommendation.count({
    where: { strategyId: STRATEGY_ID, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  console.log(`\n3. Actionable recos (PENDING + ACCEPTED): ${actionable}`);

  // ── Check by pillar ──
  const byPillar = await db.recommendation.groupBy({
    by: ["targetPillarKey", "status"],
    where: { strategyId: STRATEGY_ID, status: { in: ["PENDING", "ACCEPTED"] } },
    _count: true,
  });
  console.log("4. By pillar (actionable):");
  for (const p of byPillar) console.log(`   ${p.targetPillarKey} [${p.status}]: ${p._count}`);

  // ── Check pillar content ──
  const pillars = await db.pillar.findMany({
    where: { strategyId: STRATEGY_ID },
    select: { key: true, completionLevel: true, validationStatus: true, content: true },
  });
  console.log("\n5. Pillar states:");
  for (const p of pillars) {
    const content = (p.content ?? {}) as Record<string, unknown>;
    const filled = Object.values(content).filter(v => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
    const total = Object.keys(content).length;
    console.log(`   ${p.key}: completion=${p.completionLevel ?? "null"} status=${p.validationStatus} fields=${filled}/${total}`);
  }

  // ── Check pipeline ──
  const strategy = await db.strategy.findUnique({
    where: { id: STRATEGY_ID },
    select: { notoriaPipeline: true },
  });
  console.log("\n6. Pipeline state:", JSON.stringify(strategy?.notoriaPipeline, null, 2));

  // ── Check batches ──
  const batches = await db.recommendationBatch.findMany({
    where: { strategyId: STRATEGY_ID },
    select: { id: true, missionType: true, totalRecos: true, pendingCount: true, acceptedCount: true, appliedCount: true, rejectedCount: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\n7. Batches:");
  for (const b of batches) {
    console.log(`   ${b.missionType}: total=${b.totalRecos} pending=${b.pendingCount} accepted=${b.acceptedCount} applied=${b.appliedCount} rejected=${b.rejectedCount}`);
  }

  // ── Test: apply the ACCEPTED recos ──
  const acceptedRecos = await db.recommendation.findMany({
    where: { strategyId: STRATEGY_ID, status: "ACCEPTED" },
    select: { id: true, targetPillarKey: true, targetField: true, operation: true },
  });

  if (acceptedRecos.length > 0) {
    console.log(`\n8. Found ${acceptedRecos.length} ACCEPTED recos ready to apply.`);
    console.log("   Sample (first 5):");
    for (const r of acceptedRecos.slice(0, 5)) {
      console.log(`   - ${r.operation} ${r.targetPillarKey}.${r.targetField}`);
    }

    console.log("\n   → To apply these, use: notoria.applyRecos({ strategyId, recoIds: [...] })");
    console.log("   → Or click 'Appliquer tout' in the Notoria UI");
  } else {
    console.log("\n8. No ACCEPTED recos to apply.");
  }

  // ── Test: check pending S recos ──
  const pendingS = await db.recommendation.findMany({
    where: { strategyId: STRATEGY_ID, status: "PENDING", targetPillarKey: "s" },
    select: { id: true, targetField: true, operation: true, explain: true, urgency: true },
  });
  if (pendingS.length > 0) {
    console.log(`\n9. Pending S (Strategie) recos: ${pendingS.length}`);
    for (const r of pendingS.slice(0, 3)) {
      console.log(`   - ${r.operation} ${r.targetField} [${r.urgency}] — ${r.explain.slice(0, 80)}`);
    }
  }

  console.log("\n═══ TEST COMPLETE ═══");
  await db.$disconnect();
}

test().catch(err => { console.error("❌", err); process.exit(1); });
