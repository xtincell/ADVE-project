#!/usr/bin/env tsx
import { db } from "../src/lib/db";

async function main() {
  const pillars = await db.pillar.findMany({ select: { id: true, strategyId: true, key: true, pendingRecos: true } });
  const map = new Map<string, Array<{ id: string; key: string; count: number }>>();
  for (const p of pillars) {
    const arr = Array.isArray(p.pendingRecos) ? p.pendingRecos as unknown[] : [];
    if (arr.length > 0) {
      const list = map.get(p.strategyId) ?? [];
      list.push({ id: p.id, key: p.key, count: arr.length });
      map.set(p.strategyId, list);
    }
  }

  if (map.size === 0) {
    console.log("No pendingRecos found in DB.");
    await db.$disconnect();
    return;
  }

  for (const [strategyId, list] of map.entries()) {
    console.log(`\nStrategy: ${strategyId} — ${list.length} pillars with pendingRecos`);
    for (const p of list) console.log(`- Pillar ${p.key} (id=${p.id}) => ${p.count} pendingRecos`);
  }

  await db.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
