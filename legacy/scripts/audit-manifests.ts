/**
 * scripts/audit-manifests.ts — Runtime manifest audit.
 *
 * Run: `npm run manifests:audit`.
 *
 * Imports the registry and reports:
 *   - duplicate intent kinds
 *   - dangling dependencies
 *   - missing services (any directory under src/server/services/ without
 *     manifest.ts gets a warning).
 */

import { auditManifests, getAllManifests } from "@/server/governance/registry";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const audit = auditManifests();
  console.log(`Manifests registered: ${audit.count}`);

  const services = await fs.readdir(
    path.join(ROOT, "src", "server", "services"),
    { withFileTypes: true },
  );
  const expected = services
    .filter((e) => e.isDirectory() && !/\s\d+$/.test(e.name))
    .map((e) => e.name);
  const have = new Set(getAllManifests().map((m) => m.service));
  const missing = expected.filter((s) => !have.has(s));

  if (missing.length > 0) {
    console.log(
      `\n[warn] services without manifest.ts (${missing.length}):`,
    );
    for (const s of missing) console.log(`  - ${s}`);
  }

  if (audit.issues.length > 0) {
    console.log("\n[error] manifest issues:");
    for (const i of audit.issues) console.log(`  - ${i}`);
    process.exit(1);
  }
  if (!audit.ok) process.exit(1);

  console.log("\n✓ Manifest audit clean.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
