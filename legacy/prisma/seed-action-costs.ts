/**
 * prisma/seed-action-costs.ts — Seed Thot's atomized action-cost catalog (ADR-0093).
 *
 * Seeds:
 *   - ActionCostTemplate + ActionCostComponent (atoms) from ACTION_COST_CATALOG
 *   - ZoneIndex (cost-of-living / VAT / TJM per market) from ZONE_INDEX_SEED
 *   - EconomicNeighborMap fallback chains from NEIGHBOR_MAP_SEED
 *
 * Idempotent. Run by `npm run db:seed:action-costs` (and `db:seed:all`).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureActionCostCatalog } from "../src/server/services/financial-brain/action-costing/catalog";
import {
  ZONE_INDEX_SEED,
  NEIGHBOR_MAP_SEED,
} from "../src/server/services/financial-brain/action-costing/seed-data";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const db = makeClient();

/** Fixed seed validity start so ZoneIndex upserts stay idempotent across runs. */
const SEED_VALID_FROM = new Date("2026-01-01T00:00:00.000Z");

/**
 * Catalog seed delegates to the canonical service-layer upsert
 * (`ensureActionCostCatalog`) — single source of truth, also used by the
 * estimator's runtime auto-amorçage (ADR-0119 pattern). Idempotent.
 */
async function seedCatalog() {
  return ensureActionCostCatalog(db);
}

async function seedZoneIndices() {
  let n = 0;
  for (const z of ZONE_INDEX_SEED) {
    await db.zoneIndex.upsert({
      where: {
        family_zoneCode_key_validFrom: {
          family: z.family,
          zoneCode: z.zoneCode,
          key: z.key,
          validFrom: SEED_VALID_FROM,
        },
      },
      create: {
        family: z.family,
        zoneCode: z.zoneCode,
        key: z.key,
        value: z.value,
        currency: z.currency ?? null,
        unit: z.unit ?? null,
        sourceRef: z.sourceRef ?? null,
        validFrom: SEED_VALID_FROM,
      },
      update: { value: z.value, currency: z.currency ?? null, unit: z.unit ?? null, sourceRef: z.sourceRef ?? null },
    });
    n++;
  }
  return n;
}

async function seedNeighbors() {
  let n = 0;
  for (const m of NEIGHBOR_MAP_SEED) {
    await db.economicNeighborMap.upsert({
      where: { zoneCode: m.zoneCode },
      create: { zoneCode: m.zoneCode, neighbors: m.neighbors },
      update: { neighbors: m.neighbors },
    });
    n++;
  }
  return n;
}

async function main() {
  const cat = await seedCatalog();
  const zi = await seedZoneIndices();
  const nb = await seedNeighbors();
  console.log(
    `[seed-action-costs] ${cat.templates} templates, ${cat.components} atoms, ${zi} zone-indices, ${nb} neighbor maps seeded.`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-action-costs] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
