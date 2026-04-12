#!/usr/bin/env tsx
/*
  scripts/fix-pillars.ts

  Usage:
    # Dry-run (no writes)
    pnpm tsx scripts/fix-pillars.ts --strategyId=STRATEGY_ID

    # Apply changes
    pnpm tsx scripts/fix-pillars.ts --strategyId=STRATEGY_ID --apply

  The script scans all pillars for the given strategy and coerces fields
  that should be arrays but are stored as strings/objects. It performs a
  conservative normalization (wrap objects, split comma-separated strings,
  wrap single values). For object-array elements (e.g. `valeurs`) it wraps
  strings into `{ customName: "..." }`.
*/

import { db } from "../src/lib/db";
import { PILLAR_SCHEMAS } from "../src/lib/types/pillar-schemas";

type Args = { strategyId?: string; apply?: boolean };

function parseArgs(): Args {
  const out: Args = {};
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (k === "strategyId") out.strategyId = v;
      if (k === "apply") out.apply = v === undefined || v === "true";
      if (k === "dryRun") out.apply = false;
    }
  }
  return out;
}

function expectsArray(fieldSchema: any): boolean {
  if (!fieldSchema || !fieldSchema._def) return false;
  const def = fieldSchema._def;
  const tryNames = [def.typeName, def?.innerType?._def?.typeName, def?.type?._def?.typeName, def?.items?._def?.typeName];
  for (const n of tryNames) {
    if (typeof n === "string" && n.toLowerCase().includes("array")) return true;
  }
  try {
    const s = String(fieldSchema);
    if (s.toLowerCase().includes("zodarray")) return true;
  } catch {}
  return false;
}

function getArrayItemTypeName(fieldSchema: any): string | null {
  if (!fieldSchema || !fieldSchema._def) return null;
  const def = fieldSchema._def;
  // common patterns in Zod internals
  const item = def.type ?? def._def?.type ?? def.innerType ?? def._def?.innerType;
  const name = item?._def?.typeName ?? item?.typeName ?? null;
  return name ?? null;
}

function coerceElementForArray(fieldName: string, fieldSchema: any, value: unknown): unknown {
  const itemType = getArrayItemTypeName(fieldSchema);
  // If items are objects, wrap string into { customName }
  if (itemType && String(itemType).toLowerCase().includes("object")) {
    if (typeof value === "object" && value !== null) return value;
    return { customName: String(value) };
  }
  if (itemType && String(itemType).toLowerCase().includes("string")) {
    return String(value);
  }
  if (itemType && String(itemType).toLowerCase().includes("number")) {
    const n = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? value : n;
  }
  // conservative fallback: if field name contains 'valeur' or 'valeurs', make object
  if (fieldName.toLowerCase().includes("valeur")) return { customName: String(value) };
  return value;
}

async function findFixesInPillars(pillars: Array<any>) {
  const fixes: Array<{ pillarId: number; pillarKey: string; field: string; old: unknown; newVal: unknown }> = [];
  for (const p of pillars) {
    try {
      const schemaKey = (p.key ?? "").toUpperCase();
      const schema = (PILLAR_SCHEMAS as any)[schemaKey];
      if (!schema) continue;
      const shape = schema.shape ?? {};
      const content = (p.content ?? {}) as Record<string, unknown>;

      for (const [field, fieldSchema] of Object.entries(shape)) {
        if (!expectsArray(fieldSchema)) continue;
        const current = (content as any)[field];
        if (current === undefined) continue;
        if (Array.isArray(current)) continue; // already good

        // Build normalized array
        let newVal: unknown;
        if (typeof current === "string") {
          const parts = current.split(",").map(s => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            newVal = parts.map(pv => coerceElementForArray(field, fieldSchema, pv));
          } else {
            newVal = [coerceElementForArray(field, fieldSchema, current)];
          }
        } else if (typeof current === "object" && current !== null) {
          newVal = [current];
        } else {
          newVal = [current];
        }

        fixes.push({ pillarId: p.id, pillarKey: p.key, field, old: current, newVal });
      }
    } catch (err) {
      console.warn("Error processing pillar", p.id, err instanceof Error ? err.message : String(err));
    }
  }
  return fixes;
}

