/**
 * Anti-drift — UNE MESURE = UN NOM = UN LECTEUR.
 *
 * La Fusée porte trois nombres légitimes et distincts (cf.
 * `src/domain/brand-scores.ts`) :
 *
 *   • complétude structurelle  → `Strategy.advertis_vector.composite`   /200
 *   • indice d'attachement     → `CultIndexSnapshot.compositeScore`     /100
 *   • force révélée            → `ScoreVerdict.force`                   /200
 *
 * Incident qui motive ce verrou (audit MCP 2026-07-27) : trois lecteurs
 * (`mcp/advertis` ×2, `campaign-canon`) lisaient `advertis_vector.compositeScore`
 * — le nom de la mesure d'ATTACHEMENT appliqué au vecteur de COMPLÉTUDE, où il
 * n'existe pas. Le scorer écrit `composite` (`advertis-scorer/index.ts`).
 * Conséquence : `compositeScore: null` servi à tout agent MCP et tier LATENT
 * systématique dans le cadrage de campagne, sur des marques que le cockpit
 * affichait à « 164/200 ».
 *
 * Mode HARD — aucune baseline. Trois invariants :
 *   1. La clé canon du vecteur est `composite` et le scorer l'écrit bien.
 *   2. Personne ne relit `.compositeScore` sur une valeur issue d'un
 *      `advertis_vector` — la lecture passe par `readCompositeFromVector`.
 *   3. Le palier ne se dérive plus par `classifyTier` direct dans les surfaces :
 *      `effectiveTier` (ADR-0167) est la porte, sinon le palier officiel posé
 *      par une transition gouvernée est ignoré en silence.
 *
 * Garde-fou de non-fusion (D9, ADR-0149) : `scoring.ts` reste intact — assuré
 * par `scoring-base-canon.test.ts`, pas ré-encodé ici.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ADVE_COMPOSITE_MAX,
  ADVE_VECTOR_COMPOSITE_KEY,
  CULT_INDEX_MAX,
  REVEALED_FORCE_MAX,
  describeScores,
  readCompositeFromVector,
} from "@/domain/brand-scores";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);

/** Fichiers autorisés à nommer la clé legacy : le module canon + le scorer. */
const COMPOSITE_KEY_ALLOWLIST = [
  join("src", "domain", "brand-scores.ts"),
];

describe("brand-scores — le canon des trois mesures", () => {
  it("nomme trois échelles distinctes et ne les confond pas", () => {
    expect(ADVE_COMPOSITE_MAX).toBe(200);
    expect(CULT_INDEX_MAX).toBe(100);
    expect(REVEALED_FORCE_MAX).toBe(200);
    expect(ADVE_VECTOR_COMPOSITE_KEY).toBe("composite");
  });

  it("lit le composite sous la clé canon `composite`", () => {
    expect(readCompositeFromVector({ composite: 164, confidence: 0.8 })).toBe(164);
  });

  it("rend `null` — jamais 0 — quand la mesure est absente ou malformée", () => {
    expect(readCompositeFromVector(null)).toBeNull();
    expect(readCompositeFromVector(undefined)).toBeNull();
    expect(readCompositeFromVector({})).toBeNull();
    expect(readCompositeFromVector({ composite: "164" })).toBeNull();
    expect(readCompositeFromVector({ composite: Number.NaN })).toBeNull();
    expect(readCompositeFromVector([1, 2, 3])).toBeNull();
  });

  it("ne fusionne jamais les trois mesures", () => {
    const t = describeScores({
      advertisVector: { composite: 164 },
      cultIndexScore: 42,
      revealedForce: { force: 106.8, theta: 1480, rd: 120, coveragePct: 60 },
    });
    expect(t.structurel.value).toBe(164);
    expect(t.attachement.value).toBe(42);
    expect(t.forceRevelee.value).toBe(106.8);
    // Trois lectures, trois plafonds, trois libellés — aucun total agrégé.
    expect(t.structurel.max).not.toBe(t.attachement.max);
    expect(new Set([t.structurel.label, t.attachement.label, t.forceRevelee.label]).size).toBe(3);
    expect(Object.keys(t)).toEqual(["structurel", "attachement", "forceRevelee"]);
  });

  it("dit « non mesuré » (null) pour chaque mesure manquante", () => {
    const t = describeScores({ advertisVector: {} });
    expect(t.structurel.value).toBeNull();
    expect(t.attachement.value).toBeNull();
    expect(t.forceRevelee.value).toBeNull();
    expect(t.forceRevelee.coveragePct).toBeNull();
  });

  it("est SERVI par une surface de production, pas seulement par ce test", () => {
    // Le canon a vécu un temps sans aucun appelant : chaque surface continuait
    // de servir « le score » comme un nombre unique — exactement la confusion
    // qu'il existe pour dissiper. Un canon que personne n'appelle n'est pas un
    // canon, c'est un fichier (relecture adversariale 2026-07-27).
    const card = readFileSync(join(SRC, "server", "mcp", "advertis", "index.ts"), "utf8");
    expect(card).toMatch(/describeScores\(\{/);
    expect(card).toMatch(/cultIndexScore:/);
    expect(card).toMatch(/revealedForce:/);
  });
});

describe("le vecteur ADVERTIS n'a qu'un seul lecteur", () => {
  it("le scorer écrit bien la clé canon `composite`", () => {
    const scorer = readFileSync(join(SRC, "server", "services", "advertis-scorer", "index.ts"), "utf8");
    expect(scorer).toMatch(/composite:\s*Math\.round/);
  });

  it("personne ne relit `.compositeScore` sur un advertis_vector", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = file.slice(ROOT.length + 1);
      if (COMPOSITE_KEY_ALLOWLIST.some((a) => rel.endsWith(a))) continue;
      const src = readFileSync(file, "utf8");
      // On ne cible QUE la confusion réelle : un `.compositeScore` lu dans un
      // voisinage qui parle du vecteur ADVERTIS. `CultIndexSnapshot.compositeScore`
      // est une colonne légitime et reste autorisée partout ailleurs.
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (!/\.compositeScore/.test(line)) return;
        const window = lines.slice(Math.max(0, i - 6), i + 2).join("\n");
        if (/advertis_vector|asRecord\(strategy|\bvec\b/.test(window)) {
          offenders.push(`${rel}:${i + 1}`);
        }
      });
    }
    expect(offenders, `Lire le composite via readCompositeFromVector (domain/brand-scores) :\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("le palier passe par effectiveTier", () => {
  it("les surfaces MCP ne dérivent plus le palier par classifyTier direct", () => {
    const mcpDir = join(SRC, "server", "mcp");
    const offenders = walk(mcpDir).filter((f) => /\bclassifyTier\s*\(/.test(readFileSync(f, "utf8")));
    expect(
      offenders.map((f) => f.slice(ROOT.length + 1)),
      "Utiliser effectiveTier({apogeeTier, composite}) — ADR-0167 : le palier officiel prime sur le dérivé.",
    ).toEqual([]);
  });
});
