import { db } from "@/lib/db";

async function cleanup() {
  // Find SPAWT strategies with no missions (orphans from old seed runs)
  const all = await db.strategy.findMany({ where: { name: "SPAWT" }, select: { id: true, createdAt: true } });
  const good = "cmnfrallc000101w4mdw3e5yh"; // The one with 3 missions

  const toDelete = all.filter(s => s.id !== good).map(s => s.id);
  console.log(`Found ${all.length} SPAWT strategies, keeping ${good}, deleting ${toDelete.length} orphans`);

  for (const id of toDelete) {
    // Delete dependent records first
    await db.pillar.deleteMany({ where: { strategyId: id } });
    await db.variableStoreConfig.deleteMany({ where: { strategyId: id } });
    await db.brandOSConfig.deleteMany({ where: { strategyId: id } });
    await db.strategy.delete({ where: { id } });
    console.log(`  Deleted ${id}`);
  }

  console.log("Done! Remaining SPAWT strategies:", (await db.strategy.count({ where: { name: "SPAWT" } })));
  await db.$disconnect();
}

cleanup();
