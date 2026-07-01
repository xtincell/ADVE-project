import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { db } from "@/lib/db";
import { PILLAR_SCHEMAS, validatePillarContent, validatePillarPartial, type PillarKey } from "@/lib/types/pillar-schemas";
import { assessStrategy } from "@/server/services/pillar-maturity/assessor";
import { getContracts } from "@/server/services/pillar-maturity/contracts-loader";

async function main() {
  const pillars = await db.pillar.findMany({
    where: { strategyId: "spawt-strategy" },
    select: { key: true, content: true, confidence: true },
  });

  console.log("═══ FULL SEED VALIDATION: SPAWT ═══\n");

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const p of pillars.sort((a, b) => a.key.localeCompare(b.key))) {
    const key = p.key.toUpperCase() as PillarKey;
    const content = (p.content ?? {}) as Record<string, unknown>;

    console.log(`── PILLAR ${key} ──────────────────────────────────────────`);

    // 1. Full Zod schema validation
    const fullResult = validatePillarContent(key, content);
    if (fullResult.success) {
      console.log(`  [ZOD FULL]   ✓ Valid`);
    } else {
      console.log(`  [ZOD FULL]   ✕ ${fullResult.errors!.length} error(s):`);
      for (const err of fullResult.errors!) {
        console.log(`    → ${err.path || "(root)"}: ${err.message}`);
        totalErrors++;
      }
    }

    // 2. Partial Zod validation (what we actually enforce)
    const partialResult = validatePillarPartial(key, content);
    if (partialResult.success) {
      console.log(`  [ZOD PARTIAL] ✓ Valid (${partialResult.completionPercentage}% filled)`);
    } else {
      console.log(`  [ZOD PARTIAL] ✕ ${partialResult.errors!.length} error(s) in FILLED fields:`);
      for (const err of partialResult.errors!) {
        console.log(`    → ${err.path || "(root)"}: ${err.message}`);
        totalErrors++;
      }
    }

    // 3. List all top-level keys and their types
    const schema = PILLAR_SCHEMAS[key];
    const schemaKeys = Object.keys((schema as any).shape);
    const contentKeys = Object.keys(content);
    const extraKeys = contentKeys.filter(k => !schemaKeys.includes(k));
    const missingRequired: string[] = [];

    // Check which schema-required fields are missing
    for (const sk of schemaKeys) {
      const fieldSchema = (schema as any).shape[sk];
      const isOptional = fieldSchema?.isOptional?.() ?? fieldSchema?._def?.typeName === "ZodOptional";
      const value = content[sk];
      const isEmpty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

      if (!isOptional && isEmpty) {
        missingRequired.push(sk);
      }
    }

    if (missingRequired.length > 0) {
      console.log(`  [REQUIRED]   ✕ ${missingRequired.length} required field(s) missing:`);
      for (const f of missingRequired) {
        console.log(`    → ${f}`);
        totalWarnings++;
      }
    } else {
      console.log(`  [REQUIRED]   ✓ All required fields present`);
    }

    if (extraKeys.length > 0) {
      console.log(`  [EXTRA]      ⚠ ${extraKeys.length} field(s) not in schema (extension fields):`);
      for (const k of extraKeys) {
        const val = content[k];
        const type = Array.isArray(val) ? `array(${val.length})` : typeof val;
        console.log(`    → ${k}: ${type}`);
        totalWarnings++;
      }
    }

    // 4. Deep value audit: check for empty strings, null, empty arrays inside nested objects
    const emptyNested = findEmptyNested(content, "");
    if (emptyNested.length > 0) {
      console.log(`  [EMPTY]      ⚠ ${emptyNested.length} empty nested value(s):`);
      for (const path of emptyNested.slice(0, 10)) {
        console.log(`    → ${path}`);
        totalWarnings++;
      }
      if (emptyNested.length > 10) {
        console.log(`    → ... +${emptyNested.length - 10} more`);
      }
    } else {
      console.log(`  [EMPTY]      ✓ No empty nested values`);
    }

    console.log();
  }

  // 5. Maturity assessment
  console.log("── MATURITY CONTRACT ──────────────────────────────────────");
  const report = await assessStrategy("spawt-strategy");
  console.log(`  Overall: ${report.overallStage} | Glory: ${report.gloryReady} | Missing: ${report.totalMissing}`);
  for (const [key, a] of Object.entries(report.pillars)) {
    const icon = a.readyForGlory ? "✓" : "✕";
    console.log(`  ${icon} ${key.toUpperCase()}: ${a.currentStage} (${a.completionPct}%) ${a.missing.length > 0 ? "— missing: " + a.missing.join(", ") : ""}`);
  }

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);
  console.log(`Status: ${totalErrors === 0 ? "✓ SEED VALID" : "✕ SEED HAS ERRORS"}`);

  await db.$disconnect();
  process.exit(totalErrors > 0 ? 1 : 0);
}

function findEmptyNested(obj: unknown, prefix: string): string[] {
  const results: string[] = [];
  if (obj === null || obj === undefined) return [prefix || "(root)"];
  if (typeof obj === "string" && obj.trim() === "") return [prefix || "(root)"];
  if (Array.isArray(obj)) {
    if (obj.length === 0 && prefix) return [prefix];
    for (let i = 0; i < obj.length; i++) {
      results.push(...findEmptyNested(obj[i], `${prefix}[${i}]`));
    }
  } else if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === undefined) {
        results.push(path);
      } else if (typeof value === "string" && value.trim() === "") {
        results.push(path);
      } else if (Array.isArray(value) && value.length === 0) {
        results.push(path);
      } else if (typeof value === "object" && value !== null) {
        results.push(...findEmptyNested(value, path));
      }
    }
  }
  return results;
}

main().catch(e => { console.error(e); process.exit(1); });
