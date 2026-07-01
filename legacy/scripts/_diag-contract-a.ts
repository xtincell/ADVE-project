#!/usr/bin/env tsx
/* eslint-disable */
import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const sid = process.argv[2] ?? "cmopkm63u000epg017yjm61d0";

  const { getContracts } = await import("@/server/services/pillar-maturity/contracts-loader");
  const { assessPillar } = await import("@/server/services/pillar-maturity/assessor");
  const contracts = getContracts();

  for (const k of ["a", "d", "v", "e"]) {
    const c = contracts[k]!;
    console.log(`\n=== ${k.toUpperCase()} contract ===`);
    console.log(`  INTAKE: ${c.stages.INTAKE.length} fields`);
    console.log(`  ENRICHED: ${c.stages.ENRICHED.length} fields`);
    console.log(`  COMPLETE: ${c.stages.COMPLETE.length} fields`);
    console.log(`  derivable=${c.stages.COMPLETE.filter(r => r.derivable).length} needsHuman=${c.stages.COMPLETE.filter(r => !r.derivable).length}`);
    console.log(`  COMPLETE paths:`);
    for (const r of c.stages.COMPLETE) {
      console.log(`    - ${r.path} [${r.validator}${r.validatorArg ? `:${r.validatorArg}` : ""}] derivable=${r.derivable} src=${r.derivationSource ?? "—"}`);
    }

    const p = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId: sid, key: k } },
      select: { content: true },
    });
    if (p) {
      const ass = assessPillar(k, (p.content ?? null) as any, c);
      console.log(`\n  PlusQUeMignon assessment: stage=${ass.currentStage} completionPct=${ass.completionPct}%`);
      console.log(`  satisfied (${ass.satisfied.length}): ${ass.satisfied.join(", ")}`);
      console.log(`  derivable missing (${ass.derivable.length}): ${ass.derivable.join(", ")}`);
      console.log(`  needsHuman missing (${ass.needsHuman.length}): ${ass.needsHuman.join(", ")}`);
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
