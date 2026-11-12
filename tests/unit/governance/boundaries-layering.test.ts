/**
 * Anti-drift — garde de couches ESLint (`boundaries/dependencies`).
 *
 * # Le trou que ce test verrouille
 *
 * La règle de couches d'eslint.config.mjs était INERTE (constat du lot 556) :
 * sans `import/resolver`, eslint-plugin-boundaries retombait sur le résolveur
 * `node`, qui ne connaît ni `.ts`/`.tsx` ni l'alias `@/*`. Aucun import n'était
 * résolu, donc aucune dépendance n'était classée, et le lint restait vert quoi
 * qu'on importe. Le résolveur local (eslint-plugin-lafusee/import-resolver.js)
 * rétablit la résolution ; ce test empêche la garde de redevenir muette :
 *
 *   1. Des sondes (domain → lib, lib → governance, services → trpc,
 *      components → services, app → services, en alias comme en relatif, en
 *      import de valeur, de type ou dynamique) DOIVENT lever une erreur, avec la
 *      vraie configuration du dépôt. Des imports conformes ne lèvent rien.
 *   2. Le résolveur résout alias, relatifs, `index.*`, `./x.js` → `./x.ts`.
 *   3. La liste d'exceptions (violations préexistantes) ne peut que décroître :
 *      chaque entrée correspond encore à une violation réelle (sinon : la
 *      retirer), le nombre d'entrées est égal au plafond (l'abaisser, jamais le
 *      relever), et une exception n'ouvre ni un autre fichier ni une autre
 *      couche cible.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const CONFIG = path.join(ROOT, "eslint.config.mjs");
const TSCONFIG = path.join(ROOT, "tsconfig.json");
const RULE = "boundaries/dependencies";

const requireCjs = createRequire(import.meta.url);
const layering = requireCjs(path.join(ROOT, "eslint-plugin-lafusee/boundaries-layering.js")) as {
  LAYER_ELEMENTS: Array<{ type: string; pattern: string }>;
  layerOf: (file: string) => string | null;
  boundariesDependenciesOptions: (opts?: { allowlist?: boolean }) => unknown;
};
const allowlist = requireCjs(path.join(ROOT, "eslint-plugin-lafusee/boundaries-allowlist.js")) as {
  REASONS: Record<string, string>;
  ENTRIES: Array<{ file: string; to: string; reason: string }>;
};
const resolver = requireCjs(path.join(ROOT, "eslint-plugin-lafusee/import-resolver.js")) as {
  interfaceVersion: number;
  resolve: (source: string, file: string, config?: { project?: string }) => { found: boolean; path?: string | null };
};

/**
 * Plafond de la liste d'exceptions (recensement du 12 novembre 2026 : 149
 * couples fichier → couche, 374 imports). Ne JAMAIS le relever : corriger la
 * violation. Quand une entrée part, abaisser ce nombre du même montant.
 */
const ALLOWLIST_CEILING = 149;

/** Configuration réelle du dépôt (avec exceptions). */
const realLint = new ESLint({ cwd: ROOT, overrideConfigFile: CONFIG });
/** Même configuration, politiques de base seules (sans exceptions). */
const bareLint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: CONFIG,
  overrideConfig: {
    files: ["src/**/*.{ts,tsx,js,mjs}"],
    rules: { [RULE]: ["error", layering.boundariesDependenciesOptions({ allowlist: false })] },
  },
});

async function boundaryErrors(eslint: ESLint, file: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  return (result?.messages ?? []).filter((m) => m.ruleId === RULE || m.message.startsWith("Resolve error"));
}

