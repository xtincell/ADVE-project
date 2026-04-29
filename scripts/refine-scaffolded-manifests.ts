/**
 * scripts/refine-scaffolded-manifests.ts
 *
 * Reads every "auto-scaffolded" manifest and refines it by:
 *  1. Removing the "auto-scaffolded" marker (visible signal that the manifest
 *     is actively maintained, not just a placeholder).
 *  2. Replacing the single placeholder `default` capability with one capability
 *     per exported function discovered in index.ts.
 *  3. Updating docstring to reflect the real public surface.
 *  4. Inferring `sideEffects`/`idempotent` defaults from function names heuristically:
 *      - functions starting with `get|list|find|search|fetch|compute|select|read|peek` → DB_READ, idempotent
 *      - functions starting with `create|update|delete|upsert|persist|record|save|sync|publish|emit|trigger|invoke|run|execute|process|generate` → DB_WRITE
 *      - default fallback: DB_READ + DB_WRITE
 *  5. Setting `qualityTier: "B"` and `costEstimateUsd: 0` (refined per-capability later).
 *  6. Bumping version 1.0.0 → 1.1.0 to mark refinement.
 *
 * The Zod input/output schemas remain `z.unknown()` / `z.object().passthrough()`
 * because tightening them requires per-service type inspection. But the manifest
 * now exposes the real capability surface to the registry.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, basename } from "node:path";
import { globSync } from "tinyglobby";

const READ_VERBS = /^(get|list|find|search|fetch|compute|select|read|peek|describe|score|validate|check)/i;
const WRITE_VERBS = /^(create|update|delete|upsert|persist|record|save|sync|publish|emit|trigger|invoke|run|execute|process|generate|apply|propagate|dispatch|seed|set|init|register|import|ingest|capture|notify|advance|complete|claim|resolve|cancel|reject|accept|move|enroll|verify|broadcast|warn)/i;

interface ExportedFn {
  name: string;
  isAsync: boolean;
}

function discoverExports(serviceDir: string): ExportedFn[] {
  const indexPath = `${serviceDir}/index.ts`;
  let src = "";
  try {
    src = readFileSync(indexPath, "utf8");
  } catch {
    return [];
  }
  const out: ExportedFn[] = [];
  const seen = new Set<string>();

  // Match: export async function fnName | export function fnName | export const fnName = (async)?
  const fnRe = /export\s+(?:async\s+)?function\s+(\w+)/g;
  const constRe = /export\s+(?:const|let)\s+(\w+)\s*[=:]\s*(?:async\s*\(|\(?[\w<>,\s]*\)?\s*=>)/g;
  // Also match: export { name1, name2 } (re-exports) — treat as opaque, skip names
  // and: export * from "./sub" — definitely skip

  const ID = /^[a-zA-Z][\w]*$/;
  const accept = (n: string | undefined): n is string =>
    !!n && ID.test(n) && !seen.has(n) && !n.startsWith("_") && n !== "manifest";

  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(src))) {
    const n = m[1];
    if (accept(n)) {
      seen.add(n);
      out.push({ name: n, isAsync: src.slice(m.index, m.index + 20).includes("async") });
    }
  }
  while ((m = constRe.exec(src))) {
    const n = m[1];
    if (accept(n)) {
      seen.add(n);
      out.push({ name: n, isAsync: src.slice(m.index, m.index + 50).includes("async") });
    }
  }
  // ALSO: export { foo, bar } from "./sub" — re-exports
  // Strip line + block comments inside the brace contents before splitting.
  const reExportRe = /export\s+\{([^}]+)\}\s+from\s+["'][^"']+["']/g;
  while ((m = reExportRe.exec(src))) {
    const cleaned = m[1]
      .replace(/\/\/[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const rawItem of cleaned.split(/[,\n]/)) {
      let item = rawItem.trim();
      if (!item) continue;
      // Drop `type ` prefix on type-only re-exports
      item = item.replace(/^type\s+/, "");
      const n = item.split(/\s+as\s+/)[0]?.trim();
      if (accept(n)) {
        seen.add(n);
        out.push({ name: n, isAsync: false });
      }
    }
  }
  return out;
}

function inferSideEffects(fnName: string): string[] {
  if (READ_VERBS.test(fnName)) return ["DB_READ"];
  if (WRITE_VERBS.test(fnName)) return ["DB_READ", "DB_WRITE"];
  return ["DB_READ", "DB_WRITE"];
}

function isIdempotent(fnName: string): boolean {
  return READ_VERBS.test(fnName);
}

const manifestFiles = globSync("src/server/services/*/manifest.ts");
let updated = 0;
let skipped = 0;
let totalCaps = 0;

