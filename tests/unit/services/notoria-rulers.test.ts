/**
 * ADR-0090 — Field Rulers déterministes (Notoria).
 *
 * Vérifie : déterminisme strict (variance 0), les 5 dimensions, la détection
 * placeholder/buzzword, les violations Bible, le score pondéré, et le gate de
 * remplacement (une nouvelle valeur ne remplace l'ancienne que si elle la bat
 * avec la marge d'hystérésis).
 */

import { describe, it, expect } from "vitest";
import {
  evaluateField,
  computeRecoWeightedScore,
  compareForReplacement,
  RULER_PASS_THRESHOLD,
  RULER_REPLACEMENT_MARGIN,
  RECO_WEIGHTS,
  RULER_DIMENSION_WEIGHTS,
} from "@/server/services/notoria/rulers";

const RICH_DESCRIPTION =
  "Cimenteries du Cameroun — leader du ciment en Afrique centrale depuis 1963. " +
  "Filiale du groupe LafargeHolcim, 3 usines, 60% de parts de marché au Cameroun.";

describe("evaluateField — ruler déterministe par champ (ADR-0090)", () => {
  it("est strictement déterministe : même entrée → même verdict", () => {
    const a = evaluateField("a", "description", RICH_DESCRIPTION);
    const b = evaluateField("a", "description", RICH_DESCRIPTION);
    expect(a).toEqual(b);
    expect(a.score).toBe(b.score);
  });

  it("score 0 en presence pour un champ vide, pass=false", () => {
    const v = evaluateField("a", "description", "");
    expect(v.dimensions.presence).toBe(0);
    expect(v.pass).toBe(false);
  });

  it("détecte les placeholders (TODO, à définir…)", () => {
    const v = evaluateField("a", "accroche", "TODO: écrire l'accroche");
    expect(v.dimensions.presence).toBeLessThan(50);
    expect(v.warnings.join(" ")).toContain("Placeholder");
  });

  it("pénalise les buzzwords génériques en specificité", () => {
    const generic = evaluateField(
      "d",
      "positionnement",
      "Nous sommes le leader incontesté des solutions innovantes, une marque disruptive et incontournable du marché africain en pleine croissance.",
    );
    const factual = evaluateField(
      "d",
      "positionnement",
      "Premier cimentier du Cameroun avec 60% de parts de marché, 3 usines à Douala, Figuil et Yaoundé, distribué dans 1200 points de vente.",
    );
    expect(factual.dimensions.specificite).toBeGreaterThan(generic.dimensions.specificite);
    expect(generic.warnings.join(" ")).toContain("Buzzword");
  });

  it("respecte les bornes Bible : sous minLength → richesse pénalisée", () => {
    // a.description : minLength 50 dans la Bible
    const short = evaluateField("a", "description", "Trop court.");
    const ok = evaluateField("a", "description", RICH_DESCRIPTION);
    expect(short.dimensions.richesse).toBeLessThan(ok.dimensions.richesse);
  });

  it("un score riche et factuel passe le seuil RULER_PASS_THRESHOLD", () => {
    const v = evaluateField("a", "description", RICH_DESCRIPTION);
    expect(v.score).toBeGreaterThanOrEqual(RULER_PASS_THRESHOLD);
    expect(v.pass).toBe(true);
  });

  it("les poids des dimensions somment à 1", () => {
    const sum = Object.values(RULER_DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe("computeRecoWeightedScore — pondération canonique", () => {
  it("les poids somment à 1", () => {
    const sum = RECO_WEIGHTS.ruler + RECO_WEIGHTS.impact + RECO_WEIGHTS.confidence;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("impact neutre (0 delta) → 50 pts sur la composante impact", () => {
    const w = computeRecoWeightedScore({ rulerScore: 100, scoreImpactEstimate: 0, confidence: 1 });
    expect(w).toBeCloseTo(100 * RECO_WEIGHTS.ruler + 50 * RECO_WEIGHTS.impact + 100 * RECO_WEIGHTS.confidence, 5);
  });

  it("un delta positif augmente le score, un delta négatif le réduit", () => {
    const base = computeRecoWeightedScore({ rulerScore: 60, scoreImpactEstimate: 0, confidence: 0.6 });
    const up = computeRecoWeightedScore({ rulerScore: 60, scoreImpactEstimate: 2, confidence: 0.6 });
    const down = computeRecoWeightedScore({ rulerScore: 60, scoreImpactEstimate: -2, confidence: 0.6 });
    expect(up).toBeGreaterThan(base);
    expect(down).toBeLessThan(base);
  });
});

describe("compareForReplacement — gate de remplacement pondéré", () => {
  it("autorise toujours le remplissage d'un champ vide", () => {
    const cmp = compareForReplacement({
      pillarKey: "a",
      field: "description",
      oldValue: null,
      newValue: RICH_DESCRIPTION,
      confidence: 0.7,
    });
    expect(cmp.replaceAllowed).toBe(true);
    expect(cmp.reason).toContain("vide");
  });

  it("refuse une nouvelle valeur inférieure à l'existant (RULER_INFERIOR)", () => {
    const cmp = compareForReplacement({
      pillarKey: "a",
      field: "description",
      oldValue: RICH_DESCRIPTION,
      newValue: "Une marque de ciment leader incontesté.",
      confidence: 0.9,
    });
    expect(cmp.replaceAllowed).toBe(false);
    expect(cmp.reason).toContain("RULER_INFERIOR");
  });

  it("autorise une nouvelle valeur nettement meilleure", () => {
    const cmp = compareForReplacement({
      pillarKey: "a",
      field: "description",
      oldValue: "Du ciment au Cameroun.",
      newValue: RICH_DESCRIPTION,
      confidence: 0.9,
      scoreImpactEstimate: 1.5,
    });
    expect(cmp.replaceAllowed).toBe(true);
    expect(cmp.improvement).toBeGreaterThanOrEqual(RULER_REPLACEMENT_MARGIN);
  });

  it("le gate est symétriquement déterministe (mêmes entrées → même verdict)", () => {
    const args = {
      pillarKey: "a" as const,
      field: "accroche",
      oldValue: "Le ciment qui protège les familles camerounaises",
      newValue: "Le ciment des bâtisseurs",
      confidence: 0.8,
    };
    const a = compareForReplacement(args);
    const b = compareForReplacement(args);
    expect(a).toEqual(b);
  });
});