describe("garde de couches — les sondes sont refusées (la règle n'est pas inerte)", () => {
  const probes: Array<{ name: string; file: string; code: string }> = [
    { name: "domain → lib (alias)", file: "src/domain/__boundary-probe__.ts", code: `import { db } from "@/lib/db";\nexport const p = db;\n` },
    { name: "domain → lib (relatif)", file: "src/domain/__boundary-probe__.ts", code: `import { db } from "../lib/db";\nexport const p = db;\n` },
    { name: "domain → lib (relatif .js écrit pour .ts)", file: "src/domain/__boundary-probe__.ts", code: `import { db } from "../lib/db.js";\nexport const p = db;\n` },
    { name: "lib → governance", file: "src/lib/__boundary-probe__.ts", code: `import { BRAINS } from "@/server/governance/manifest";\nexport const p = BRAINS;\n` },
    { name: "lib → services (import dynamique)", file: "src/lib/__boundary-probe__.ts", code: `export const p = () => import("@/server/services/mfa");\n` },
    { name: "services → trpc", file: "src/server/services/__boundary-probe__.ts", code: `import { appRouter } from "@/server/trpc/router";\nexport const p = appRouter;\n` },
    { name: "components → services", file: "src/components/__boundary-probe__.tsx", code: `import * as s from "@/server/services/mestor/intents";\nexport const p = s;\n` },
    { name: "components → services (import de type seul)", file: "src/components/__boundary-probe__.tsx", code: `import type { Intent } from "@/server/services/mestor/intents";\nexport type P = Intent;\n` },
    { name: "app → services", file: "src/app/__boundary-probe__/page.tsx", code: `import * as s from "@/server/services/mestor/intents";\nexport const p = s;\n` },
    { name: "app → governance (relatif)", file: "src/app/__boundary-probe__/page.tsx", code: `import { BRAINS } from "../../server/governance/manifest";\nexport const p = BRAINS;\n` },
  ];

  for (const probe of probes) {
    it(`${probe.name} → erreur`, async () => {
      const messages = await boundaryErrors(realLint, probe.file, probe.code);
      expect(messages.map((m) => m.message)).not.toContainEqual(expect.stringMatching(/^Resolve error/));
      expect(messages.length).toBe(1);
      expect(messages[0]!.ruleId).toBe(RULE);
      expect(messages[0]!.severity).toBe(2);
    });
  }

  const allowed: Array<{ name: string; file: string; code: string }> = [
    { name: "services → domain", file: "src/server/services/__boundary-probe__.ts", code: `import { BRAND_TIERS } from "@/domain/brand-tier";\nexport const p = BRAND_TIERS;\n` },
    { name: "trpc → services", file: "src/server/trpc/__boundary-probe__.ts", code: `import * as s from "@/server/services/mestor/intents";\nexport const p = s;\n` },
    { name: "components → primitives", file: "src/components/cockpit/__boundary-probe__.tsx", code: `import { Button } from "@/components/primitives";\nexport const p = Button;\n` },
    { name: "app → client tRPC (lib)", file: "src/app/__boundary-probe__/page.tsx", code: `import { trpc } from "@/lib/trpc/client";\nexport const p = trpc;\n` },
  ];

  for (const probe of allowed) {
    it(`${probe.name} → aucune erreur`, async () => {
      expect(await boundaryErrors(realLint, probe.file, probe.code)).toEqual([]);
    });
  }
});

describe("résolveur d'imports (interface v2 d'eslint-module-utils)", () => {
  const from = path.join(ROOT, "src/components/cockpit/__resolver-probe__.tsx");
  const resolve = (source: string) => resolver.resolve(source, from, { project: TSCONFIG });

  it("déclare l'interface v2", () => {
    expect(resolver.interfaceVersion).toBe(2);
  });
  it("résout l'alias @/* de tsconfig.json vers un fichier .ts", () => {
    expect(resolve("@/domain/brand-tier")).toEqual({ found: true, path: path.join(ROOT, "src/domain/brand-tier.ts") });
  });
  it("résout un dossier vers son index", () => {
    expect(resolve("@/components/primitives")).toEqual({ found: true, path: path.join(ROOT, "src/components/primitives/index.ts") });
  });
  it("résout un chemin relatif et `./x.js` écrit pour `./x.ts`", () => {
    expect(resolve("../../lib/db")).toEqual({ found: true, path: path.join(ROOT, "src/lib/db.ts") });
    expect(resolve("../../lib/db.js")).toEqual({ found: true, path: path.join(ROOT, "src/lib/db.ts") });
  });
  it("laisse les paquets au résolveur suivant et ne fabrique rien pour un chemin absent", () => {
    expect(resolve("react")).toEqual({ found: false });
    expect(resolve("@/lib/__absent__/nothing")).toEqual({ found: false });
  });
});