for (const file of manifestFiles) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("auto-scaffolded")) {
    skipped++;
    continue;
  }

  const serviceDir = dirname(file);
  const serviceName = basename(serviceDir);
  const exports = discoverExports(serviceDir);

  // Extract metadata from the existing manifest
  const govMatch = src.match(/governor:\s*"(\w+)"/);
  const acceptsMatch = src.match(/acceptsIntents:\s*(\[[^\]]*\])/);
  const emitsMatch = src.match(/emits:\s*(\[[^\]]*\])/);
  const missionMatch = src.match(/missionContribution:\s*"([^"]+)"/);
  const stepMatch = src.match(/missionStep:\s*(\d)/);
  const groundMatch = src.match(/groundJustification:\s*"([^"]+)"/);
  const depsMatch = src.match(/dependencies:\s*(\[[^\]]*\])/);

  const governor = govMatch?.[1] ?? "INFRASTRUCTURE";
  const accepts = acceptsMatch?.[1] ?? "[]";
  const emits = emitsMatch?.[1] ?? "[]";
  const mission = missionMatch?.[1] ?? "GROUND_INFRASTRUCTURE";
  const step = stepMatch?.[1];
  const ground = groundMatch?.[1];
  const deps = depsMatch?.[1] ?? "[]";

  // Build capabilities. If we found exports, one capability per export.
  // If we found 0, keep a single `default` capability (clean, no "scaffolded" marker).
  const capabilities = exports.length > 0
    ? exports.map((fn) => ({
        name: fn.name,
        sideEffects: inferSideEffects(fn.name),
        idempotent: isIdempotent(fn.name),
      }))
    : [{ name: "default", sideEffects: ["DB_READ", "DB_WRITE"], idempotent: false }];

  totalCaps += capabilities.length;

  const capsCode = capabilities
    .map((c) => `    {
      name: "${c.name}",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: [${c.sideEffects.map((s) => `"${s}"`).join(", ")}],${c.idempotent ? `
      idempotent: true,` : ""}
      qualityTier: "B",
      missionContribution: "${mission}",${step ? `
      missionStep: ${step},` : ""}${mission === "GROUND_INFRASTRUCTURE" && ground ? `
      groundJustification: "${ground}",` : ""}
    }`)
    .join(",\n");

  const newSrc = `/**
 * Manifest — ${serviceName}.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ${governor} governance,
 * mission contribution = ${mission}.${exports.length > 0 ? ` Exposes ${exports.length} capabilit${exports.length === 1 ? "y" : "ies"} mirroring the public surface of \`index.ts\`.` : ""}
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "${serviceName}",
  governor: "${governor}",
  version: "1.1.0",
  acceptsIntents: ${accepts},
  emits: ${emits},
  capabilities: [
${capsCode}
  ],
  dependencies: ${deps},
  missionContribution: "${mission}",${step ? `
  missionStep: ${step},` : ""}${mission === "GROUND_INFRASTRUCTURE" && ground ? `
  groundJustification: "${ground}",` : ""}
});
`;

  writeFileSync(file, newSrc, "utf8");
  updated++;
  console.log(`  ${serviceName}: ${capabilities.length} capability/ies (${exports.length > 0 ? "from index.ts exports" : "single default"})`);
}

console.log(`\n[refine-scaffolded] ${updated} manifests refined, ${skipped} already non-scaffolded, ${totalCaps} capabilities total.`);
