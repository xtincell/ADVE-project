/**
 * Sprint A — backfill-imhotep-anubis-context.ts
 *
 * Remplit les colonnes que Imhotep + Anubis lisent en gate :
 *  - Strategy.businessContext.sector  (fallback "UNKNOWN")
 *  - Strategy.manipulationMix          (uniforme 0.25 si absent)
 *  - Mission.briefData.requiredManipulation + bucket + sector
 *
 * Idempotent : ne touche que les rows où la donnée manque.
 *
 * Usage : `npx tsx scripts/backfill-imhotep-anubis-context.ts [--dry-run]`
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const DEFAULT_MIX = { peddler: 0.25, dealer: 0.25, facilitator: 0.25, entertainer: 0.25 };

function inferSector(name: string | null, channel: string | null): string {
  const text = `${name ?? ""} ${channel ?? ""}`.toLowerCase();
  if (/(beauty|cosmet|skincare|serum)/.test(text)) return "Cosmetiques";
  if (/(fintech|bank|money|wallet|saving)/.test(text)) return "Fintech";
  if (/(beverage|brew|food|fmcg)/.test(text)) return "FMCG";
  if (/(edu|academy|school|learn|cours)/.test(text)) return "EdTech";
  if (/(tour|heritage|patrimoine|culture)/.test(text)) return "Tourisme";
  if (/(athlet|sport|fitness)/.test(text)) return "FMCG";
  return "UNKNOWN";
}

function inferBucket(title: string): string {
  const t = title.toLowerCase();
  if (/(direction|kv|art)/.test(t)) return "ART_DIRECTOR";
  if (/(copy|tagline|narrative|writing)/.test(t)) return "COPYWRITER";
  if (/(photo|shoot|packshot)/.test(t)) return "PHOTOGRAPHER";
  if (/(video|spot|teaser|reel)/.test(t)) return "VIDEOGRAPHER";
  if (/(community|cm|social)/.test(t)) return "COMMUNITY";
  if (/ios/.test(t)) return "DEV_IOS";
  if (/android/.test(t)) return "DEV_ANDROID";
  if (/(web|landing|site)/.test(t)) return "DEV_WEB";
  if (/ux|ui|figma/.test(t)) return "UX_DESIGNER";
  if (/strategy|strategie|workshop/.test(t)) return "STRATEGIST";
  if (/sound|audio|jingle/.test(t)) return "SOUND_DESIGNER";
  return "STRATEGIST";
}

function inferManipulationModes(bucket: string): string[] {
  const map: Record<string, string[]> = {
    ART_DIRECTOR:   ["entertainer", "facilitator"],
    COPYWRITER:     ["facilitator", "dealer"],
    PHOTOGRAPHER:   ["entertainer"],
    VIDEOGRAPHER:   ["entertainer", "dealer"],
    COMMUNITY:      ["dealer", "peddler"],
    DEV_IOS:        ["facilitator"],
    DEV_ANDROID:    ["facilitator"],
    DEV_WEB:        ["facilitator"],
    UX_DESIGNER:    ["facilitator", "entertainer"],
    STRATEGIST:     ["facilitator", "entertainer"],
    SOUND_DESIGNER: ["entertainer"],
  };
  return map[bucket] ?? ["facilitator"];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = makeClient();
  let stratPatched = 0, missionPatched = 0, mixPatched = 0;
  try {
    type StratRow = {
      id: string;
      name: string;
      primaryChannel: string | null;
      businessContext: unknown;
      manipulationMix: unknown;
    };
    const strategies = (await prisma.strategy.findMany({
      select: { id: true, name: true, primaryChannel: true, businessContext: true, manipulationMix: true },
    })) as StratRow[];

    for (const s of strategies) {
      const ctx = (s.businessContext ?? {}) as Record<string, unknown>;
      const patches: Record<string, unknown> = {};

      if (!ctx.sector || typeof ctx.sector !== "string" || ctx.sector === "UNKNOWN") {
        const inferred = inferSector(s.name, s.primaryChannel);
        if (inferred !== "UNKNOWN") {
          patches.businessContext = { ...ctx, sector: inferred };
          stratPatched++;
        }
      }
      if (!s.manipulationMix) {
        patches.manipulationMix = DEFAULT_MIX;
        mixPatched++;
      }
      if (Object.keys(patches).length === 0) continue;
      if (dryRun) continue;
      await prisma.strategy.update({ where: { id: s.id }, data: patches });
    }

    type MissionRow = { id: string; title: string; strategyId: string; briefData: unknown };
    const missions = (await prisma.mission.findMany({
      select: { id: true, title: true, strategyId: true, briefData: true },
    })) as MissionRow[];

    const stratSectorMap = new Map<string, string>();
    for (const s of strategies) {
      const ctx = (s.businessContext ?? {}) as { sector?: string };
      if (ctx.sector) stratSectorMap.set(s.id, ctx.sector);
    }

    for (const m of missions) {
      const data = (m.briefData ?? {}) as Record<string, unknown>;
      if (data.bucket && data.requiredManipulation && data.sector) continue;
      const bucket = (data.bucket as string | undefined) ?? inferBucket(m.title);
      const requiredManipulation = (data.requiredManipulation as string[] | undefined) ?? inferManipulationModes(bucket);
      const sector = (data.sector as string | undefined) ?? stratSectorMap.get(m.strategyId) ?? "UNKNOWN";
      missionPatched++;
      if (dryRun) continue;
      await prisma.mission.update({
        where: { id: m.id },
        data: { briefData: { ...data, bucket, requiredManipulation, sector } },
      });
    }

    console.log(
      `[OK] backfill ${dryRun ? "(dry-run) " : ""}— Strategy.businessContext.sector: ${stratPatched}, Strategy.manipulationMix: ${mixPatched}, Mission.briefData: ${missionPatched}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("backfill FAILED:", e); process.exit(1); });