describe("exceptions — la liste ne peut que décroître", () => {
  const layerTypes = new Set(layering.LAYER_ELEMENTS.map((e) => e.type));

  it(`compte exactement le plafond (${ALLOWLIST_CEILING})`, () => {
    expect(
      allowlist.ENTRIES.length,
      "Le nombre d'exceptions a changé : s'il a baissé, abaisser ALLOWLIST_CEILING ; ne jamais ajouter d'exception, corriger la violation.",
    ).toBe(ALLOWLIST_CEILING);
  });

  it("chaque entrée est bien formée : fichier existant, couches connues, motif documenté, pas de doublon", () => {
    const seen = new Set<string>();
    for (const entry of allowlist.ENTRIES) {
      const key = `${entry.file} → ${entry.to}`;
      expect(seen.has(key), `doublon : ${key}`).toBe(false);
      seen.add(key);
      expect(existsSync(path.join(ROOT, entry.file)), `fichier absent : ${entry.file}`).toBe(true);
      const from = layering.layerOf(entry.file);
      expect(from, `hors couche : ${entry.file}`).not.toBeNull();
      expect(layerTypes.has(entry.to), `couche cible inconnue : ${key}`).toBe(true);
      expect(entry.to, `exception interne à une couche : ${key}`).not.toBe(from);
      expect(allowlist.REASONS[entry.reason], `motif non documenté : ${key} (${entry.reason})`).toBeTruthy();
    }
  });

  it("chaque entrée correspond encore à une violation réelle, et chaque violation de ces fichiers est listée", async () => {
    const files = [...new Set(allowlist.ENTRIES.map((e) => e.file))];
    const results = await bareLint.lintFiles(files.map((f) => path.join(ROOT, f)));
    const actual = new Set<string>();
    for (const result of results) {
      const file = path.relative(ROOT, result.filePath);
      const lines = readFileSync(result.filePath, "utf8").split("\n");
      for (const m of result.messages) {
        expect(m.message.startsWith("Resolve error"), `${file}: ${m.message}`).toBe(false);
        if (m.ruleId !== RULE) continue;
        // Couche cible recalculée depuis l'import rapporté, sans dépendre du
        // libellé du message du plugin.
        const source = lines[m.line - 1]!.slice(m.column - 1).match(/^["'`]([^"'`]+)["'`]/)?.[1];
        expect(source, `${file}:${m.line} — spécifiant introuvable`).toBeTruthy();
        const resolved = resolver.resolve(source!, result.filePath, { project: TSCONFIG });
        expect(resolved.found, `${file}:${m.line} — ${source} non résolu`).toBe(true);
        const to = layering.layerOf(path.relative(ROOT, resolved.path!));
        actual.add(`${file} → ${to}`);
      }
    }
    const listed = new Set(allowlist.ENTRIES.map((e) => `${e.file} → ${e.to}`));
    const stale = [...listed].filter((k) => !actual.has(k));
    const unlisted = [...actual].filter((k) => !listed.has(k));
    expect(stale, "Exceptions périmées (violation corrigée) : retirer ces entrées et abaisser le plafond").toEqual([]);
    expect(unlisted, "Violations non listées dans ces fichiers : les corriger").toEqual([]);
  }, 180_000);

  it("une exception n'ouvre ni une autre couche cible ni un fichier voisin", async () => {
    const entry = allowlist.ENTRIES.find((e) => e.file === "src/app/api/chat/route.ts" && e.to === "services");
    expect(entry, "fixture : src/app/api/chat/route.ts → services doit rester listé pour ce contrôle").toBeTruthy();
    expect(allowlist.ENTRIES.some((e) => e.file === "src/app/api/chat/route.ts" && e.to === "governance")).toBe(false);

    const toServices = `import * as s from "@/server/services/mestor/intents";\nexport const p = s;\n`;
    const toGovernance = `import { BRAINS } from "@/server/governance/manifest";\nexport const p = BRAINS;\n`;
    expect(await boundaryErrors(realLint, "src/app/api/chat/route.ts", toServices)).toEqual([]);
    expect(await boundaryErrors(realLint, "src/app/api/chat/route.ts", toGovernance)).toHaveLength(1);
    expect(await boundaryErrors(realLint, "src/app/api/chat/__boundary-probe__/route.ts", toServices)).toHaveLength(1);
  });

  it("les chemins Next.js à crochets et parenthèses sont lus littéralement", async () => {
    const entry = allowlist.ENTRIES.find(
      (e) => /\[[a-z]+\]/.test(e.file) && /\([a-z-]+\)/.test(e.file) && e.to === "services",
    );
    expect(entry).toBeTruthy();
    const code = `import * as s from "@/server/services/mestor/intents";\nexport const p = s;\n`;
    expect(await boundaryErrors(realLint, entry!.file, code)).toEqual([]);
    // Lu comme un glob non échappé, `(groupe)` vaudrait « groupe » et `[token]`
    // un seul caractère parmi t/o/k/e/n : ce voisin serait couvert à tort.
    const sibling = entry!.file
      .replace(/\(([a-z-]+)\)/, "$1")
      .replace(/\[([a-z]+)\]/, (_match, inner: string) => inner[0]!);
    expect(sibling).not.toBe(entry!.file);
    expect(await boundaryErrors(realLint, sibling, code)).toHaveLength(1);
  });
});
