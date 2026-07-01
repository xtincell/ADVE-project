/**
 * Seed Ptah demo — données pré-remplies pour démos client.
 *
 * Crée :
 *   - 1 GenerativeTask par forge kind (image, video, audio, icon, refine, transform, classify, design)
 *   - AssetVersion correspondants avec URLs picsum/sample
 *   - Strategy.manipulationMix back-fill (si null)
 *
 * Usage : npx tsx scripts/seed-ptah-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const db = makeClient();

interface SeedSpec {
  forgeKind: "image" | "video" | "audio" | "icon" | "refine" | "transform" | "classify" | "stock" | "design";
  provider: "magnific" | "adobe" | "figma" | "canva";
  providerModel: string;
  briefText: string;
  url: string;
  width?: number;
  height?: number;
  durationMs?: number;
  pillarSource: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
  manipulationMode: "peddler" | "dealer" | "facilitator" | "entertainer";
  estimatedCostUsd: number;
  expectedSuperfans: number;
  cultIndexDeltaObserved?: number | null;
}

const SEEDS: SeedSpec[] = [
  {
    forgeKind: "image",
    provider: "magnific",
    providerModel: "mystic",
    briefText: "Bonnet Rouge billboard — golden hour, Cameroonian family savoring breakfast, premium dairy aesthetic, marble texture",
    url: "https://picsum.photos/seed/bonnet-rouge-billboard/1920/1080",
    width: 1920,
    height: 1080,
    pillarSource: "V",
    manipulationMode: "entertainer",
    estimatedCostUsd: 0.04,
    expectedSuperfans: 65,
    cultIndexDeltaObserved: 4.2,
  },
  {
    forgeKind: "image",
    provider: "magnific",
    providerModel: "nano-banana-pro",
    briefText: "Tongoro fashion editorial — Dakar street style, model wearing wax print, Afrofuturist palette",
    url: "https://picsum.photos/seed/tongoro-editorial/1080/1350",
    width: 1080,
    height: 1350,
    pillarSource: "D",
    manipulationMode: "entertainer",
    estimatedCostUsd: 0.06,
    expectedSuperfans: 55,
    cultIndexDeltaObserved: 6.8,
  },
  {
    forgeKind: "refine",
    provider: "magnific",
    providerModel: "magnific-upscale-creative-4x",
    briefText: "Upscale 4x creative mode — preserve identity, add micro-detail, golden hour relight",
    url: "https://picsum.photos/seed/bonnet-rouge-upscaled/3840/2160",
    width: 3840,
    height: 2160,
    pillarSource: "V",
    manipulationMode: "entertainer",
    estimatedCostUsd: 0.2,
    expectedSuperfans: 65,
    cultIndexDeltaObserved: 1.1,
  },
  {
    forgeKind: "video",
    provider: "magnific",
    providerModel: "kling-3",
    briefText: "Plat tournant injera ethiopien — overhead 360°, 8s, restaurant Abidjan menu digital",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    durationMs: 8000,
    pillarSource: "I",
    manipulationMode: "entertainer",
    estimatedCostUsd: 3.2,
    expectedSuperfans: 80,
    cultIndexDeltaObserved: null,
  },
  {
    forgeKind: "audio",
    provider: "magnific",
    providerModel: "tts-premium",
    briefText: "Voix-over campagne Wave Money — accent ouest-africain neutre, ton chaleureux, 15s",
    url: "https://www.kozco.com/tech/LRMonoPhase4.wav",
    durationMs: 15000,
    pillarSource: "E",
    manipulationMode: "facilitator",
    estimatedCostUsd: 0.05,
    expectedSuperfans: 30,
    cultIndexDeltaObserved: 2.0,
  },
  {
    forgeKind: "icon",
    provider: "magnific",
    providerModel: "text-to-icon",
    briefText: "Icon flat color — superfan badge, devotion ladder palier 5",
    url: "https://picsum.photos/seed/superfan-badge/512/512",
    width: 512,
    height: 512,
    pillarSource: "E",
    manipulationMode: "facilitator",
    estimatedCostUsd: 0.005,
    expectedSuperfans: 25,
    cultIndexDeltaObserved: 0.4,
  },
  {
    forgeKind: "transform",
    provider: "magnific",
    providerModel: "image-bg-removal",
    briefText: "Background removal — packshot bouteille Wave isolée pour menu digital",
    url: "https://picsum.photos/seed/wave-packshot/1024/1024",
    width: 1024,
    height: 1024,
    pillarSource: "V",
    manipulationMode: "facilitator",
    estimatedCostUsd: 0.02,
    expectedSuperfans: 25,
    cultIndexDeltaObserved: 0.3,
  },
  {
    forgeKind: "design",
    provider: "figma",
    providerModel: "figma-export-asset",
    briefText: "Export branded slide deck — Tongoro retainer monthly report",
    url: "https://picsum.photos/seed/tongoro-deck/1920/1080",
    width: 1920,
    height: 1080,
    pillarSource: "S",
    manipulationMode: "facilitator",
    estimatedCostUsd: 0,
    expectedSuperfans: 20,
    cultIndexDeltaObserved: 0.5,
  },
];

function forgeKindToAssetKind(kind: string): "image" | "video" | "audio" | "icon" {
  if (kind === "video" || kind === "audio" || kind === "icon") return kind;
  return "image";
}

async function main() {
  console.log("→ Seeding Ptah demo data");

  // Find a strategy + operator to attach to
  const operator = await db.operator.findFirst({ orderBy: { createdAt: "asc" } });
  if (!operator) {
    console.error("No operator found — run seed-demo first.");
    process.exit(1);
  }
  const strategy = await db.strategy.findFirst({
    where: { operatorId: operator.id },
    orderBy: { createdAt: "asc" },
  });
  if (!strategy) {
    console.error("No strategy found — run seed-demo first.");
    process.exit(1);
  }

  // Backfill manipulationMix on the demo strategy if null
  if (!strategy.manipulationMix) {
    await db.strategy.update({
      where: { id: strategy.id },
      data: {
        manipulationMix: {
          peddler: 0.1,
          dealer: 0.2,
          facilitator: 0.2,
          entertainer: 0.5,
        },
      },
    });
    console.log(`  ✓ Backfilled manipulationMix on strategy ${strategy.name}`);
  }

  // Wipe previous demo seeds (idempotent)
  const wiped = await db.generativeTask.deleteMany({
    where: { operatorId: operator.id, strategyId: strategy.id },
  });
  if (wiped.count > 0) console.log(`  ✓ Wiped ${wiped.count} previous demo task(s)`);

  // Create new tasks + asset versions
  for (const seed of SEEDS) {
    const intentId = `intent-ptah-demo-${seed.forgeKind}-${randomBytes(4).toString("hex")}`;
    const promptHash = randomBytes(32).toString("hex");
    const webhookSecret = randomBytes(16).toString("hex");
    const task = await db.generativeTask.create({
      data: {
        intentId,
        sourceIntentId: null,
        operatorId: operator.id,
        strategyId: strategy.id,
        forgeKind: seed.forgeKind,
        provider: seed.provider,
        providerModel: seed.providerModel,
        providerTaskId: `mock-${randomBytes(8).toString("hex")}`,
        status: "COMPLETED",
        promptHash,
        parameters: { width: seed.width, height: seed.height, duration: seed.durationMs },
        pillarSource: seed.pillarSource,
        manipulationMode: seed.manipulationMode,
        resultUrls: [seed.url],
        estimatedCostUsd: seed.estimatedCostUsd,
        realisedCostUsd: seed.estimatedCostUsd,
        expectedSuperfans: seed.expectedSuperfans,
        realisedSuperfans:
          seed.cultIndexDeltaObserved != null
            ? Math.round(seed.expectedSuperfans * (0.7 + Math.random() * 0.6))
            : null,
        completedAt: new Date(),
        webhookSecret,
      },
    });
    await db.assetVersion.create({
      data: {
        generativeTaskId: task.id,
        operatorId: operator.id,
        strategyId: strategy.id,
        kind: forgeKindToAssetKind(seed.forgeKind),
        url: seed.url,
        cdnUrl: seed.url,
        width: seed.width ?? null,
        height: seed.height ?? null,
        durationMs: seed.durationMs ?? null,
        metadata: { brief: seed.briefText, demoSeed: true },
        cultIndexDeltaObserved: seed.cultIndexDeltaObserved ?? null,
      },
    });
    console.log(`  ✓ ${seed.forgeKind.padEnd(10)} ${seed.provider}/${seed.providerModel}`);
  }

  // Compute Strategy.cultIndex from sum of deltas
  const versions = await db.assetVersion.findMany({
    where: { strategyId: strategy.id, cultIndexDeltaObserved: { not: null } },
    select: { cultIndexDeltaObserved: true },
  });
  const cultIndex = versions.reduce((s, v) => s + (v.cultIndexDeltaObserved ?? 0), 0);
  await db.strategy.update({
    where: { id: strategy.id },
    data: { cultIndex },
  });

  console.log(`✓ Seeded ${SEEDS.length} Ptah demo tasks for strategy "${strategy.name}"`);
  console.log(`  cultIndex = ${cultIndex.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
