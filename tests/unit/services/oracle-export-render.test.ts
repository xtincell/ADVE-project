/**
 * export-oracle — rendu structuré du corps de section (ADR-0138, audit T15).
 *
 * Le PDF/Markdown Oracle rendait un `JSON.stringify` brut par section. Le
 * renderer produit désormais du texte lisible (titres, puces, clé-valeur
 * humanisés). On vérifie qu'aucune accolade/guillemet JSON ne fuit.
 */

import { describe, expect, it } from "vitest";
import { getFieldLabel } from "@/lib/types/field-labels";
import {
  renderValue,
  sectionDataToBody,
} from "@/server/services/strategy-presentation/export-oracle";

describe("ADR-0138 — rendu lisible du corps Oracle", () => {
  it("labels a mix weight in context without changing the typography weight label", () => {
    const body = sectionDataToBody({ manipulationMatrix: { evaluations: [{ mode: "dealer", weight: 0.25 }] } });
    expect(body).toContain("Part du mix : 0,25");
    expect(body).not.toContain("Graisse");
    expect(getFieldLabel("weight")).toBe("Graisse");
  });
  it("keeps currency acronyms and unknown snake-case labels readable", () => {
    const body = sectionDataToBody({ totalsByCurrency: { XAF: 0 }, approche_recommandee: "Planifier" });
    expect(body).toContain("XAF : 0");
    expect(body).toContain("Approche recommandee : Planifier");
    expect(body).not.toContain("X A F");
    expect(body).not.toContain("Approche_recommandee");
  });
  it("objet plat → clé-valeur humanisée (pas de JSON)", () => {
    const body = sectionDataToBody({ perceptionActuelle: "Marque de niche", brandMarketFitScore: 72 });
    expect(body).toContain("Perception actuelle : Marque de niche");
    expect(body).toContain("Brand-Market Fit : 72");
    expect(body).not.toContain("{");
    expect(body).not.toContain('"');
  });

  it("tableau de primitives → puces", () => {
    expect(renderValue(["Alpha", "Beta"])).toEqual(["• Alpha", "• Beta"]);
  });

  it("tableau d'objets → puce + champs indentés", () => {
    const lines = renderValue([{ nom: "Rival A", partDeMarche: "30%" }]);
    expect(lines[0]).toBe("• Nom : Rival A");
    expect(lines[1]).toBe("  Part de marché : 30%");
  });

  it("objet imbriqué → sous-titre ## + indentation", () => {
    const body = sectionDataToBody({ marche: { tam: "10M", sam: "4M" } });
    expect(body).toContain("## Marche");
    expect(body).toContain("  Tam : 10M");
    expect(body).toContain("  Sam : 4M");
  });

  it("valeurs vides ignorées ; clés internes (_) masquées", () => {
    const body = sectionDataToBody({ a: "gardé", b: "", c: [], _fieldProvenance: { x: 1 } });
    expect(body).toContain("A : gardé");
    expect(body).not.toContain("_fieldProvenance");
    expect(body).not.toContain("Provenance");
  });

  it("section vide → libellé honnête (pas « {} »)", () => {
    expect(sectionDataToBody({})).toBe("(section vide)");
    expect(sectionDataToBody(null)).toBe("(section vide)");
  });

  it("string brute → passthrough", () => {
    expect(sectionDataToBody("Résumé exécutif.")).toBe("Résumé exécutif.");
  });

  it("shares business labels for partial budgets and horizons instead of internal English keys", () => {
    const body = sectionDataToBody({ budgetSummary: { knownSubtotal: 500_000, declaredCount: 1,
      estimatedCount: 1, unknownCount: 1, unassignedTimeframeCount: 3 } });
    expect(body).toContain("Chiffrage des initiatives");
    expect(body).toContain("Sous-total chiffré : 500 000");
    expect(body).toContain("Budgets à préciser : 1");
    expect(body).toContain("Échéances à préciser : 3");
    expect(body).not.toContain("Known subtotal");
  });

  it("renders zero and boolean facts with deterministic client wording", () => {
    const body = sectionDataToBody({ budget: 0, recommended: true, selected: false });
    expect(body).toContain("Budget : 0");
    expect(body).toContain("Recommandé : Oui");
    expect(body).toContain("Retenu : Non");
  });
});
