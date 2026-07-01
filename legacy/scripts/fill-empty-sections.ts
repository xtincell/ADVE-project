import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const STRATEGY_ID = "cmo7cezu10004abjoxu205mnj";

// Re-tourne les 4 sequences Glory dont le BrandAsset est ACTIVE mais content vide.
// Ces sections ont passé le promote ACTIVE avec un payload {sectionField: {}}
// — la sequence Glory a mal écrit ou le LLM a produit JSON vide.
//
// Stratégie : appeler executeSequence (mode oracle), récupérer finalContext,
// merger dans BrandAsset.content (overwrite si plus riche).
async function main() {
  const targets = [
    { sectionId: "mckinsey-7s", sequenceKey: "MCK-7S", contentField: "mckinsey7s" },
    { sectionId: "bain-nps", sequenceKey: "BAIN-NPS", contentField: "bainNps" },
    { sectionId: "mckinsey-3-horizons", sequenceKey: "MCK-3H", contentField: "mckinsey3Horizons" },
    { sectionId: "manipulation-matrix", sequenceKey: "MANIP-MATRIX", contentField: "manipulationMatrix" },
  ];

  // Lazy import (sequence executor depends on app modules)
  process.env.NEXT_RUNTIME = "nodejs";
  const { executeSequence } = await import("../src/server/services/artemis/tools/sequence-executor");

  for (const t of targets) {
    console.log(`\n=== ${t.sectionId} (${t.sequenceKey}) ===`);
    try {
      const result = await executeSequence(t.sequenceKey as never, STRATEGY_ID, { _oracleEnrichmentMode: true });
      const ctx = result.finalContext as Record<string, unknown>;
      const stepsOk = result.steps.filter(s => s.status === "SUCCESS").length;
      console.log(`steps: ${stepsOk}/${result.steps.length}, ctx keys: ${Object.keys(ctx).filter(k => !k.startsWith('_')).slice(0, 8).join(',')}`);

      // Build content payload — extract structured outputs from finalContext
      // Strip internal keys
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(ctx)) {
        if (k.startsWith("_") || k.startsWith("score_") || k.startsWith("pillar_")) continue;
        if (k.startsWith("a_") || k.startsWith("d_") || k.startsWith("v_") || k.startsWith("e_") || k.startsWith("r_") || k.startsWith("t_") || k.startsWith("i_") || k.startsWith("s_")) continue;
        if (v == null || v === "") continue;
        payload[k] = v;
      }

      const newContent = { [t.contentField]: payload };
      const existing = await db.brandAsset.findFirst({
        where: { strategyId: STRATEGY_ID, kind: { in: ["MCK_7S","BAIN_NPS","MCK_3H","MANIPULATION_MATRIX"] }, metadata: { path: ["sectionId"], equals: t.sectionId } },
      });
      if (!existing) { console.log("  no BrandAsset found, skip"); continue; }
      await db.brandAsset.update({
        where: { id: existing.id },
        data: { content: newContent as never, state: "ACTIVE" },
      });
      console.log(`  → updated ${existing.id}, payload keys: ${Object.keys(payload).slice(0, 8).join(',')} (${JSON.stringify(payload).length} chars)`);
    } catch (err) {
      console.warn(`  FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
