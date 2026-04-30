/**
 * Back-fill Strategy.manipulationMix pour les strategies pré-Phase 9
 * dont le mix est `null`. Heuristique sectorielle simple, garde-fou
 * "uniform" si secteur inconnu.
 *
 * Phase 9-suite résidu (NEFER). Idempotent : skip les rows déjà remplies.
 *
 * Run : `npx tsx scripts/backfill-manipulation-mix.ts [--dry-run]`
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


interface ManipulationMix {
  peddler: number;
  dealer: number;
  facilitator: number;
  entertainer: number;
}

/**
 * Heuristique sectorielle (cf. MANIPULATION-MATRIX.md §6).
 * Mix initial qui sera ajusté en cascade pillar S puis locké.
 */
const SECTOR_PROFILES: Record<string, ManipulationMix> = {
  // FMCG / mass consumer — peddler-heavy + entertainer
  fmcg: { peddler: 0.40, dealer: 0.10, facilitator: 0.20, entertainer: 0.30 },
  beverage: { peddler: 0.35, dealer: 0.10, facilitator: 0.20, entertainer: 0.35 },
  food: { peddler: 0.40, dealer: 0.10, facilitator: 0.20, entertainer: 0.30 },
  // Banking / fintech / B2B — dealer-heavy + facilitator
  banking: { peddler: 0.10, dealer: 0.40, facilitator: 0.40, entertainer: 0.10 },
  fintech: { peddler: 0.10, dealer: 0.40, facilitator: 0.40, entertainer: 0.10 },
  insurance: { peddler: 0.05, dealer: 0.45, facilitator: 0.45, entertainer: 0.05 },
  b2b: { peddler: 0.10, dealer: 0.40, facilitator: 0.40, entertainer: 0.10 },
  // Tech / SaaS — facilitator-heavy + dealer
  tech: { peddler: 0.10, dealer: 0.30, facilitator: 0.45, entertainer: 0.15 },
  saas: { peddler: 0.10, dealer: 0.30, facilitator: 0.45, entertainer: 0.15 },
  software: { peddler: 0.10, dealer: 0.30, facilitator: 0.45, entertainer: 0.15 },
  // Retail / e-commerce — peddler + dealer
  retail: { peddler: 0.35, dealer: 0.30, facilitator: 0.20, entertainer: 0.15 },
  ecommerce: { peddler: 0.35, dealer: 0.30, facilitator: 0.20, entertainer: 0.15 },
  // Entertainment / media — entertainer-heavy
  media: { peddler: 0.15, dealer: 0.10, facilitator: 0.20, entertainer: 0.55 },
  entertainment: { peddler: 0.10, dealer: 0.05, facilitator: 0.20, entertainer: 0.65 },
  music: { peddler: 0.10, dealer: 0.05, facilitator: 0.20, entertainer: 0.65 },
  gaming: { peddler: 0.15, dealer: 0.10, facilitator: 0.20, entertainer: 0.55 },
  // Education / health — facilitator-heavy
  education: { peddler: 0.05, dealer: 0.20, facilitator: 0.60, entertainer: 0.15 },
  health: { peddler: 0.05, dealer: 0.30, facilitator: 0.55, entertainer: 0.10 },
  // Fashion / luxury — entertainer + dealer
  fashion: { peddler: 0.15, dealer: 0.25, facilitator: 0.20, entertainer: 0.40 },
  luxury: { peddler: 0.10, dealer: 0.30, facilitator: 0.20, entertainer: 0.40 },
  beauty: { peddler: 0.20, dealer: 0.20, facilitator: 0.20, entertainer: 0.40 },
};

const UNIFORM: ManipulationMix = { peddler: 0.25, dealer: 0.25, facilitator: 0.25, entertainer: 0.25 };

function pickMix(sector: string | null): ManipulationMix {
  if (!sector) return UNIFORM;
  const key = sector.toLowerCase().trim();
  if (SECTOR_PROFILES[key]) return SECTOR_PROFILES[key]!;
  // Fuzzy : try prefix matches
  for (const [k, v] of Object.entries(SECTOR_PROFILES)) {
    if (key.includes(k)) return v;
  }
  return UNIFORM;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = makeClient();
  try {
    const strategies = await db.strategy.findMany({
      where: { manipulationMix: { equals: null } },
      select: {
        id: true,
        name: true,
        client: { select: { sector: true, name: true } },
      },
    });

    console.log(`[backfill-manipulation-mix] ${strategies.length} strategies sans mix`);

    let updated = 0;
    let uniformFallback = 0;
    for (const s of strategies) {
      const sector = s.client?.sector ?? null;
      const mix = pickMix(sector);
      const isUniform = mix === UNIFORM;
      if (isUniform) uniformFallback++;
      console.log(`  ${s.id} (${s.name}) ← sector="${sector ?? "?"}" → ${JSON.stringify(mix)}${isUniform ? " (uniform fallback)" : ""}`);
      if (!dryRun) {
        await db.strategy.update({
          where: { id: s.id },
          data: { manipulationMix: mix },
        });
        updated++;
      }
    }

    console.log(`[backfill-manipulation-mix] ${dryRun ? "[dry-run]" : "[applied]"} updated=${updated} uniform-fallback=${uniformFallback}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
