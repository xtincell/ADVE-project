/**
 * F-Y — web-push optional + db:diag script anti-drift
 *
 * Verrouille deux invariants ops post-Phase 21 :
 *
 * 1. `web-push` reste optionnel — pattern try/catch dans `web-push.ts`
 *    intact + déclaration dans `optionalDependencies` package.json +
 *    `serverExternalPackages` dans next.config.ts.
 *
 * 2. Script `npm run db:diag` existe et appelle `scripts/diagnose-db.ts`
 *    qui couvre les checks DATABASE_URL → connexion → tables → migrations.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const NEXT_CONFIG = path.join(ROOT, "next.config.ts");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const WEB_PUSH = path.join(ROOT, "src/server/services/anubis/providers/web-push.ts");
const DIAG_SCRIPT = path.join(ROOT, "scripts/diagnose-db.ts");

describe("F-Y — web-push module optional", () => {
  it("next.config.ts declares serverExternalPackages with web-push", () => {
    const src = fs.readFileSync(NEXT_CONFIG, "utf8");
    expect(src).toContain("serverExternalPackages");
    expect(src).toMatch(/serverExternalPackages\s*:\s*\[\s*"web-push"/);
  });

  it("package.json declares web-push (in dependencies OR optionalDependencies)", () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const inDeps = pkg.dependencies?.["web-push"];
    const inOptional = pkg.optionalDependencies?.["web-push"];
    // Phase 21 F-Z — Option A : web-push installé en dependency (vrai install).
    // Le test reste tolérant à optionalDependencies pour faciliter le rollback
    // sans casser la CI.
    const declared = inDeps ?? inOptional;
    expect(declared, "web-push doit être déclaré dans package.json (dependencies ou optionalDependencies)").toBeDefined();
    expect(declared).toMatch(/^\^?\d+\.\d+\.\d+/);
  });

  it("web-push.ts preserves the try/catch optional import pattern", () => {
    const src = fs.readFileSync(WEB_PUSH, "utf8");
    // Pattern try { await import("web-push") } catch { ... } MUST stay intact
    // pour que le runtime ne casse pas si le module n'est pas installé.
    expect(src).toMatch(/try\s*\{[\s\S]*?await\s+import\(\s*["']web-push["']\s*\)/);
    expect(src).toMatch(/\}\s*catch/);
    // Le commentaire ts-expect-error doit rester pour signaler l'intention.
    expect(src).toContain("optional runtime dep");
  });

  it("web-push.ts is the ONLY file importing web-push", () => {
    // Garde-fou : si un futur dev fait `import webpush from "web-push"`
    // ailleurs (sans try/catch), le runtime cassera quand le module manque.
    const srcRoot = path.join(ROOT, "src");
    const offenders = grepFiles(srcRoot, /from\s+["']web-push["']|require\(\s*["']web-push["']\s*\)/);
    const allowed = offenders.filter((f) => f === WEB_PUSH);
    const others = offenders.filter((f) => f !== WEB_PUSH);
    expect(allowed.length).toBe(0); // No static `import from "web-push"` even in web-push.ts
    expect(others, `Imports statiques web-push hors du provider canonique : ${others.join(", ")}`).toEqual([]);
  });
});

describe("F-Y — db:diag script", () => {
  it("scripts/diagnose-db.ts exists at canonical path", () => {
    expect(fs.existsSync(DIAG_SCRIPT)).toBe(true);
  });

  it("npm script db:diag wired to scripts/diagnose-db.ts", () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["db:diag"]).toBeDefined();
    expect(pkg.scripts["db:diag"]).toContain("scripts/diagnose-db.ts");
  });

  it("script runs all 5 cascade checks (DATABASE_URL → parse → connect → tables → migrations)", () => {
    const src = fs.readFileSync(DIAG_SCRIPT, "utf8");
    expect(src).toContain("DATABASE_URL");
    expect(src).toContain("DATABASE_URL parse");
    expect(src).toContain("Connexion Postgres ouverte");
    expect(src).toContain("Tables critiques");
    expect(src).toMatch(/Migrations.*pending/i);
  });

  it("script redacts credentials in logs (no password leak)", () => {
    const src = fs.readFileSync(DIAG_SCRIPT, "utf8");
    // La fonction redact() doit exister + être appliquée à dbUrl.
    expect(src).toContain("function redact");
    expect(src).toContain("redact(dbUrl)");
    // Le pattern de redact masque le password (la replacement string contient $1:***@).
    expect(src).toContain("$1:***@");
  });

  it("script is read-only (no DB mutation)", () => {
    const src = fs.readFileSync(DIAG_SCRIPT, "utf8");
    // Aucun INSERT/UPDATE/DELETE/CREATE/DROP/ALTER/GRANT en SQL côté script.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toMatch(/\$queryRawUnsafe[^;]+\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|GRANT)\b/i);
  });

  it("script has 5 critical tables in its probe list", () => {
    const src = fs.readFileSync(DIAG_SCRIPT, "utf8");
    // Le user demandait spécifiquement à voir si ErrorEvent / Strategy / OracleSection sont accessibles.
    for (const tbl of ["Strategy", "Pillar", "ErrorEvent", "OracleSection", "Notification", "User"]) {
      expect(src).toContain(`"${tbl}"`);
    }
  });
});

// ── helpers ───────────────────────────────────────────────────────────

function grepFiles(dir: string, regex: RegExp): string[] {
  const matches: string[] = [];
  walk(dir, (file) => {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return;
    const src = fs.readFileSync(file, "utf8");
    // Strip block + line comments to ignore mentions in docs.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    if (regex.test(codeOnly)) matches.push(file);
  });
  return matches;
}

function walk(dir: string, cb: (file: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.isFile()) cb(full);
  }
}