async function main() {
  const { strategyId, apply } = parseArgs();

  if (strategyId) {
    console.log(`Scanning pillars for strategy ${strategyId} (apply=${!!apply})`);
    const pillars = await db.pillar.findMany({ where: { strategyId } });
    if (!pillars || pillars.length === 0) {
      console.log("No pillars found for strategy", strategyId);
      await db.$disconnect();
      return;
    }

    const fixes = await findFixesInPillars(pillars);
    if (fixes.length === 0) {
      console.log("No malformed array fields detected for strategy", strategyId);
      await db.$disconnect();
      return;
    }

    console.log(`Detected ${fixes.length} fields to normalize:`);
    for (const f of fixes) {
      console.log(`- Pillar ${f.pillarKey} (id=${f.pillarId}) field='${f.field}' — old=${typeof f.old} => new=${Array.isArray(f.newVal) ? 'array('+String((f.newVal as any).length)+')' : typeof f.newVal}`);
    }

    if (!apply) {
      console.log('\nDry-run mode (no DB writes). Rerun with --apply to commit changes.');
      await db.$disconnect();
      return;
    }

    const { writePillar } = await import("../src/server/services/pillar-gateway");
    for (const f of fixes) {
      try {
        console.log(`Applying fix to pillar ${f.pillarKey} field ${f.field}...`);
        await writePillar({
          strategyId,
          pillarKey: f.pillarKey as any,
          operation: { type: "SET_FIELDS", fields: [{ path: f.field, value: f.newVal }] },
          author: { system: "AUTO_FILLER", reason: "fix-pillars: normalize array fields" },
          options: { confidenceDelta: 0.01 },
        } as any);
        console.log(`✔ Applied`);
      } catch (err) {
        console.error(`Failed to apply fix to pillar ${f.pillarKey} field ${f.field}:`, err instanceof Error ? err.message : String(err));
      }
    }

    console.log("All done for strategy.");
    await db.$disconnect();
    return;
  }

  // No strategyId provided: scan all strategies
  console.log("No strategyId provided; scanning all strategies...");
  const rows = await db.pillar.findMany({ select: { strategyId: true } });
  const strategyIds = Array.from(new Set(rows.map(r => r.strategyId).filter(Boolean)));
  if (strategyIds.length === 0) {
    console.log("No strategies found in DB.");
    await db.$disconnect();
    return;
  }

  for (const sid of strategyIds) {
    console.log(`\n--- Scanning strategy ${sid} ---`);
    const pillars = await db.pillar.findMany({ where: { strategyId: sid } });
    const fixes = await findFixesInPillars(pillars);
    if (!fixes || fixes.length === 0) {
      console.log(`No issues for strategy ${sid}`);
      continue;
    }

    console.log(`Detected ${fixes.length} fields to normalize for strategy ${sid}:`);
    for (const f of fixes) {
      console.log(`- Pillar ${f.pillarKey} (id=${f.pillarId}) field='${f.field}' — old=${typeof f.old} => new=${Array.isArray(f.newVal) ? 'array('+String((f.newVal as any).length)+')' : typeof f.newVal}`);
    }

    if (apply) {
      const { writePillar } = await import("../src/server/services/pillar-gateway");
      for (const f of fixes) {
        try {
          console.log(`Applying fix to pillar ${f.pillarKey} field ${f.field}...`);
          await writePillar({
            strategyId: sid,
            pillarKey: f.pillarKey as any,
            operation: { type: "SET_FIELDS", fields: [{ path: f.field, value: f.newVal }] },
            author: { system: "AUTO_FILLER", reason: "fix-pillars: normalize array fields" },
            options: { confidenceDelta: 0.01 },
          } as any);
          console.log(`✔ Applied`);
        } catch (err) {
          console.error(`Failed to apply fix to pillar ${f.pillarKey} field ${f.field}:`, err instanceof Error ? err.message : String(err));
        }
      }
    } else {
      console.log('Dry-run for this strategy (no DB writes).');
    }
  }

  console.log('\nScan complete.');
  await db.$disconnect();
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
