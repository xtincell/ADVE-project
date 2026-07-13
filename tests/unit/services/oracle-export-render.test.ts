/**
 * export-oracle — rendu structuré du corps de section (ADR-0138, audit T15).
 *
 * Le PDF/Markdown Oracle rendait un `JSON.stringify` brut par section. Le
 * renderer produit désormais du texte lisible (titres, puces, clé-valeur
 * humanisés). On vérifie qu'aucune accolade/guillemet JSON ne fuit.
 */

import { describe, expect, it } from "vitest";
import {
  renderValue,
  sectionDataToBody,
} from "@/server/services/strategy-presentation/export-oracle";

describe("ADR-0138 — rendu lisible du corps Oracle", () => {
  it("objet plat → clé-valeur humanisée (pas de JSON)", () => {
    const body = sectionDataToBody({ perceptionActuelle: "Marque de niche", brandMarketFitScore: 72 });
    expect(body).toContain("Perception actuelle : Marque de niche");
    expect(body).toContain("Brand market fit score : 72");
    expect(body).not.toContain("{");
    expect(body).not.toContain('"');
  });

  it("tableau de primitives → puces", () => {
    expect(renderValue(["Alpha", "Beta"])).toEqual(["• Alpha", "• Beta"]);
  });

  it("tableau d'objets → puce + champs indentés", () => {
    const lines = renderValue([{ nom: "Rival A", partDeMarche: "30%" }]);
    expect(lines[0]).toBe("• Nom : Rival A");
    expect(lines[1]).toBe("  Part de marche : 30%");
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
});
