/**
 * Strategy archive — 2-phase soft archive + hard purge.
 *
 * Phase 1 (archive)  : `Strategy.archivedAt = now()`. Caché des queries default,
 *                      restaurable. Réversible.
 * Phase 2 (purge)    : DELETE row + BFS cascade sur toutes les tables enfants.
 *                      Irréversible. Doit être précédé d'un archive (anti-foot-gun).
 *
 * Découverte des FK : runtime via information_schema (pas de hardcoding des
 * 34+ tables enfants). Topological sort BFS pour delete bottom-up.
 *
 * Cf. ADR à venir + RESIDUAL-DEBT Phase 16+.
 */

import { db } from "@/lib/db";

export interface ArchivedStrategySummary {
  id: string;
  name: string;
  status: string;
  isDummy: boolean;
  operatorId: string | null;
  archivedAt: Date;
  createdAt: Date;
  counts: {
    pillars: number;
    brandAssets: number;
    missions: number;
    dataSources: number;
  };
}

export async function archiveStrategy(strategyId: string): Promise<{ id: string; archivedAt: Date }> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, archivedAt: true, isDummy: true },
  });
  if (!strategy) throw new Error(`Strategy ${strategyId} not found`);
  if (strategy.archivedAt) throw new Error(`Strategy ${strategyId} already archived at ${strategy.archivedAt.toISOString()}`);
  if (strategy.isDummy) throw new Error(`Strategy ${strategyId} is a dummy seed (Wakanda) — refuse to archive`);

  const updated = await db.strategy.update({
    where: { id: strategyId },
    data: { archivedAt: new Date() },
    select: { id: true, archivedAt: true },
  });
  return { id: updated.id, archivedAt: updated.archivedAt! };
}

export async function restoreStrategy(strategyId: string): Promise<{ id: string }> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, archivedAt: true },
  });
  if (!strategy) throw new Error(`Strategy ${strategyId} not found`);
  if (!strategy.archivedAt) throw new Error(`Strategy ${strategyId} is not archived`);

  await db.strategy.update({
    where: { id: strategyId },
    data: { archivedAt: null },
  });
  return { id: strategyId };
}

export async function listArchivedStrategies(operatorId?: string | null): Promise<ArchivedStrategySummary[]> {
  const rows = await db.strategy.findMany({
    where: {
      archivedAt: { not: null },
      ...(operatorId !== undefined ? { operatorId } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      isDummy: true,
      operatorId: true,
      archivedAt: true,
      createdAt: true,
      _count: { select: { pillars: true, brandAssets: true, missions: true, dataSources: true } },
    },
    orderBy: { archivedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    isDummy: r.isDummy,
    operatorId: r.operatorId,
    archivedAt: r.archivedAt!,
    createdAt: r.createdAt,
    counts: {
      pillars: r._count.pillars,
      brandAssets: r._count.brandAssets,
      missions: r._count.missions,
      dataSources: r._count.dataSources,
    },
  }));
}

interface FkRow {
  child_table: string;
  child_column: string;
  parent_table: string;
  parent_column: string;
}

let fkCache: FkRow[] | null = null;
async function loadFks(): Promise<FkRow[]> {
  if (fkCache) return fkCache;
  fkCache = (await db.$queryRawUnsafe(`
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
  `)) as FkRow[];
  return fkCache;
}

export interface PurgeResult {
  strategyId: string;
  totalRowsDeleted: number;
  tablesAffected: { table: string; rows: number }[];
}

export async function purgeStrategy(strategyId: string): Promise<PurgeResult> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, archivedAt: true, isDummy: true },
  });
  if (!strategy) throw new Error(`Strategy ${strategyId} not found`);
  if (strategy.isDummy) throw new Error(`Strategy ${strategyId} is a dummy seed — refuse to hard-delete`);
  if (!strategy.archivedAt) {
    throw new Error(
      `Strategy ${strategyId} must be archived first (call archiveStrategy then purgeStrategy). Anti-foot-gun.`,
    );
  }

  const fks = await loadFks();
  const fksByParent = new Map<string, FkRow[]>();
  for (const fk of fks) {
    if (!fksByParent.has(fk.parent_table)) fksByParent.set(fk.parent_table, []);
    fksByParent.get(fk.parent_table)!.push(fk);
  }

  const tableHits: { table: string; rows: number }[] = [];
  let totalRows = 0;

  await db.$transaction(async (tx) => {
    const idsByTable = new Map<string, Set<string>>();
    idsByTable.set("Strategy", new Set([strategyId]));

    const queue: [string, string][] = [["Strategy", "id"]];
    while (queue.length > 0) {
      const [parentTable, parentColumn] = queue.shift()!;
      const parentIds = idsByTable.get(parentTable);
      if (!parentIds || parentIds.size === 0) continue;
      const children = fksByParent.get(parentTable) ?? [];
      for (const c of children) {
        if (c.parent_column !== parentColumn) continue;
        const inList = [...parentIds].map((x) => `'${x.replaceAll("'", "''")}'`).join(",");
        let rows: { id: string }[];
        try {
          rows = (await tx.$queryRawUnsafe(
            `SELECT id FROM "${c.child_table}" WHERE "${c.child_column}" IN (${inList})`,
          )) as { id: string }[];
        } catch {
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

    let remaining = new Set(idsByTable.keys());
    let progress = true;
    while (remaining.size > 0 && progress) {
      progress = false;
      for (const t of [...remaining]) {
        const ids = idsByTable.get(t);
        if (!ids || ids.size === 0) {
          remaining.delete(t);
          continue;
        }
        const stillHasChildren = (fksByParent.get(t) ?? []).some(
          (c) => remaining.has(c.child_table) && c.child_table !== t,
        );
        if (stillHasChildren) continue;

        const inList = [...ids].map((x) => `'${x.replaceAll("'", "''")}'`).join(",");
        const n = await tx.$executeRawUnsafe(`DELETE FROM "${t}" WHERE id IN (${inList})`);
        if (n > 0) tableHits.push({ table: t, rows: n });
        totalRows += n;
        remaining.delete(t);
        progress = true;
      }
    }
    if (remaining.size > 0) {
      throw new Error("Cycle in FK graph — could not delete: " + [...remaining].join(", "));
    }
  });

  return { strategyId, totalRowsDeleted: totalRows, tablesAffected: tableHits };
}
