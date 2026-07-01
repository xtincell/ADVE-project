/**
 * scripts/scaffold-capability.ts — Scaffolds a new capability for a service.
 *
 * Usage:
 *   npm run manifests:scaffold -- --service=notoria --name=runDiagnostic
 *   npm run manifests:scaffold -- --service=my-tool --name=invoke --external-plugin --target=./plugins/my-tool
 *
 * Creates / patches:
 *   - <service>/manifest.ts: appends a capability stub
 *   - <service>/<name>.ts: stub implementation
 *   - tests/unit/<service>/<name>.test.ts: placeholder
 *
 * After scaffolding, run `npm run manifests:gen` to refresh the registry.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface Args {
  service?: string;
  name?: string;
  externalPlugin?: boolean;
  target?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const a of argv) {
    if (a.startsWith("--service=")) out.service = a.slice("--service=".length);
    else if (a.startsWith("--name=")) out.name = a.slice("--name=".length);
    else if (a === "--external-plugin") out.externalPlugin = true;
    else if (a.startsWith("--target=")) out.target = a.slice("--target=".length);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.service || !args.name) {
    console.error(
      "Usage: scaffold-capability --service=<slug> --name=<camelCase> [--external-plugin --target=./plugins/x]",
    );
    process.exit(1);
  }

  const baseDir = args.externalPlugin
    ? path.resolve(ROOT, args.target ?? `./plugins/${args.service}`)
    : path.join(ROOT, "src", "server", "services", args.service);
  const manifestPath = path.join(baseDir, "manifest.ts");
  const implPath = path.join(baseDir, `${args.name}.ts`);
  const testPath = path.join(
    ROOT,
    "tests",
    "unit",
    args.service,
    `${args.name}.test.ts`,
  );

  await fs.mkdir(baseDir, { recursive: true });
  await fs.mkdir(path.dirname(testPath), { recursive: true });

  if (args.externalPlugin) {
    const pkg = path.join(baseDir, "package.json");
    try {
      await fs.access(pkg);
    } catch {
      await fs.writeFile(
        pkg,
        JSON.stringify(
          {
            name: `@plugin/${args.service}`,
            version: "0.1.0",
            private: true,
            dependencies: { "@lafusee/sdk": "^1.0.0", zod: "^3.0.0" },
          },
          null,
          2,
        ),
      );
    }
  }

  // Manifest stub (only if missing).
  try {
    await fs.access(manifestPath);
  } catch {
    const stub = `import { z } from "zod";\nimport { defineManifest } from "@/server/governance/manifest";\n\nexport const manifest = defineManifest({\n  service: "${args.service}",\n  governor: "INFRASTRUCTURE",\n  version: "0.1.0",\n  capabilities: [\n    {\n      name: "${args.name}",\n      inputSchema: z.object({}),\n      outputSchema: z.object({ ok: z.boolean() }),\n      sideEffects: [],\n    },\n  ],\n});\n`;
    await fs.writeFile(manifestPath, stub);
  }

  // Impl stub.
  try {
    await fs.access(implPath);
  } catch {
    const impl = `/**\n * ${args.service} — ${args.name}\n */\nexport async function ${args.name}(_input: unknown): Promise<{ ok: boolean }> {\n  // TODO: implement\n  return { ok: true };\n}\n`;
    await fs.writeFile(implPath, impl);
  }

  // Test placeholder.
  try {
    await fs.access(testPath);
  } catch {
    const test = `import { describe, it, expect } from "vitest";\nimport { ${args.name} } from "@/server/services/${args.service}/${args.name}";\n\ndescribe("${args.service}/${args.name}", () => {\n  it("returns ok for empty input", async () => {\n    const r = await ${args.name}({});\n    expect(r.ok).toBe(true);\n  });\n});\n`;
    await fs.writeFile(testPath, test);
  }

  console.log(`✓ Scaffold complete for ${args.service}.${args.name}`);
  console.log("  Next: edit the schemas, implement the function, then run:");
  console.log("    npm run manifests:gen");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
