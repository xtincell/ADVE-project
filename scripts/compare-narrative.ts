/**
 * scripts/compare-narrative.ts
 *
 * Runs V1 + V2 narrative-report on one strategy and prints both reports
 * side-by-side so a human can read them and judge.
 *
 * Run with `--strategyId=<id>` or it picks the most recent ACTIVE strategy
 * with non-empty pillars.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const argId = process.argv.find((a) => a.startsWith("--strategyId="))?.split("=")[1];
  const argName = process.argv.find((a) => a.startsWith("--name="))?.split("=")[1];

  let strategy;
  if (argId) {
    strategy = await db.strategy.findUnique({
      where: { id: argId },
      include: { client: { select: { sector: true, country: true } } },
    });
  } else if (argName) {
    strategy = await db.strategy.findFirst({
      where: { name: { contains: argName } },
      include: { client: { select: { sector: true, country: true } } },
    });
  } else {
    const candidates = await db.strategy.findMany({
      where: {
        status: "ACTIVE",
        pillars: { some: { content: { not: { equals: {} } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 1,
      include: { client: { select: { sector: true, country: true } } },
    });
    strategy = candidates[0];
  }
  if (!strategy) {
    console.error("no strategy found");
    process.exit(1);
  }

  console.log(`### Strategy : ${strategy.name} (${strategy.id})`);
  console.log(`### Sector  : ${strategy.client?.sector ?? "—"}  Country : ${strategy.client?.country ?? "—"}`);
  console.log("");

  // Build common inputs
  const pillars = await db.pillar.findMany({
    where: { strategyId: strategy.id, key: { in: ["a", "d", "v", "e"] } },
    select: { key: true, content: true },
  });
  const extracted: Record<"a" | "d" | "v" | "e", Record<string, unknown>> = { a: {}, d: {}, v: {}, e: {} };
  for (const p of pillars) {
    extracted[p.key as "a" | "d" | "v" | "e"] = (p.content as Record<string, unknown> | null) ?? {};
  }

  // ── V1 ──
  console.log("=".repeat(100));
  console.log("=== V1 — direct Sonnet, no retrieval ===");
  console.log("=".repeat(100));
  const t1 = Date.now();
  const { generateNarrativeReport } = await import("@/server/services/quick-intake/narrative-report");
  const v1 = await generateNarrativeReport({
    companyName: strategy.name,
    sector: strategy.client?.sector ?? null,
    country: strategy.client?.country ?? null,
    classification: "ZOMBIE",
    vector: { a: 0, d: 0, v: 0, e: 0 },
    responses: null,
    extractedValues: extracted,
  });
  const dt1 = Date.now() - t1;
  console.log(`(generated in ${dt1}ms)\n`);
  console.log("-- executiveSummary --\n");
  console.log(v1.executiveSummary);
  for (const a of v1.adve) {
    console.log(`\n-- ADVE [${a.key.toUpperCase()}] ${a.name} --`);
    console.log(`PREVIEW : ${a.preview}`);
    console.log(`FULL    : ${a.full}`);
  }
  console.log(`\n-- RTIS framing --\n${v1.rtis.framing}`);
  for (const r of v1.rtis.pillars) {
    console.log(`\n-- RTIS [${r.key.toUpperCase()}] ${r.name} (priority=${r.priority}) --`);
    console.log(`PREVIEW : ${r.preview}`);
    console.log(`FULL    : ${r.full}`);
    console.log(`KEY MOVE: ${r.keyMove}`);
  }

  // ── V3 ──
  console.log("\n" + "=".repeat(100));
  console.log("=== V3 — RTIS draft (RAG hybride) + tension synth + Opus diag+reco ===");
  console.log("=".repeat(100));
  const t3 = Date.now();
  const { indexBrandContext } = await import("@/server/services/seshat/context-store");
  const { generateAndPersistRtisDraft } = await import("@/server/services/quick-intake/rtis-draft");
  const { generateNarrativeReportV3 } = await import("@/server/services/quick-intake/narrative-report-v3");
  await indexBrandContext(strategy.id, "INTAKE_ONLY").catch(() => undefined);
  await generateAndPersistRtisDraft({
    strategyId: strategy.id,
    companyName: strategy.name,
    sector: strategy.client?.sector ?? null,
    market: strategy.client?.country ?? null,
  });
  await indexBrandContext(strategy.id, "FULL").catch(() => undefined);
  const v3 = await generateNarrativeReportV3({
    strategyId: strategy.id,
    companyName: strategy.name,
    sector: strategy.client?.sector ?? null,
    country: strategy.client?.country ?? null,
    classification: "ZOMBIE",
    vector: { a: 0, d: 0, v: 0, e: 0 },
  });
  const dt3 = Date.now() - t3;
  console.log(`(generated in ${dt3}ms — includes RTIS draft + reindex + narrative)\n`);
  console.log("-- centralTension --\n" + v3.centralTension);
  console.log("\n-- executiveSummary --\n" + v3.executiveSummary);
  for (const a of v3.adve) {
    console.log(`\n-- ADVE [${a.key.toUpperCase()}] ${a.name} --`);
    console.log(`PREVIEW : ${a.preview}`);
    console.log(`FULL    : ${a.full}`);
  }
  console.log(`\n-- RTIS framing --\n${v3.rtis.framing}`);
  for (const r of v3.rtis.pillars) {
    console.log(`\n-- RTIS [${r.key.toUpperCase()}] ${r.name} (priority=${r.priority}) --`);
    console.log(`PREVIEW : ${r.preview}`);
    console.log(`FULL    : ${r.full}`);
    console.log(`KEY MOVE: ${r.keyMove}`);
  }
  console.log("\n=== RECOMMENDATION (Opus autonomous block) ===");
  console.log(`Strategic move: ${v3.recommendation.strategicMove}`);
  console.log(`Why          : ${v3.recommendation.why}`);
  console.log(`\n-- Prioritized actions --`);
  for (const [i, a] of v3.recommendation.prioritizedActions.entries()) {
    console.log(`  #${i + 1} [${a.when} · ${a.owner}] ${a.title}`);
    console.log(`     rationale: ${a.rationale}`);
    console.log(`     KPI      : ${a.successKpi}`);
  }
  console.log(`\n-- Roadmap 90j --`);
  console.log(`  0-30j : ${v3.recommendation.roadmap90d.phase1_0_30j}`);
  console.log(`  30-60j: ${v3.recommendation.roadmap90d.phase2_30_60j}`);
  console.log(`  60-90j: ${v3.recommendation.roadmap90d.phase3_60_90j}`);
  console.log(`\n-- Risks to watch --`);
  for (const r of v3.recommendation.risksToWatch) console.log(`  - ${r}`);
  console.log(`\n-- foundedOnTension --\n${v3.recommendation.foundedOnTension}`);

  // ── Recap ──
  console.log("\n" + "=".repeat(100));
  console.log(`RECAP: V1 ${dt1}ms / ${JSON.stringify(v1).length} chars   ·   V3 ${dt3}ms / ${JSON.stringify(v3).length} chars`);
  console.log("=".repeat(100));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
