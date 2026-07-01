import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });
const STRATEGY_ID = "cmo7cezu10004abjoxu205mnj";

async function main() {
  const targets = [
    { sectionId: "mckinsey-7s", sequenceKey: "MCK-7S", contentField: "mckinsey7s", brandAssetKind: "MCK_7S" },
    { sectionId: "bain-nps", sequenceKey: "BAIN-NPS", contentField: "bainNps", brandAssetKind: "BAIN_NPS" },
    { sectionId: "mckinsey-3-horizons", sequenceKey: "MCK-3H", contentField: "mckinsey3Horizons", brandAssetKind: "MCK_3H" },
    { sectionId: "manipulation-matrix", sequenceKey: "MANIP-MATRIX", contentField: "manipulationMatrix", brandAssetKind: "MANIPULATION_MATRIX" },
  ];

  const { executeSequence } = await import("../src/server/services/artemis/tools/sequence-executor");

  for (const t of targets) {
    console.log(`\n=== ${t.sectionId} ===`);
    try {
      const result = await executeSequence(t.sequenceKey as never, STRATEGY_ID, { _oracleEnrichmentMode: true });
      const successSteps = result.steps.filter(s => s.status === "SUCCESS").length;
      console.log(`steps: ${successSteps}/${result.steps.length}, status: ${result.status}`);

      // Find the BrandAsset and check if content was updated naturally by the sequence
      const ba = await db.brandAsset.findFirst({
        where: {
          strategyId: STRATEGY_ID,
          metadata: { path: ["sectionId"], equals: t.sectionId },
          state: "ACTIVE",
        },
      });
      if (!ba) { console.log("  no BrandAsset"); continue; }
      const cur = (ba.content as Record<string, unknown>) ?? {};
      const inner = cur[t.contentField] as Record<string, unknown> | undefined;
      const innerJson = JSON.stringify(inner ?? {});
      console.log(`  content[${t.contentField}] size: ${innerJson.length} bytes`);
      if (innerJson.length < 50) {
        console.log(`  → still empty (${innerJson}). LLM probably unavailable.`);
      } else {
        console.log(`  → enriched`);
      }
    } catch (err) {
      console.warn(`  FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
