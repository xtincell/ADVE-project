/**
 * Anti-drift HARD — le verdict de la gateway pilier ne se jette pas.
 *
 * `writePillar` / `writePillarAndScore` renvoient `{ success, error, warnings }`
 * et refusent pour CINQ raisons : pilier LOCKED, validation stricte (ADR-0063),
 * SHAPE gate, garde de provenance, et un catch-all sur toute exception de
 * transaction. Dans chacune, **rien n'est écrit**.
 *
 * Le remplisseur automatique appelait `await writePillarAndScore({...})` en
 * position d'instruction — valeur de retour à la poubelle — puis ré-évaluait
 * `content`, l'objet EN MÉMOIRE portant les valeurs qu'il venait justement de
 * ne pas persister. Il rapportait donc « N champs remplis, pilier COMPLET »
 * pendant que la base n'avait pas bougé. C'est le symptôme rapporté par
 * l'opérateur (« l'IA remplit, le score ne monte jamais »), et c'est un succès
 * menteur.
 *
 * Le repo n'a pas d'équivalent de `#[must_use]` : TypeScript ne peut pas
 * refuser qu'on ignore une valeur de retour. Ce test tient ce rôle. Il vise la
 * FAMILLE — tout appel en position d'instruction est refusé — avec une
 * allowlist explicite, décroissante, où chaque entrée porte SA raison.
 * L'inscrire sur la liste est un acte conscient ; l'oublier est impossible.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/**
 * Sites qui ignorent encore le verdict, avec leur justification.
 *
 * Règle : cette liste ne grandit pas. Un ajout doit être argumenté dans la PR
 * — et l'argument « c'est du best-effort » n'en est un que si l'appelant n'a
 * AUCUNE surface qui rapporte un succès à un humain.
 */
const ALLOWLIST: Record<string, string> = {
  "server/services/utils/migrate-strategy-to-pillars.ts":
    "script de migration one-shot : sortie console, aucun succès rapporté à une UI",
  "server/services/boot-sequence/index.ts":
    "amorçage : un pilier refusé est re-tenté au boot suivant, aucun succès affiché",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * `await writePillar…(` en début d'instruction — donc sans affectation, sans
 * `return`, sans `?.success`. C'est exactement la forme qui jette le verdict.
 */
const BARE_AWAIT = /(^|[;{}]|\)\s*=>)\s*(?:\/\/[^\n]*\n\s*)*await\s+(writePillarAndScore|writePillar)\s*\(/;

function bareCallLines(source: string): { line: number; fn: string }[] {
  const hits: { line: number; fn: string }[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("//")) continue; // commentaire/JSDoc
    const m = /^await\s+(writePillarAndScore|writePillar)\s*\(/.exec(trimmed);
    if (m) hits.push({ line: i + 1, fn: m[1]! });
  }
  return hits;
}

describe("HARD — aucune écriture pilier n'ignore le verdict de la gateway", () => {
  const files = walk(SRC);

  it("trouve bien les sources à scanner (garde anti-scan-vide)", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("les appels en position d'instruction sont soit corrigés, soit sur la liste", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.replace(`${SRC}/`, "");
      if (ALLOWLIST[rel]) continue;
      const src = readFileSync(file, "utf8");
      for (const hit of bareCallLines(src)) {
        offenders.push(`${rel}:${hit.line} — ${hit.fn} appelé sans lire son verdict`);
      }
    }
    expect(
      offenders,
      `${offenders.length} écriture(s) pilier jettent le verdict de la gateway.\n` +
        `Corrige (lis \`.success\`) ou inscris le site à ALLOWLIST avec sa raison.\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("l'allowlist ne contient que des chemins réels (pas d'entrée fantôme)", () => {
    // Une entrée périmée masquerait un fichier renommé — donc un site
    // redevenu muet sans que personne ne le voie.
    for (const rel of Object.keys(ALLOWLIST)) {
      const full = join(SRC, rel);
      expect(() => readFileSync(full, "utf8"), `${rel} n'existe plus`).not.toThrow();
    }
  });

  it("la regex de détection reconnaît bien la forme fautive", () => {
    // Sans cette garde, une regex cassée rendrait la suite verte à vide.
    expect(bareCallLines("  await writePillarAndScore({\n")).toHaveLength(1);
    expect(bareCallLines("  const r = await writePillarAndScore({\n")).toHaveLength(0);
    expect(bareCallLines("  return await writePillar({\n")).toHaveLength(0);
    expect(bareCallLines(" * await writePillarAndScore(...) — exemple en JSDoc\n")).toHaveLength(0);
    expect(BARE_AWAIT.test("; await writePillar(")).toBe(true);
  });
});

describe("le remplisseur rapporte honnêtement ce qui a été persisté", () => {
  const filler = readFileSync(
    join(SRC, "server", "services", "pillar-maturity", "auto-filler.ts"),
    "utf8",
  );

  it("lit le verdict de la gateway", () => {
    expect(filler).toMatch(/const write = await writePillarAndScore\(/);
    expect(filler).toMatch(/if \(!write\.success\)/);
  });

  it("ne revendique aucun champ rempli quand l'écriture est refusée", () => {
    const refusal = filler.slice(filler.indexOf("if (!write.success)"));
    const block = refusal.slice(0, refusal.indexOf("// Sur succès"));
    expect(block).toMatch(/persisted: false/);
    expect(block).toMatch(/filled: \[\]/);
  });

  it("expose la raison de la gateway, pas un pourcentage muet", () => {
    expect(filler).toMatch(/write\.error/);
    expect(filler).toMatch(/write\.warnings/);
  });

  it("le type de résultat porte le drapeau de persistance", () => {
    const types = readFileSync(join(SRC, "lib", "types", "pillar-maturity.ts"), "utf8");
    expect(types).toMatch(/persisted\?: boolean/);
  });

  it("l'écran pilier distingue « rien à faire » de « refusé »", () => {
    const page = readFileSync(join(SRC, "components", "cockpit", "pillar-page.tsx"), "utf8");
    expect(page).toMatch(/readWriteRefusal/);
    expect(page).toMatch(/data\?\.persisted !== false/);
    // Un refus est une ERREUR, jamais un simple avertissement.
    expect(page).toMatch(/setEnrichResult\(\{ type: "error", message: refusal \}\)/);
  });
});
