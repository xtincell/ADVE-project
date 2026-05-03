import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const KEEP_IDS = new Set([
  "wk-strategy-bliss",
  "wk-strategy-vibranium-tech",
  "wk-strategy-wakanda-brew",
  "wk-strategy-panther-athletics",
  "wk-strategy-shuri-academy",
  "wk-strategy-jabari-heritage",
  "cmo978ank000401lo6gcp0b0t", // Fantribe
  "spawt-strategy",             // SPAWT
]);

const EXECUTE = process.argv.includes("--execute");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Load full FK graph: child_table.child_column -> parent_table.parent_column
const fks = await db.$queryRawUnsafe(`
  SELECT
    tc.table_name AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.table_name;
`);

const fksByParent = new Map();
for (const fk of fks) {
  if (!fksByParent.has(fk.parent_table)) fksByParent.set(fk.parent_table, []);
  fksByParent.get(fk.parent_table).push(fk);
}

const allStrategies = await db.strategy.findMany({ select: { id: true, name: true, isDummy: true, status: true } });
const toDelete = allStrategies.filter((s) => !KEEP_IDS.has(s.id));
const kept = allStrategies.filter((s) => KEEP_IDS.has(s.id));

console.log("=== KEEP (" + kept.length + ") ===");
kept.forEach((s) => console.log("  ✓ " + s.id + "  " + s.name + (s.isDummy ? "  [DUMMY]" : "")));
console.log("\n=== DELETE (" + toDelete.length + ") Strategy + cascading children ===");
toDelete.forEach((s) => console.log("  ✗ " + s.id + "  " + s.name + "  status=" + s.status));

// BFS: collect ids to delete per table starting from Strategy
async function collectIdsToDelete(tx) {
  const idsByTable = new Map();
  idsByTable.set("Strategy", new Set(toDelete.map((s) => s.id)));

  const queue = [["Strategy", "id"]];
  while (queue.length > 0) {
    const [parentTable, parentColumn] = queue.shift();
    const parentIds = idsByTable.get(parentTable);
    if (!parentIds || parentIds.size === 0) continue;
    const children = fksByParent.get(parentTable) ?? [];
    for (const c of children) {
      // Only follow FK into the matching column (parent_column should equal what we're deleting)
      if (c.parent_column !== parentColumn) continue;
      const inList = [...parentIds].map((x) => `'${x.replaceAll("'", "''")}'`).join(",");
      // Find ids in child table that reference these parent ids — get their PK
      const sql = `SELECT id FROM "${c.child_table}" WHERE "${c.child_column}" IN (${inList})`;
      let rows;
      try {
        rows = await tx.$queryRawUnsafe(sql);
      } catch {
        // Child has no "id" column or different PK shape — fallback: just track for direct delete
        if (!idsByTable.has(c.child_table)) idsByTable.set(c.child_table, new Set(["__delete_by_fk__"]));
        continue;
      }
      const childIds = rows.map((r) => r.id).filter((x) => x != null);
      if (childIds.length === 0) continue;
      let bag = idsByTable.get(c.child_table);
      if (!bag) {
        bag = new Set();
        idsByTable.set(c.child_table, bag);
      }
      for (const id of childIds) bag.add(id);
      queue.push([c.child_table, "id"]);
    }
  }
  return idsByTable;
}

if (!EXECUTE) {
  console.log("\nDry run only. Re-run with --execute to actually delete.");
  await db.$disconnect();
  process.exit(0);
}

console.log("\n>>> EXECUTING <<<");
let totalRows = 0;
await db.$transaction(async (tx) => {
  const idsByTable = await collectIdsToDelete(tx);

  // Topological sort: tables with no other table depending on them go first
  // Simpler: iterate until no more deletes succeed.
  const tables = [...idsByTable.keys()];
  let remaining = new Set(tables);
  let progress = true;
  while (remaining.size > 0 && progress) {
    progress = false;
    for (const t of [...remaining]) {
      const ids = idsByTable.get(t);
      if (!ids || ids.size === 0) {
        remaining.delete(t);
        continue;
      }
      // Check if any other remaining table is a child of t
      const childRefs = (fksByParent.get(t) ?? []).filter((c) => remaining.has(c.child_table) && c.child_table !== t);
      if (childRefs.length > 0) continue; // skip — children must die first

      try {
        const inList = [...ids].map((x) => `'${x.replaceAll("'", "''")}'`).join(",");
        const sql = `DELETE FROM "${t}" WHERE id IN (${inList})`;
        const n = await tx.$executeRawUnsafe(sql);
        if (n > 0) console.log("  · " + t + ": " + n + " rows");
        totalRows += n;
        remaining.delete(t);
        progress = true;
      } catch (err) {
        console.log("  ! " + t + " failed: " + err.message.split("\n")[0]);
        throw err;
      }
    }
  }
  if (remaining.size > 0) {
    throw new Error("Cycle detected — could not delete: " + [...remaining].join(", "));
  }
});

console.log("\n✓ Purge complete: " + totalRows + " rows deleted.");
await db.$disconnect();
