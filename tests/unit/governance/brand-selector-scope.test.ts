/**
 * Sélecteur de marque Cockpit — verrous anti-régression (fix 2026-07-11).
 *
 * Trois défauts constatés par l'opérateur (« sélections multiples, impossible
 * d'ouvrir, pas de lazy loading, quick intakes visibles ») + une fuite
 * cross-tenant découverte à l'inspection :
 *   1. `brandTreeForSelector` ne scopait PAS les BrandNodes pour un founder
 *      USER (filtre opérateur vide → arbre de marque de TOUS les clients
 *      exposé : noms de holdings/marques d'autres tenants).
 *   2. Les stratégies QUICK_INTAKE (leads non convertis, résolus côté
 *      Console) apparaissaient comme marques pilotables dans le Cockpit.
 *   3. L'arbre se chargeait à CHAQUE montage cockpit juste pour le label,
 *      et une erreur de query rendait le bouton muet (échec silencieux).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routerSrc = readFileSync("src/server/trpc/routers/strategy.ts", "utf8");
const selectorSrc = readFileSync("src/components/cockpit/strategy-selector.tsx", "utf8");
const contextSrc = readFileSync("src/components/cockpit/strategy-context.tsx", "utf8");

describe("brandTreeForSelector — scope tenant (fuite cross-tenant fermée)", () => {
  it("le chemin founder USER existe (nodes = SES stratégies + ancêtres, jamais tout)", () => {
    expect(routerSrc).toContain("MIROIR du scope stratégie");
    expect(routerSrc).toContain("strategyId: { in: ownStrategyIds }");
    // La clôture des ancêtres est bornée (cascade FMCG 7 niveaux).
    expect(routerSrc).toMatch(/depth < 7/);
  });

  it("les QUICK_INTAKE sont exclus du picker (résolus côté Console)", () => {
    expect(routerSrc).toContain('status: { not: "QUICK_INTAKE" }');
  });
});

describe("StrategySelector — lazy loading + états honnêtes", () => {
  it("l'arbre ne se charge qu'à l'ouverture du modal (enabled: open)", () => {
    expect(selectorSrc).toContain("enabled: open");
  });

  it("le label du bouton vient du StrategyProvider, pas de la query arbre", () => {
    expect(selectorSrc).toContain("const current = strategies.find((s) => s.id === strategyId)");
  });

  it("une erreur de chargement est AFFICHÉE (plus d'échec silencieux bouton-muet)", () => {
    expect(selectorSrc).toContain("Impossible de charger vos marques");
    expect(selectorSrc).not.toContain("{open && tree && <BrandPickerModal");
  });

  it("dédupe : une Strategy référencée par plusieurs nodes ne porte qu'UNE coche active", () => {
    expect(selectorSrc).toContain("seenStrategyIds");
  });

  it("une tuile NON pilotée n'affiche jamais de coche active (fini le null === null)", () => {
    // Sans marque active, `x.strategyId === activeStrategyId` valait
    // `null === null` → toutes les tuiles « Pas encore piloté » cochées.
    expect(selectorSrc).toContain("const active = isActive && isPiloted");
    expect(selectorSrc).toContain("{active && <Check");
    // La coche ne doit plus être pilotée par `isActive` brut.
    expect(selectorSrc).not.toContain("{isActive && <Check");
  });

  it("le bouton déclencheur ne déborde plus (largeur fluide + truncate)", () => {
    expect(selectorSrc).not.toContain("max-w-[220px]");
    expect(selectorSrc).toContain("min-w-0 flex-1 truncate");
  });
});

describe("StrategyProvider — fallback de marque active", () => {
  it("un QUICK_INTAKE ne devient jamais la marque active (ni fallback, ni sélection persistée)", () => {
    expect(contextSrc).toContain('s.status !== "QUICK_INTAKE"');
    expect(contextSrc).toContain("activeStrategies.some((s) => s.id === selectedId)");
  });
});
