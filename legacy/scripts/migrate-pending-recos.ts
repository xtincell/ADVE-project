#!/usr/bin/env tsx
/**
 * NOTORIA MIGRATION — Convert Pillar.pendingRecos JSON arrays to Recommendation entities.
 *
 * For each pillar with non-null pendingRecos:
 *   1. Creates a RecommendationBatch (missionType=ADVE_UPDATE, agent=MESTOR)
 *   2. Creates a Recommendation row per reco with:
 *      - Mapped fields from FieldRecommendation
 *      - Defaults for new Notoria fields (urgency=SOON, advantages=[], etc.)
 *      - status = APPLIED if reco.accepted===true, else PENDING
 *   3. Sets Pillar.pendingRecos = null (cleanup)
 *
 * Safe to run multiple times — skips pillars with pendingRecos=null.
 *
 * Usage: npx tsx scripts/migrate-pending-recos.ts [--dry-run]
 */

import { db } from "../src/lib/db";

interface LegacyReco {
  field: string;
  operation?: string;
  currentSummary?: string;
  proposedValue?: unknown;
  targetIndex?: number;
  targetMatch?: { key: string; value: string };
  justification?: string;
  source?: string;
  impact?: string;
  accepted?: boolean;
  validationWarning?: string;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("🔍 DRY RUN — no DB writes\n");

  const pillars = await db.pillar.findMany({
    where: { pendingRecos: { not: null } },
    select: {
      id: true,
      strategyId: true,
      key: true,
      pendingRecos: true,
    },
  });

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalBatches = 0;

  for (const pillar of pillars) {
    const arr = pillar.pendingRecos as unknown;
    if (!Array.isArray(arr) || arr.length === 0) {
      totalSkipped++;
      continue;
    }

    const recos = arr as LegacyReco[];
    console.log(`\n📦 Strategy=${pillar.strategyId} Pillar=${pillar.key} — ${recos.length} recos`);

    if (dryRun) {
      for (const r of recos) {
        console.log(`  - ${r.operation ?? "SET"} ${r.field} [${r.accepted ? "APPLIED" : "PENDING"}] impact=${r.impact ?? "MEDIUM"}`);
      }
      totalMigrated += recos.length;
      totalBatches++;
      continue;
    }

    // Create batch
    const batch = await db.recommendationBatch.create({
      data: {
        strategyId: pillar.strategyId,
        missionType: "ADVE_UPDATE",
        sourcePillars: ["R", "T"],
        targetPillars: [pillar.key.toUpperCase()],
        totalRecos: recos.length,
        pendingCount: recos.filter((r) => !r.accepted).length,
        acceptedCount: 0,
        rejectedCount: 0,
        appliedCount: recos.filter((r) => r.accepted).length,
        agent: "MESTOR",
      },
    });
    totalBatches++;

    // Create Recommendation rows
    for (const reco of recos) {
      await db.recommendation.create({
        data: {
          strategyId: pillar.strategyId,
          targetPillarKey: pillar.key,
          targetField: reco.field,
          operation: reco.operation ?? "SET",
          currentSnapshot: reco.currentSummary ?? null,
          proposedValue: reco.proposedValue ?? null,
          targetMatch: reco.targetMatch ?? null,
          agent: "MESTOR",
          source: reco.source ?? "R+T",
          confidence: 0.6,
          explain: reco.justification ?? "Migration depuis pendingRecos legacy",
          advantages: [],
          disadvantages: [],
          urgency: "SOON",
          impact: reco.impact ?? "MEDIUM",
          destructive: false,
          applyPolicy: "suggest",
          validationWarning: reco.validationWarning ?? null,
          sectionGroup: null,
          status: reco.accepted ? "APPLIED" : "PENDING",
          reviewedBy: reco.accepted ? "migration" : null,
          reviewedAt: reco.accepted ? new Date() : null,
          appliedAt: reco.accepted ? new Date() : null,
          batchId: batch.id,
          missionType: "ADVE_UPDATE",
        },
      });
      totalMigrated++;
    }

    // Cleanup: set pendingRecos to null
    await db.pillar.update({
      where: { id: pillar.id },
      data: { pendingRecos: null },
    });

    console.log(`  ✅ Migrated ${recos.length} recos → batch ${batch.id}`);
  }

  console.log(`\n═══ Migration ${dryRun ? "(DRY RUN) " : ""}complete ═══`);
  console.log(`  Batches created: ${totalBatches}`);
  console.log(`  Recos migrated:  ${totalMigrated}`);
  console.log(`  Pillars skipped: ${totalSkipped}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
