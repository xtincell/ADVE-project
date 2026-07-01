/**
 * audit-cskb-coverage.ts — Country-Scoped Knowledge Base coverage audit.
 *
 * ADR-0037 PR-F. Scans all KnowledgeEntry rows in DB and reports the
 * percentage that have a non-null countryCode. Target ≥ 99% post-Phase 17
 * (legacy Wakanda + cross-cutting global benchmarks may stay null).
 *
 * Exit code 0 if coverage ≥ threshold. Default 10% for the Phase 17
 * transitional period — Tarsis + market-study services are now country-
 * aware but the legacy seeders (knowledge-seeder, sentinel-handlers,
 * diagnostic-engine, feedback-loop, etc.) still write without it. Each
 * subsequent sprint should bump callers + raise the threshold here.
 * Cible finale : 99%.
 *
 * Usage : `npx tsx scripts/audit-cskb-coverage.ts [--threshold=0.99]`
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("✗ DATABASE_URL not set.");
    process.exit(1);
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main() {
  const args = process.argv.slice(2);
  const thresholdArg = args.find((a) => a.startsWith("--threshold="));
  const threshold = thresholdArg ? parseFloat(thresholdArg.split("=")[1] ?? "0.10") : 0.10;

  const db = makeClient();
  try {
    const total = await db.knowledgeEntry.count();
    const withCountry = await db.knowledgeEntry.count({ where: { countryCode: { not: null } } });
    const coverage = total === 0 ? 1 : withCountry / total;

    // Per-entryType breakdown.
    const byType = await db.knowledgeEntry.groupBy({
      by: ["entryType"],
      _count: { _all: true },
    });
    const byTypeWithCountry = await db.knowledgeEntry.groupBy({
      by: ["entryType"],
      where: { countryCode: { not: null } },
      _count: { _all: true },
    });
    const breakdown: Record<string, { total: number; withCountry: number; pct: number }> = {};
    for (const row of byType) {
      breakdown[row.entryType] = { total: row._count._all, withCountry: 0, pct: 0 };
    }
    for (const row of byTypeWithCountry) {
      const b = breakdown[row.entryType];
      if (b) {
        b.withCountry = row._count._all;
        b.pct = b.total === 0 ? 1 : b.withCountry / b.total;
      }
    }

    const pctStr = (n: number) => `${Math.round(n * 1000) / 10}%`;
    console.log(`\n=== Country-Scoped KB Coverage (ADR-0037 PR-F) ===`);
    console.log(`Total KnowledgeEntry rows : ${total}`);
    console.log(`With countryCode          : ${withCountry} (${pctStr(coverage)})`);
    console.log(`Threshold                 : ${pctStr(threshold)}`);
    console.log(``);
    console.log(`Per entryType breakdown :`);
    for (const [type, b] of Object.entries(breakdown).sort()) {
      const flag = b.pct >= 0.99 ? "✓" : b.pct >= 0.50 ? "·" : "✗";
      console.log(`  ${flag} ${type.padEnd(28)} ${b.withCountry}/${b.total}  (${pctStr(b.pct)})`);
    }

    if (coverage < threshold) {
      console.error(`\n✗ Coverage ${pctStr(coverage)} < threshold ${pctStr(threshold)}`);
      process.exit(1);
    }
    console.log(`\n✓ Coverage OK`);
    process.exit(0);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("✗ audit-cskb-coverage failed:", err);
  process.exit(1);
});
