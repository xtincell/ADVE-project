/** Deployment migration: keep observed public pages without claiming approval. */
import { db } from "@/lib/db";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { freezeObservedPublicBrand } from "@/server/services/brand-vault/publication";

async function main() {
  const rows = await db.strategy.findMany({ where: { publicSlug: { not: null }, status: { notIn: ["ARCHIVED", "DELETED"] },
    brandAssets: { none: { kind: "BRAND_GUIDELINES", format: "public-brand-v1" } },
  }, select: { id: true } });
  let captured = 0;
  for (const row of rows) {
    const intentId = await openEmission({ kind: "LEGACY_STRATEGY_UPDATE", strategyId: row.id,
      caller: "migration:freeze-observed-public-page", payload: { operation: "freezeObservedPublicPage", origin: "OBSERVED_PUBLICATION" } });
    try {
      const changed = await freezeObservedPublicBrand(row.id, intentId);
      await closeEmission({ intentId, status: "OK", result: { captured: changed, humanReview: false } });
      if (changed) captured++;
    } catch (error) {
      await closeEmission({ intentId, status: "FAILED", result: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }
  console.log(JSON.stringify({ observedPublicPagesCaptured: captured, humanReview: false }));
}
main().finally(() => db.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
