import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });
const STRATEGY_ID = "cmo7cezu10004abjoxu205mnj";

// Restore les 4 BrandAssets que mon précédent fill a écrasés avec un dump
// finalContext générique. Le composant React Phase 13 attend une shape
// précise (ex: data.mckinsey7s.strategy, data.mckinsey7s.structure...).
// Sans LLM dispo (circuit breaker open), on ne peut pas générer le vrai
// content. On restore une shape minimale typée + EmptyState côté rendu.

async function main() {
  const targets = [
    { sectionId: "mckinsey-7s", contentField: "mckinsey7s", placeholder: { strategy: { state: "—", gap: "Données à enrichir", recommendation: "Lance Artemis quand le LLM est disponible" } } },
    { sectionId: "bain-nps", contentField: "bainNps", placeholder: { score: null, promoters: null, drivers: [] } },
    { sectionId: "mckinsey-3-horizons", contentField: "mckinsey3Horizons", placeholder: { h1: null, h2: null, h3: null, allocation: null } },
    { sectionId: "manipulation-matrix", contentField: "manipulationMatrix", placeholder: { evaluations: [], summary: "Matrice à enrichir — relance Artemis quand le LLM est disponible" } },
  ];

  for (const t of targets) {
    const existing = await db.brandAsset.findFirst({
      where: {
        strategyId: STRATEGY_ID,
        metadata: { path: ["sectionId"], equals: t.sectionId },
        state: "ACTIVE",
      },
    });
    if (!existing) {
      console.log(`SKIP ${t.sectionId} — no ACTIVE BrandAsset`);
      continue;
    }
    await db.brandAsset.update({
      where: { id: existing.id },
      data: { content: { [t.contentField]: t.placeholder } as never },
    });
    console.log(`RESTORED ${t.sectionId}: ${existing.id} → shape minimale ${JSON.stringify(t.placeholder).length} chars`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
