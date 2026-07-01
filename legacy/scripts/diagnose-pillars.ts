#!/usr/bin/env tsx
import { db } from "../src/lib/db";

async function main() {
  const sid = "cmntfdyox00fj01coe4pvifwd"; // Bliss

  // Recos by pillar
  const byPillar = await db.recommendation.groupBy({
    by: ["targetPillarKey", "status"],
    where: { strategyId: sid },
    _count: true,
  });
  console.log("Recos by pillar+status:");
  for (const c of byPillar) console.log(`  ${c.targetPillarKey} [${c.status}]: ${c._count}`);

  // Check each pillar
  for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
    const p = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId: sid, key } },
      select: { content: true, completionLevel: true, confidence: true, staleAt: true, pendingRecos: true },
    });
    const content = (p?.content ?? {}) as Record<string, unknown>;
    const filled = Object.entries(content).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
    const legacyRecos = Array.isArray(p?.pendingRecos) ? (p?.pendingRecos as unknown[]).length : 0;
    console.log(`\n${key.toUpperCase()}: completion=${p?.completionLevel ?? "null"} confidence=${p?.confidence?.toFixed(2) ?? "null"} stale=${p?.staleAt ? "YES" : "no"} legacyPendingRecos=${legacyRecos}`);
    console.log(`  filled: ${filled.length}/${Object.keys(content).length} keys: ${filled.map(([k]) => k).slice(0, 10).join(", ")}${filled.length > 10 ? "..." : ""}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
