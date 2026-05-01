/**
 * audit-anubis-conversion.ts — drift detector for paid media campaigns
 * launched by Anubis (ADR-0011 §10).
 *
 * Flagge campagnes qui consomment du budget Thot mais ne convertissent
 * pas en devotion ladder up-step. Si `cost_per_superfan_recruited >
 * 2× benchmark sectoriel` sur 30 jours → recalibrage des audiences/mode
 * recommandé.
 *
 * Sortie : tableau `campaignDrift` desc + warning si benchmark dépassé.
 *
 * Usage : `npx tsx scripts/audit-anubis-conversion.ts [--strict]`
 *   --strict : exit 1 si au moins une campagne au-dessus du seuil.
 *
 * Cron : weekly (monday 04:00).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const VETO_RATIO = 2.0;
const WINDOW_DAYS = 30;

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

interface CampaignDrift {
  amplificationId: string;
  campaignId: string;
  platform: string;
  status: string;
  budget: number;
  superfansAcquired: number;
  costPerSuperfanActual: number;
  costPerSuperfanBenchmark: number | null;
  ratio: number | null;
  createdAt: Date;
}

async function audit(): Promise<{ drifts: CampaignDrift[]; warnings: string[] }> {
  const prisma = makeClient();
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
    type AmpRow = {
      id: string;
      campaignId: string;
      platform: string;
      status: string;
      budget: number;
      conversions: number | null;
      metrics: unknown;
      createdAt: Date;
    };
    const amplifications = (await prisma.campaignAmplification.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        campaignId: true,
        platform: true,
        status: true,
        budget: true,
        conversions: true,
        metrics: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })) as AmpRow[];

    const drifts: CampaignDrift[] = [];
    for (const a of amplifications) {
      const metrics = (a.metrics ?? {}) as {
        superfansAcquired?: number;
        costPerSuperfan?: number;
        costPerSuperfanBenchmark?: number | null;
        benchmarkRatio?: number | null;
        expectedSuperfans?: number;
      };
      // Use realised metrics first; fall back to expectations from launch.
      const superfans = metrics.superfansAcquired ?? metrics.expectedSuperfans ?? 0;
      const cps = metrics.costPerSuperfan ?? (superfans > 0 ? a.budget / superfans : Number.POSITIVE_INFINITY);
      const benchmark = metrics.costPerSuperfanBenchmark ?? null;
      const ratio = benchmark != null && benchmark > 0 ? cps / benchmark : null;

      drifts.push({
        amplificationId: a.id,
        campaignId: a.campaignId,
        platform: a.platform,
        status: a.status,
        budget: a.budget,
        superfansAcquired: superfans,
        costPerSuperfanActual: Math.round(cps * 100) / 100,
        costPerSuperfanBenchmark: benchmark,
        ratio: ratio != null ? Math.round(ratio * 100) / 100 : null,
        createdAt: a.createdAt,
      });
    }
    drifts.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));

    const warnings: string[] = drifts
      .filter((d) => d.ratio != null && d.ratio >= VETO_RATIO)
      .map(
        (d) =>
          `[ANUBIS-CONVERSION-WARN] ${d.amplificationId} (${d.platform}, status=${d.status}) — costPerSuperfan=${d.costPerSuperfanActual} vs benchmark=${d.costPerSuperfanBenchmark} (ratio=${d.ratio?.toFixed(2)}× ≥ ${VETO_RATIO}×) — budget=${d.budget}`,
      );

    return { drifts, warnings };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const strict = process.argv.includes("--strict");
  const { drifts, warnings } = await audit();

  console.log(`\n=== audit-anubis-conversion (window=${WINDOW_DAYS}d, threshold=${VETO_RATIO}× benchmark) ===\n`);
  if (drifts.length === 0) {
    console.log("[OK] No CampaignAmplification rows in the audit window.");
  } else {
    console.log(`Top ${Math.min(10, drifts.length)} amplifications by benchmark ratio:`);
    for (const d of drifts.slice(0, 10)) {
      const ratioStr = d.ratio == null ? "n/a" : `${d.ratio.toFixed(2)}×`;
      console.log(
        `  ${ratioStr.padStart(6)}  ${d.platform.padEnd(11)}  cps=${String(d.costPerSuperfanActual).padStart(6)}  bench=${d.costPerSuperfanBenchmark ?? "n/a"}  budget=${d.budget}  ${d.amplificationId}`,
      );
    }
  }
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ${w}`);
    if (strict) {
      console.error(`\n[strict] ${warnings.length} campaign(s) over threshold — exit 1.`);
      process.exit(1);
    }
  } else {
    console.log("\n[OK] No campaign over threshold.");
  }
}

main().catch((e) => {
  console.error("audit-anubis-conversion FAILED:", e);
  process.exit(1);
});
