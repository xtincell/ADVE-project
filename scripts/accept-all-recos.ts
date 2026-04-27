#!/usr/bin/env tsx
import { db } from "../src/lib/db";
import { applyAcceptedRecommendations } from "../src/server/services/mestor/rtis-cascade";

async function main() {
  console.log("Scanning DB for ADVE pendingRecos and applying them...");
  const pillars = await db.pillar.findMany({ select: { id: true, strategyId: true, key: true, pendingRecos: true } });
  const byStrategy = new Map<string, Array<{ id: string; key: string; recos: any[] }>>();
  for (const p of pillars) {
    const recos = Array.isArray(p.pendingRecos) ? p.pendingRecos as any[] : [];
    if (recos.length === 0) continue;
    const list = byStrategy.get(p.strategyId) ?? [];
    list.push({ id: p.id, key: p.key, recos });
    byStrategy.set(p.strategyId, list);
  }

  if (byStrategy.size === 0) {
    console.log("No pending recos found.");
    await db.$disconnect();
    return;
  }

  for (const [strategyId, list] of byStrategy.entries()) {
    console.log(`\nStrategy ${strategyId} — ${list.length} pillars with pending recos`);
    for (const p of list) {
      // Only operate on ADVE pillars (a,d,v,e)
      const key = (p.key ?? "").toLowerCase();
      if (!["a", "d", "v", "e"].includes(key)) {
        console.log(` - Skipping pillar ${p.key} (not ADVE)`);
        continue;
      }
      const indices = p.recos.map((r, i) => i).filter(i => !(p.recos[i]?.accepted === true));
      if (indices.length === 0) {
        console.log(` - Pillar ${p.key}: no pending recos to apply`);
        continue;
      }
      try {
        console.log(` - Applying ${indices.length} recos on pillar ${p.key}...`);
        const res = await applyAcceptedRecommendations(strategyId, p.key.toUpperCase() as any, undefined, indices);
        if (res.error) console.error(`   ✖ Error: ${res.error}`);
        else console.log(`   ✓ Applied ${res.applied}`);
      } catch (err) {
        console.error(`   ✖ Exception applying recos for ${p.key}:`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  await db.$disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
