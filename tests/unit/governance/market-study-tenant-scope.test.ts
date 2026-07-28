/**
 * Anti-drift HARD — les études de marché d'un client ne fuitent pas chez un autre.
 *
 * Constaté en prod le 2026-07-28 : le cockpit SPAWT affichait, sous « Vos études
 * ingérées », des études « Ciment » et « La passion pour propulseur » déposées
 * pour d'AUTRES marques. Deux défauts cumulés :
 *
 *  1. le persister recevait `strategyId` (validé comme appartenant à l'appelant)
 *     et ne l'écrivait NULLE PART — la marque d'origine était perdue ;
 *  2. `list` et `getDetail` étaient des `protectedProcedure` sans aucun scope :
 *     la première rendait les titres de toutes les études de la base, la seconde
 *     l'EXTRACTION COMPLÈTE de n'importe laquelle, à tout compte authentifié.
 *
 * La justification historique (« pool marché global ») vaut pour la connaissance
 * sectorielle DÉRIVÉE, pas pour le document déposé par un client.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const ROUTER = readFileSync(join(ROOT, "src/server/trpc/routers/market-study-ingestion.ts"), "utf8");
const PERSISTER = readFileSync(
  join(ROOT, "src/server/services/seshat/market-study-ingestion/persister.ts"),
  "utf8",
);
const SCHEMA = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");

describe("l'origine d'une étude est persistée", () => {
  it("le modèle porte la marque d'origine", () => {
    expect(SCHEMA).toMatch(/originStrategyId\s+String\?/);
  });

  it("le persister l'écrit — il ne se contente plus de la recevoir", () => {
    expect(PERSISTER).toMatch(/originStrategyId:\s*opts\.strategyId/);
  });
});

describe("la lecture est scopée", () => {
  it("`list` filtre sur les marques accessibles à l'appelant", () => {
    // Bornes sur les DÉCLARATIONS de procédure : « getDetail: » figure aussi
    // dans l'en-tête du fichier, un `indexOf` naïf découpait à vide.
    const list = ROUTER.slice(
      ROUTER.indexOf("list: protectedProcedure"),
      ROUTER.indexOf("getDetail: protectedProcedure"),
    );
    expect(list.length).toBeGreaterThan(100);
    expect(list).toMatch(/accessibleStrategyIds/);
    expect(list).toMatch(/originStrategyId/);
  });

  it("`getDetail` refuse une étude hors périmètre", () => {
    const detail = ROUTER.slice(ROUTER.indexOf("getDetail: protectedProcedure"));
    expect(detail.length).toBeGreaterThan(100);
    expect(detail).toMatch(/accessibleStrategyIds/);
    // Refus indiscernable d'une absence : ne pas confirmer l'existence d'un
    // document qu'on n'a pas le droit de lire.
    expect(detail).toMatch(/Market study not found/);
  });

  it("l'export PDF est gardé aussi — c'est l'étude entière", () => {
    const exp = ROUTER.slice(ROUTER.indexOf("exportResearchPdf: protectedProcedure"));
    expect(exp.length).toBeGreaterThan(100);
    expect(exp).toMatch(/accessibleStrategyIds/);
  });

  it("les deux entrées « SAFE_BY_DESIGN » ont été purgées", () => {
    // Elles déclaraient ces procédures sûres par conception, au motif d'une
    // « intelligence sectorielle globale ». C'était faux.
    const allow = readFileSync(
      join(ROOT, "tests/unit/governance/entity-id-idor-proactive.test.ts"),
      "utf8",
    );
    expect(allow).not.toMatch(/"market-study-ingestion\.ts:getDetail":/);
    expect(allow).not.toMatch(/"market-study-ingestion\.ts:exportResearchPdf":/);
  });

  it("aucune lecture d'étude ne reste sans garde", () => {
    // Toute requête `knowledgeEntry.findMany` sur MARKET_STUDY_RAW dans ce
    // routeur doit être précédée d'une résolution de périmètre.
    const reads = ROUTER.split("knowledgeEntry.find").length - 1;
    const guards = ROUTER.split("accessibleStrategyIds(").length - 1;
    expect(guards).toBeGreaterThanOrEqual(3);
    expect(reads).toBeGreaterThan(0);
  });
});
