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
import { ACTION_COST_CATALOG } from "../src/server/services/financial-brain/action-costing/catalog";
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

async function seedCatalog() {
  let templates = 0;
  let components = 0;
  for (const t of ACTION_COST_CATALOG) {
    const tpl = await db.actionCostTemplate.upsert({
      where: { actionKey: t.actionKey },
      create: {
        actionKey: t.actionKey,
        label: t.label,
        category: t.category,
        family: t.family ?? null,
        unitOfWork: t.unitOfWork ?? "PROJECT",
        description: t.description ?? null,
        defaultDurationHours: t.defaultDurationHours ?? null,
        baseZoneCode: t.baseZoneCode ?? "CM",
        baseCurrency: t.baseCurrency ?? "XAF",
        defaultMarginPct: t.defaultMarginPct ?? 0.2,
        defaultContingencyPct: t.defaultContingencyPct ?? 0.05,
        tags: t.tags ?? [],
        source: t.source ?? null,
      },
      update: {
        label: t.label,
        category: t.category,
        family: t.family ?? null,
        unitOfWork: t.unitOfWork ?? "PROJECT",
        description: t.description ?? null,
        defaultDurationHours: t.defaultDurationHours ?? null,
        baseZoneCode: t.baseZoneCode ?? "CM",
        baseCurrency: t.baseCurrency ?? "XAF",
        defaultMarginPct: t.defaultMarginPct ?? 0.2,
        defaultContingencyPct: t.defaultContingencyPct ?? 0.05,
        tags: t.tags ?? [],
        source: t.source ?? null,
      },
    });
    templates++;

    // Replace components wholesale (atoms are catalog-owned, not operator-edited here).
    await db.actionCostComponent.deleteMany({ where: { templateId: tpl.id } });
    await db.actionCostComponent.createMany({
      data: t.components.map((c, i) => ({
        templateId: tpl.id,
        driver: c.driver,
        label: c.label,
        quantity: c.quantity ?? 1,
        unit: c.unit ?? "FLAT",
        rateBasis: c.rateBasis ?? "FIXED",
        rateKey: c.rateKey ?? null,
        indexFamily: c.indexFamily ?? null,
        baseRate: c.baseRate ?? 0,
        optional: c.optional ?? false,
        sortOrder: i,
        notes: c.notes ?? null,
      })),
    });
    components += t.components.length;
  }
  return { templates, components };
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
