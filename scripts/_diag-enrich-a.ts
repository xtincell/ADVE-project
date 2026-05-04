#!/usr/bin/env tsx
/* eslint-disable */
import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const sid = process.argv[2] ?? "cmopkm63u000epg017yjm61d0";
  const key = (process.argv[3] ?? "a").toLowerCase();

  const { fillToStage } = await import("@/server/services/pillar-maturity/auto-filler");
  const { assessPillar } = await import("@/server/services/pillar-maturity/assessor");
  const { getContract } = await import("@/server/services/pillar-maturity/contracts-loader");

  console.log(`\n→ Enrichir ${key.toUpperCase()} for ${sid} (target=COMPLETE, max 3 passes)\n`);
  const before = await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key } }, select: { content: true } });
  const beforeAss = assessPillar(key, (before?.content ?? null) as any, getContract(key));
  console.log(`BEFORE: ${beforeAss.completionPct}% (${beforeAss.derivable.length} derivable missing, ${beforeAss.needsHuman.length} needsHuman)\n`);

  const result = await fillToStage(sid, key, "COMPLETE");

  console.log(`\nRESULT:`);
  console.log(`  duration: ${result.durationMs}ms`);
  console.log(`  newStage: ${result.newStage}`);
  console.log(`  filled (${result.filled.length}): ${result.filled.join(", ")}`);
  console.log(`  failed (${result.failed.length}): ${result.failed.map(f => `${f.path}=${f.reason}`).join(" | ")}`);
  console.log(`  needsHuman (${result.needsHuman.length}): ${result.needsHuman.join(", ")}`);

  const after = await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key } }, select: { content: true } });
  const afterAss = assessPillar(key, (after?.content ?? null) as any, getContract(key));
  console.log(`\nAFTER: ${afterAss.completionPct}% (${afterAss.derivable.length} derivable missing, ${afterAss.needsHuman.length} needsHuman)`);
  console.log(`  derivable still missing: ${afterAss.derivable.join(", ")}`);
  console.log(`  needsHuman still missing: ${afterAss.needsHuman.join(", ")}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
