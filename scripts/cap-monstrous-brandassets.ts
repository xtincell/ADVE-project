import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const STRATEGY_ID = "cmo7cezu10004abjoxu205mnj";
const MAX_CONTENT_BYTES = 200_000; // 200 KB cap par BrandAsset

// Truncate les BrandAssets dont le content JSON dépasse 200KB.
// Cause racine : Glory tools précédents (devotion-ladder, deloitte-budget,
// bcg-strategy-palette) ont produit des outputs massifs sans cap. Le SSR
// Oracle gonfle à 237MB → redirect browser preview.
//
// Stratégie : pour chaque BrandAsset > MAX, conserver les top-level keys
// non-objet + tronquer les values complexes en stub `{ _truncated: true,
// reason: "..." }`. Préserve la structure pour les composants React.

async function main() {
  const all = await db.brandAsset.findMany({
    where: { strategyId: STRATEGY_ID, state: "ACTIVE" },
    select: { id: true, kind: true, content: true, metadata: true },
  });

  for (const a of all) {
    const json = JSON.stringify(a.content);
    if (json.length <= MAX_CONTENT_BYTES) continue;

    const md = (a.metadata ?? {}) as Record<string, unknown>;
    const sectionId = md.sectionId as string | undefined;
    console.log(`TRUNCATING ${a.id} kind=${a.kind} sectionId=${sectionId ?? "(none)"} : ${json.length} bytes`);

    // Keep top-level scalar/short fields; truncate large nested
    const original = (a.content as Record<string, unknown>) ?? {};
    const truncated: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(original)) {
      const vJson = JSON.stringify(v);
      if (vJson.length < 5000) {
        truncated[k] = v;
      } else if (Array.isArray(v)) {
        truncated[k] = v.slice(0, 5);
      } else if (typeof v === "object" && v !== null) {
        // Keep first 5 keys, truncate rest
        const first5 = Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 5));
        truncated[k] = { ...first5, _truncatedAt: new Date().toISOString(), _originalKeys: Object.keys(v as Record<string, unknown>).length };
      } else {
        truncated[k] = String(v).slice(0, 1000);
      }
    }
    truncated._capped = { reason: "size>200KB", originalBytes: json.length, cappedAt: new Date().toISOString() };

    await db.brandAsset.update({
      where: { id: a.id },
      data: { content: truncated as never },
    });
    console.log(`  → updated, new size: ${JSON.stringify(truncated).length} bytes`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
