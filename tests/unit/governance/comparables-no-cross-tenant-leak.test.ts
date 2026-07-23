/**
 * round-16b — `strategy.comparables` ne fuit PAS de donnée cross-tenant identifiante.
 *
 * NOUVELLE classe (que 15 rounds d'audit input-side n'ont pas attrapée) : la fuite
 * OUTPUT-side. Le garde d'entrée `assertStrategyRead` protège la marque INTERROGÉE
 * (possédée par le fondateur), PAS les marques PAIRES énumérées. `comparables` est
 * founder-facing (`protectedProcedure`) et énumère TOUTES les marques de la plateforme
 * (`findSimilarAcrossStrategies`, cross-tenant par nature — la proximité est cross-marque).
 * Il DOIT donc renvoyer un AGRÉGAT k-anonyme : jamais le `name` / `financialCapacity`
 * (budget) / `businessContext` d'une AUTRE marque (fuite cross-tenant catastrophique —
 * un fondateur verrait ses concurrents nommés + leurs budgets + leurs scores).
 *
 * Le détail nominatif reste réservé à la Mission Control opérateur (`seshat-search`,
 * `operatorProcedure`). Ce test fige l'agrégation anonyme du chemin founder.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..", "..", "src");

function comparablesBlock(): string {
  const text = readFileSync(join(SRC, "server/trpc/routers/strategy.ts"), "utf-8");
  const start = text.indexOf("comparables: protectedProcedure");
  if (start < 0) throw new Error("procédure `comparables` introuvable — a-t-elle été renommée ?");
  // Jusqu'à la procédure suivante (borne large).
  const next = text.indexOf("Procedure\n", start + 40);
  const end = text.indexOf(":", text.indexOf("\n", start + 2200));
  return text.slice(start, Math.max(end, start + 2200, next > 0 ? next : 0));
}

describe("round-16b — comparables agrégat k-anonyme (anti-fuite cross-tenant output-side)", () => {
  const block = comparablesBlock();

  it("le select des marques PAIRES ne contient QUE le score (jamais name/budget/context)", () => {
    // Le findMany des paires ne doit sélectionner que `advertis_vector` (score agrégé).
    expect(block).not.toMatch(/financialCapacity:\s*true/);
    expect(block).not.toMatch(/businessContext:\s*true/);
    expect(block, "aucun `name: true` dans le select des paires").not.toMatch(/\bname:\s*true/);
  });

  it("renvoie un AGRÉGAT (peerCount + medianComposite), jamais une ligne par-pair nommée/budgétée", () => {
    expect(block).toContain("peerCount");
    expect(block).toContain("medianComposite");
    // Pas de retour d'un nom / budget / id par pair.
    expect(block).not.toMatch(/name:\s*s\?\./);
    expect(block).not.toMatch(/financialCapacity:\s*s\?\./);
  });

  it("applique un seuil de k-anonymité (médiane masquée sous k pairs)", () => {
    expect(block).toMatch(/K_ANON|k-anon/i);
  });
});
