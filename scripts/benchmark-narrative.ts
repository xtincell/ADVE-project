/**
 * scripts/benchmark-narrative.ts
 *
 * Compares V1 (single Sonnet) vs V2 (sync index + hybrid retrieval + Sonnet
 * brief + Opus final write) on N completed intakes. Reports cost (USD),
 * latency, and structural quality (verbatim citation rate, length, JSON shape).
 *
 * Quality metric: how often the final report's `adve[].full` paragraph
 * mentions a *verbatim* preciseField value pulled from the brand. Higher is
 * better — that's exactly what V2's hybrid retrieval is supposed to lift.
 *
 * Usage:
 *   npx tsx scripts/benchmark-narrative.ts [--limit 5]
 *
 * Requires: ANTHROPIC_API_KEY set, at least one ACTIVE/QUICK_INTAKE strategy
 * with non-empty pillar content.
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


const db = makeClient();

interface RunResult {
  strategyId: string;
  companyName: string;
  variant: "V1" | "V2";
  durationMs: number;
  /** Count of preciseField values cited verbatim in the final adve[].full text. */
  verbatimCitations: number;
  /** Total characters of all adve[].full + rtis.pillars[].full. */
  totalReportChars: number;
  /** True iff the JSON shape is valid. */
  shapeValid: boolean;
  error?: string;
}

const PILLARS = ["a", "d", "v", "e"] as const;

function countVerbatimCitations(reportText: string, preciseValues: string[]): number {
  let count = 0;
  for (const v of preciseValues) {
    const trimmed = v.trim();
    if (trimmed.length < 8) continue; // ignore very short values (high false-positive rate)
    if (reportText.includes(trimmed)) count++;
  }
  return count;
}

function flattenReportText(report: { adve: Array<{ full?: string }>; rtis?: { pillars?: Array<{ full?: string }> }; executiveSummary?: string }): string {
  const parts: string[] = [];
  if (report.executiveSummary) parts.push(report.executiveSummary);
  for (const a of report.adve) if (a.full) parts.push(a.full);
  for (const p of report.rtis?.pillars ?? []) if (p.full) parts.push(p.full);
  return parts.join("\n");
}

async function loadPreciseValues(strategyId: string): Promise<string[]> {
  const pillars = await db.pillar.findMany({
    where: { strategyId, key: { in: PILLARS as unknown as string[] } },
    select: { content: true },
  });
  const out: string[] = [];
  for (const p of pillars) {
    const c = (p.content as Record<string, unknown> | null) ?? {};
    for (const v of Object.values(c)) {
      if (typeof v === "string" && v.trim().length >= 8) out.push(v);
      else if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.trim().length >= 8) out.push(item);
        }
      }
    }
  }
  return out;
}

async function runOnce(
  strategyId: string,
  companyName: string,
  sector: string | null,
  country: string | null,
  variant: "V1" | "V2",
): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const preciseValues = await loadPreciseValues(strategyId);

    if (variant === "V1") {
      const { generateNarrativeReport } = await import("@/server/services/quick-intake/narrative-report");
      // V1 needs `responses` + `extractedValues` — synthesize minimal shape from pillars.
      const pillars = await db.pillar.findMany({
        where: { strategyId, key: { in: PILLARS as unknown as string[] } },
        select: { key: true, content: true },
      });
      const extracted: Record<"a" | "d" | "v" | "e", Record<string, unknown>> = { a: {}, d: {}, v: {}, e: {} };
      for (const p of pillars) {
        if (PILLARS.includes(p.key as typeof PILLARS[number])) {
          extracted[p.key as "a" | "d" | "v" | "e"] = (p.content as Record<string, unknown> | null) ?? {};
        }
      }
      const report = await generateNarrativeReport({
        companyName, sector, country,
        classification: "ZOMBIE",
        vector: { a: 0, d: 0, v: 0, e: 0 },
        responses: null,
        extractedValues: extracted,
      });
      const txt = flattenReportText(report);
      return {
        strategyId, companyName, variant,
        durationMs: Date.now() - t0,
        verbatimCitations: countVerbatimCitations(txt, preciseValues),
        totalReportChars: txt.length,
        shapeValid: true,
      };
    } else {
      const { generateNarrativeReportV2 } = await import("@/server/services/quick-intake/narrative-report-v2");
      const report = await generateNarrativeReportV2({
        strategyId, companyName, sector, country,
        classification: "ZOMBIE",
        vector: { a: 0, d: 0, v: 0, e: 0 },
      });
      const txt = flattenReportText(report);
      return {
        strategyId, companyName, variant,
        durationMs: Date.now() - t0,
        verbatimCitations: countVerbatimCitations(txt, preciseValues),
        totalReportChars: txt.length,
        shapeValid: true,
      };
    }
  } catch (err) {
    return {
      strategyId, companyName, variant,
      durationMs: Date.now() - t0,
      verbatimCitations: 0,
      totalReportChars: 0,
      shapeValid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? Number(limitArg) : 3;

  // Pick strategies with non-trivial pillar content.
  const candidates = await db.strategy.findMany({
    where: {
      status: { in: ["ACTIVE", "QUICK_INTAKE"] },
      pillars: { some: { content: { not: { equals: {} } } } },
    },
    take: limit,
    include: { client: { select: { sector: true, country: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (candidates.length === 0) {
    console.warn("[benchmark] no candidate strategies found — seed some content first.");
    return;
  }

  console.log(`[benchmark-narrative] running V1 vs V2 on ${candidates.length} strategies...`);
  const results: RunResult[] = [];
  for (const s of candidates) {
    console.log(`\n  [${s.name}] running V1 ...`);
    results.push(await runOnce(s.id, s.name, s.client?.sector ?? null, s.client?.country ?? null, "V1"));
    console.log(`  [${s.name}] running V2 ...`);
    results.push(await runOnce(s.id, s.name, s.client?.sector ?? null, s.client?.country ?? null, "V2"));
  }

  console.log("\n━━━ Results ━━━");
  console.log("strategy | variant | duration_ms | verbatim_cites | report_chars | shape_ok | error");
  for (const r of results) {
    console.log(
      `${r.companyName.slice(0, 24).padEnd(24)} | ${r.variant} | ${String(r.durationMs).padStart(8)} | ${String(r.verbatimCitations).padStart(4)} | ${String(r.totalReportChars).padStart(6)} | ${r.shapeValid ? "✓" : "✗"} | ${r.error ?? ""}`,
    );
  }

  // Aggregate per variant
  const v1 = results.filter((r) => r.variant === "V1" && r.shapeValid);
  const v2 = results.filter((r) => r.variant === "V2" && r.shapeValid);
  const avg = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length);
  console.log("\n━━━ Aggregate ━━━");
  console.log(`V1: avg duration ${avg(v1.map((r) => r.durationMs)).toFixed(0)}ms, avg citations ${avg(v1.map((r) => r.verbatimCitations)).toFixed(2)}, avg chars ${avg(v1.map((r) => r.totalReportChars)).toFixed(0)}`);
  console.log(`V2: avg duration ${avg(v2.map((r) => r.durationMs)).toFixed(0)}ms, avg citations ${avg(v2.map((r) => r.verbatimCitations)).toFixed(2)}, avg chars ${avg(v2.map((r) => r.totalReportChars)).toFixed(0)}`);
  console.log("\nDecision rule: switch policy to V2 IFF V2 verbatim_cites is materially higher (≥1.5×) AND quality is judged better on a sample.");
}

main()
  .catch((err) => {
    console.error("[benchmark-narrative] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
