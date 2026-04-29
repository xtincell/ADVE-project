#!/usr/bin/env tsx
/**
 * verify-hash-chain.ts
 *
 * Walk the IntentEmission table per-strategy, recompute selfHash for each
 * row, compare to stored selfHash. Mismatch = tamper or storage corruption.
 *
 * Run weekly via .github/workflows/governance-drift.yml. Fails CI if any
 * chain is broken.
 *
 * Usage:
 *   tsx scripts/verify-hash-chain.ts            # check last 1000 rows per strategy
 *   tsx scripts/verify-hash-chain.ts --all      # check entire history (slow)
 *   tsx scripts/verify-hash-chain.ts --strategy=<id>  # check one strategy
 */

import { PrismaClient } from "@prisma/client";
import { computeSelfHash, verifyChain } from "../src/server/governance/hash-chain";

const prisma = new PrismaClient();
const LIMIT = process.argv.includes("--all") ? undefined : 1000;
const ONE = process.argv.find((a) => a.startsWith("--strategy="))?.split("=")[1];

interface Report {
  strategiesChecked: number;
  totalRows: number;
  brokenStrategies: { strategyId: string; brokenAt: string; expected: string; actual: string }[];
}

async function main(): Promise<void> {
  const report: Report = { strategiesChecked: 0, totalRows: 0, brokenStrategies: [] };

  const strategyIds = ONE
    ? [ONE]
    : (await prisma.intentEmission.findMany({
        select: { strategyId: true },
        distinct: ["strategyId"],
        orderBy: { emittedAt: "desc" },
      })).map((r) => r.strategyId);

  for (const strategyId of strategyIds) {
    const rows = await prisma.intentEmission.findMany({
      where: { strategyId },
      orderBy: { emittedAt: "asc" },
      take: LIMIT,
      select: {
        id: true,
        intentKind: true,
        strategyId: true,
        payload: true,
        result: true,
        caller: true,
        emittedAt: true,
        prevHash: true,
        selfHash: true,
      },
    });

    if (rows.length === 0) continue;
    report.strategiesChecked++;
    report.totalRows += rows.length;

    // verifyChain expects rows with non-null selfHash; tolerate
    // un-hashed legacy rows by skipping them but flagging.
    const hashedRows = rows.filter((r): r is typeof r & { selfHash: string } => Boolean(r.selfHash));
    if (hashedRows.length !== rows.length) {
      console.warn(`[strategy=${strategyId}] ${rows.length - hashedRows.length} legacy row(s) without selfHash (skipped)`);
    }
    if (hashedRows.length === 0) continue;

    const result = verifyChain(hashedRows);
    if (!result.ok && result.brokenAt) {
      report.brokenStrategies.push({
        strategyId,
        brokenAt: result.brokenAt.id,
        expected: result.brokenAt.expected,
        actual: result.brokenAt.actual,
      });
    }
  }

  console.log(`\n[verify-hash-chain] checked ${report.strategiesChecked} strategies, ${report.totalRows} rows.`);
  if (report.brokenStrategies.length === 0) {
    console.log("✓ chain integrity OK across all strategies.\n");
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`\n✗ ${report.brokenStrategies.length} broken chain(s):\n`);
  for (const b of report.brokenStrategies) {
    console.log(`  strategy=${b.strategyId} broken at row ${b.brokenAt}`);
    console.log(`    expected prevHash=${b.expected}`);
    console.log(`    actual   prevHash=${b.actual}`);
  }
  await prisma.$disconnect();
  process.exit(1);
}

void main().catch((err) => {
  console.error("[verify-hash-chain] error:", err);
  void prisma.$disconnect();
  process.exit(2);
});
