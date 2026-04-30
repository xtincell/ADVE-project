#!/usr/bin/env tsx
/**
 * check-slos.ts — SLO breach detection.
 *
 * For each Intent kind with declared SLOs (in src/server/governance/slos.ts),
 * compute rolling-N-day p95 latency, error rate, and cost p95 from
 * IntentEmission rows. Compare to declared limits. Output report; fail
 * CI when breach > 2 days consecutive.
 *
 * Run via cron `.github/workflows/slo-check.yml`.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const prisma = makeClient();
const ROLLING_DAYS = parseInt(process.argv.find((a) => a.startsWith("--rolling-days="))?.split("=")[1] ?? "7", 10);
const REPORT = process.argv.includes("--report");

interface SloDef {
  kind: string;
  p95LatencyMs?: number;
  errorRatePct?: number;
  costP95Usd?: number;
}

/**
 * Parse SLO declarations from src/server/governance/slos.ts. We do AST-light
 * regex parse to avoid bundling the TS file. The expected source format is:
 *   { kind: "FILL_ADVE", p95LatencyMs: 8000, errorRatePct: 5, costP95Usd: 0.20 }
 */
function parseSlos(): SloDef[] {
  const path = join(process.cwd(), "src/server/governance/slos.ts");
  if (!existsSync(path)) return [];
  const src = readFileSync(path, "utf8");
  const out: SloDef[] = [];
  const blockRe = /\{\s*kind:\s*"([A-Z_]+)"[^}]*\}/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const block = m[0];
    const kind = m[1]!;
    const lat = block.match(/p95LatencyMs:\s*(\d+)/);
    const err = block.match(/errorRatePct:\s*([\d.]+)/);
    const cost = block.match(/costP95Usd:\s*([\d.]+)/);
    out.push({
      kind,
      p95LatencyMs: lat ? parseInt(lat[1]!, 10) : undefined,
      errorRatePct: err ? parseFloat(err[1]!) : undefined,
      costP95Usd: cost ? parseFloat(cost[1]!) : undefined,
    });
  }
  return out;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx]!;
}

interface SloMeasurement {
  kind: string;
  sample: number;
  p95LatencyMs: number;
  errorRatePct: number;
  costP95Usd: number;
  breaches: string[];
}

async function measureKind(slo: SloDef): Promise<SloMeasurement | null> {
  const since = new Date(Date.now() - ROLLING_DAYS * 24 * 3600 * 1000);
  const rows = await prisma.intentEmission.findMany({
    where: { intentKind: slo.kind, emittedAt: { gte: since } },
    select: { startedAt: true, completedAt: true, status: true, costUsd: true },
  });
  if (rows.length === 0) return null;

  const latencies = rows
    .filter((r) => r.completedAt && r.startedAt)
    .map((r) => r.completedAt!.getTime() - r.startedAt!.getTime())
    .sort((a, b) => a - b);
  const failed = rows.filter((r) => r.status === "FAILED").length;
  const costs = rows
    .filter((r) => r.costUsd !== null)
    .map((r) => Number((r.costUsd as Prisma.Decimal | null)?.toString() ?? "0"))
    .sort((a, b) => a - b);

  const p95Latency = quantile(latencies, 0.95);
  const errorRate = (failed / rows.length) * 100;
  const costP95 = quantile(costs, 0.95);

  const breaches: string[] = [];
  if (slo.p95LatencyMs && p95Latency > slo.p95LatencyMs) {
    breaches.push(`p95 latency ${p95Latency}ms > ${slo.p95LatencyMs}ms`);
  }
  if (slo.errorRatePct !== undefined && errorRate > slo.errorRatePct) {
    breaches.push(`error rate ${errorRate.toFixed(2)}% > ${slo.errorRatePct}%`);
  }
  if (slo.costP95Usd && costP95 > slo.costP95Usd) {
    breaches.push(`cost p95 $${costP95.toFixed(4)} > $${slo.costP95Usd}`);
  }

  return {
    kind: slo.kind,
    sample: rows.length,
    p95LatencyMs: p95Latency,
    errorRatePct: errorRate,
    costP95Usd: costP95,
    breaches,
  };
}

async function main(): Promise<void> {
  const slos = parseSlos();
  if (slos.length === 0) {
    console.log("[check-slos] no SLO declarations found in src/server/governance/slos.ts");
    process.exit(0);
  }

  const measurements: SloMeasurement[] = [];
  for (const slo of slos) {
    const m = await measureKind(slo);
    if (m) measurements.push(m);
  }

  const breached = measurements.filter((m) => m.breaches.length > 0);

  if (REPORT) {
    console.log(`# SLO Report — rolling ${ROLLING_DAYS}d\n`);
    console.log(`Kinds measured : ${measurements.length}`);
    console.log(`Breaches       : ${breached.length}\n`);
    for (const m of measurements) {
      console.log(`## ${m.kind}`);
      console.log(`- Sample size : ${m.sample}`);
      console.log(`- p95 latency : ${m.p95LatencyMs} ms`);
      console.log(`- Error rate  : ${m.errorRatePct.toFixed(2)} %`);
      console.log(`- Cost p95    : $${m.costP95Usd.toFixed(4)}`);
      if (m.breaches.length > 0) {
        console.log(`- ❌ Breaches :`);
        for (const b of m.breaches) console.log(`  - ${b}`);
      } else {
        console.log(`- ✓ within budget`);
      }
      console.log("");
    }
  } else {
    console.log(`[check-slos] measured ${measurements.length} kinds, ${breached.length} breach(es).`);
  }

  await prisma.$disconnect();
  process.exit(breached.length > 0 ? 1 : 0);
}

void main().catch((err) => {
  console.error("[check-slos] error:", err);
  void prisma.$disconnect();
  process.exit(2);
});
