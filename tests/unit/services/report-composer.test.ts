/**
 * Vague D — composer déterministe du rapport intake (fallback zéro-LLM).
 * Le payeur ne voit JAMAIS une page vide : restitution verbatim des piliers,
 * vides dits honnêtement, zéro invention (ADR-0046).
 */

import { describe, it, expect } from "vitest";
import {
  composeDeterministicReport,
  humanizeValue,
  pillarContentLines,
} from "@/server/services/quick-intake/report-composer";

describe("humanizeValue", () => {
  it("humanise chaînes, nombres, tableaux et objets nommés", () => {
    expect(humanizeValue("  Vision claire ")).toBe("Vision claire");
    expect(humanizeValue(42)).toBe("42");
    expect(humanizeValue(["transparence", "artisanat"])).toBe("transparence · artisanat");
    expect(humanizeValue({ nom: "Gamme Or", prix: 25000 })).toBe("Gamme Or");
    expect(humanizeValue({ label: "Premium" })).toBe("Premium");
  });
  it("null sur vide/absent — jamais de placeholder inventé", () => {
    expect(humanizeValue("")).toBeNull();
    expect(humanizeValue(null)).toBeNull();
    expect(humanizeValue([])).toBeNull();
    expect(humanizeValue({})).toBeNull();
  });
});

describe("pillarContentLines", () => {
  it("exclut les champs méta (narrative*, webPresence, footprintScore)", () => {
    const lines = pillarContentLines({
      vision: "Devenir la référence",
      narrativeFull: "long texte LLM",
      webPresence: { socials: [] },
      footprintScore: { total: 50 },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("vision");
  });
});

describe("composeDeterministicReport", () => {
  it("compose un rapport complet depuis des piliers documentés", () => {
    const report = composeDeterministicReport({
      companyName: "Cimencam",
      classification: "ORDINAIRE",
      compositeScore: 62,
      extractedValues: {
        a: { vision: "Bâtir le Cameroun", valeurs: ["solidité", "local"] },
        d: { positionnement: "Le ciment de référence" },
        v: { promesse: "Qualité constante" },
        e: {},
      },
      rtisValues: {
        t: { narrative: "Marché en croissance de 4 %", marketSize: { value: "12 Mds", source: "Seshat" } },
      },
    });

    expect(report.executiveSummary).toContain("Cimencam");
    expect(report.executiveSummary).toContain("ORDINAIRE");
    expect(report.executiveSummary).toContain("62/100");
    expect(report.executiveSummary).toContain("3/4 piliers");
    expect(report.adve).toHaveLength(4);

    const a = report.adve.find((p) => p.key === "a")!;
    expect(a.full).toContain("Bâtir le Cameroun");
    expect(a.full).toContain("solidité · local");

    // Pilier vide : dit honnêtement, jamais rempli d'inventions.
    const e = report.adve.find((p) => p.key === "e")!;
    expect(e.preview).toContain("aucun élément documenté");

    // RTIS : narrative du draft V3 reprise verbatim, pilier absent annoncé.
    const t = report.rtis.pillars.find((p) => p.key === "t")!;
    expect(t.preview).toBe("Marché en croissance de 4 %");
    const r = report.rtis.pillars.find((p) => p.key === "r")!;
    expect(r.full).toContain("Pas encore de contenu Risque");
  });

  it("tout vide → rapport honnête 0/4, structure complète (jamais de crash)", () => {
    const report = composeDeterministicReport({
      companyName: "Marque X",
      classification: "LATENT",
      extractedValues: { a: {}, d: {}, v: {}, e: {} },
    });
    expect(report.executiveSummary).toContain("0/4");
    expect(report.adve).toHaveLength(4);
    expect(report.rtis.pillars).toHaveLength(4);
  });
});
