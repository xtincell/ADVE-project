/**
 * ANCRE d'identité anti-contamination (Betsy-dans-Awa).
 *
 * Cause racine : `summarizePillar` (auto-filler) condense tout pilier > 6 kB — les
 * tableaux deviennent « [Array×N] », effaçant QUI peuple le tableau. Le LLM à qui
 * on demandait de remplir `personas[2].fears` ne « voyait » donc plus l'identité du
 * persona (« Awa ») et inventait une autre identité (« Betsy ») dans sa case.
 *
 * `buildFieldAnchor(content, path)` recolle au champ l'identité EXACTE de son
 * item/objet parent, extraite du contenu BRUT (jamais du résumé). Ces tests
 * verrouillent la MÉCANIQUE (fonction pure, contenus synthétiques) — pas les données.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFieldAnchor } from "@/lib/types/pillar-maturity-contracts";

const personas = [
  { name: "Betsy", age: 40, csp: "Cadre supérieur", location: "Cocody", motivations: ["statut"] },
  { name: "Awa", age: 32, csp: "Employé de bureau", location: "Abidjan, Marcory", motivations: ["curiosité"] },
];
const content: Record<string, unknown> = { personas };

describe("buildFieldAnchor — ancre d'identité par item", () => {
  it("ancre une cellule sur l'identité de SON index (Awa), jamais celle d'un autre (Betsy)", () => {
    const anchor = buildFieldAnchor(content, "personas[1].fears");
    expect(anchor).toContain("Awa");
    expect(anchor).not.toContain("Betsy"); // ← la contamination Betsy-dans-Awa devient structurellement impossible
    expect(anchor).toContain("Employé de bureau");
  });

  it("chaque index porte une ancre DISTINCTE — aucun cross-talk entre personas", () => {
    const a0 = buildFieldAnchor(content, "personas[0].fears");
    const a1 = buildFieldAnchor(content, "personas[1].jobsToBeDone");
    expect(a0).toContain("Betsy");
    expect(a0).not.toContain("Awa");
    expect(a1).toContain("Awa");
    expect(a1).not.toContain("Betsy");
  });

  it("feuille d'objet imbriqué → ancre = sœurs DÉJÀ remplies du parent (cohérence, pas fabrication)", () => {
    const c = { direction: { name: "Palette chromatique", primary: "#FF6B35", secondary: "" } };
    const anchor = buildFieldAnchor(c, "direction.secondary");
    expect(anchor).toContain("Palette chromatique");
    expect(anchor).toContain("#FF6B35");
  });

  it("chemin top-level (sans point) → pas d'ancre (aucune ambiguïté d'identité)", () => {
    expect(buildFieldAnchor(content, "positionnement")).toBe("");
  });

  it("parent absent / hors-borne / non-objet → pas d'ancre, jamais throw", () => {
    expect(buildFieldAnchor(content, "personas[9].fears")).toBe("");
    expect(buildFieldAnchor({}, "a.b.c")).toBe("");
    expect(buildFieldAnchor({ x: "scalaire" }, "x.leaf")).toBe("");
  });

  it("l'ancre reste une IDENTITÉ, pas une profondeur (objets imbriqués ignorés)", () => {
    const c = { item: { name: "X", nested: { deep: "SECRET_PROFOND" }, tag: "visible" } };
    const anchor = buildFieldAnchor(c, "item.newLeaf");
    expect(anchor).toContain("X");
    expect(anchor).toContain("visible");
    expect(anchor).not.toContain("SECRET_PROFOND");
  });

  it("ancre bornée — ne regonfle jamais le budget de contexte", () => {
    const big = { item: { name: "Y", blob: "z".repeat(5000), tag: "t" } };
    const anchor = buildFieldAnchor(big, "item.newLeaf");
    expect(anchor.length).toBeLessThanOrEqual(650);
  });
});

describe("câblage — l'ancre est réellement injectée dans le prompt de génération (garde anti-régression)", () => {
  const src = readFileSync(
    join(process.cwd(), "src/server/services/pillar-maturity/auto-filler.ts"),
    "utf8",
  );
  it("runChunkLLM construit une ANCRE par champ depuis le contenu BRUT", () => {
    expect(src).toContain("buildFieldAnchor(currentContent, r.path)");
    expect(src).toContain("ANCRE");
  });
  it("la règle d'anti-contamination inter-items est présente dans les consignes LLM", () => {
    expect(src).toMatch(/anti-contamination inter-items/i);
  });
  it("summarizePillar garde les identités des items au lieu d'un opaque [Array×N]", () => {
    // La regex prouve la branche « [Array×N: id, id] » (identités préservées).
    expect(src).toMatch(/\[Array×\$\{v\.length\}: \$\{ids\.join/);
  });
});
