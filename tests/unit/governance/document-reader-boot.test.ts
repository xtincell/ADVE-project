/** Exercise the actual boot script with the format package omitted, as in standalone. */
import { expect, it } from "vitest";
import { buildSync } from "esbuild";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

it("boot publication capture does not initialize an unused PowerPoint reader", () => {
  const root = resolve(__dirname, "../../..");
  const fixture = mkdtempSync(join(tmpdir(), "document-boot-"));
  try {
    const bundle = join(fixture, "freeze.cjs"), guard = join(fixture, "guard.cjs");
    symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
    buildSync({ entryPoints: [join(root, "scripts/freeze-public-brands.ts")], bundle: true, platform: "node", packages: "external", format: "cjs", outfile: bundle, tsconfig: join(root, "tsconfig.json"), logLevel: "silent" });
    writeFileSync(guard, `
      const Module = require('node:module');
      const load = Module._load;
      Module._load = function(request, parent, isMain) {
        if (request === 'jszip' || request.startsWith('jszip/'))
          throw Object.assign(new Error("Cannot find module 'jszip'"), { code: 'MODULE_NOT_FOUND' });
        const value = load.call(this, request, parent, isMain);
        if (request === '@prisma/client') return { ...value, PrismaClient: class {
          strategy = { findMany: async () => [] };
          async $disconnect() {}
        } };
        return value;
      };
    `);
    // No real DB, secret, provider or published page enters this empty boot fixture.
    const result = spawnSync(process.execPath, ["--require", guard, bundle], { cwd: fixture, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", DATABASE_URL: "postgresql://stub:stub@localhost:5432/stub" } });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"observedPublicPagesCaptured":0');
    expect(result.stderr).not.toContain("Cannot find module 'jszip'");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
