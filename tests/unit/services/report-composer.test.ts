/**
 * Vague D — composer déterministe du rapport intake (fallback zéro-LLM).
 * Le payeur ne voit JAMAIS une page vide : restitution verbatim des piliers,
 * vides dits honnêtement, zéro invention (ADR-0046).
 */

import { describe, it, expect } from "vitest";
import type { EnrichedFootprint } from "@/server/services/quick-intake/footprint-types";
import {
  composeDeterministicReport,
  humanizeValue,
  pillarContentLines,
  previewIntakeDiagnostic,
  intakePillarFields,
  intakeEvidenceEntries,
  intakeReportContent,
} from "@/server/services/quick-intake/report-composer";

describe("free report projection", () => {
  it("preserves the nine-line proposal preview without changing the stored report", () => {
    const full = Array.from({ length: 10 }, (_, i) => `Ligne ${i + 1}`).join("\n");
    const original = { narrativeReport: { executiveSummary: "Synthèse", adve: [{ preview: "Aperçu", full: "Texte complet" }], rtis: { pillars: [{ full }] } } };
    const preview = previewIntakeDiagnostic(original);
    expect(preview.narrativeReport.adve[0]?.full).toBe("");
    expect(preview.narrativeReport.rtis.pillars[0]?.full).toContain("Ligne 9");
    expect(preview.narrativeReport.rtis.pillars[0]?.full).not.toContain("Ligne 10");
    expect(original.narrativeReport.adve[0]?.full).toBe("Texte complet");
    expect(original.narrativeReport.rtis.pillars[0]?.full).toBe(full);
  });
  it("uses a stable useful field order instead of JSONB order and never counts metadata", () => {
    const content = { pays: "CM", _private: "secret", _fieldProvenance: { valeurs: "INFERRED" }, narrativeFull: "Texte", valeurs: ["Clarté"], missionStatement: "Réparer avec clarté" };
    expect(intakePillarFields(content).map(([key]) => key)).toEqual(["missionStatement", "valeurs", "pays"]);
    expect(pillarContentLines(content).join("\n")).not.toContain("secret");
    expect(pillarContentLines(content).join("\n")).not.toContain("INFERRED");
  });
});

describe("humanizeValue", () => {
  it("humanise chaînes, nombres, tableaux et objets nommés", () => {
    expect(humanizeValue("  Vision claire ")).toBe("Vision claire");
    expect(humanizeValue(42)).toBe("42");
    expect(humanizeValue(["transparence", "artisanat"])).toBe("transparence · artisanat");
    expect(humanizeValue({ nom: "Gamme Or", prix: 25000 })).toBe("Gamme Or");
    expect(humanizeValue({ label: "Premium" })).toBe("Premium");
    expect(humanizeValue({ id: "internal-id", salesChannel: "DIRECT" })).toBe("Canal de vente: Vente directe");
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
    expect(lines[0]).toContain("Vision");
  });
});

describe("composeDeterministicReport", () => {
  it("does not conclude absence from unconfigured collectors or ignore a declared offer and channel", () => {
    const footprint: EnrichedFootprint = {
      site: null, socials: [], articles: [], channels: [], collectedAt: "2026-10-20T00:00:00.000Z", errors: [],
      followerCounts: [], press: [], discovery: { attempted: false, queries: [], status: "DEFERRED_NO_KEY" },
      enrichment: { apify: "DEFERRED", press: "EMPTY", totalMs: 0, errors: [] },
      score: { total: 0, outOf: 100, measuredWeight: 10, dimensions: ([
        ["site", 20], ["social", 30], ["reviews", 15], ["press", 10],
        ["citations", 10], ["email", 10], ["domain", 5], ["perf", 10],
      ] as const).map(([key, weight]) => ({ key, weight, label: key, measured: key === "press", score: key === "press" ? 0 : null, details: "recette" })) },
    };
    const report = composeDeterministicReport({ companyName: "Atelier Kalo", classification: "FRAGILE", compositeScore: 11,
      extractedValues: { a: { missionStatement: "Réparer avec clarté" }, d: {}, v: { produitsCatalogue: [{ nom: "Ressemelage" }] }, e: { e_channels: "Visites à l'atelier et téléphone" } },
      pillarScores: { a: 4, d: 2, v: 4, e: 0 }, footprint, sectorLabel: "Services aux particuliers" });
    expect(report.executiveSummary).not.toContain("vit surtout hors ligne");
    expect(report.executiveSummary).toContain("9 %");
    const r = report.rtis.pillars.find(p => p.key === "r")!.full;
    expect(r).not.toContain("aucun profil social public n'a été trouvé");
    expect(r).toContain("non mesurés");
    const i = report.rtis.pillars.find(p => p.key === "i")!.full;
    expect(i).not.toContain("aucun canal n'est encore formalisé");
    expect(i).not.toContain("offre » est encore peu documentée");
  });

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

    // Copy FONDATEUR (2026-07-20) : nom cité, niveau expliqué en clair
    // (jamais le code sec), score et complétude cités.
    expect(report.executiveSummary).toContain("Cimencam");
    expect(report.executiveSummary).toContain("Ordinaire");
    expect(report.executiveSummary).toContain("62/100");
    expect(report.executiveSummary).toContain("3 de vos 4 fondations");
    expect(report.adve).toHaveLength(4);

    const a = report.adve.find((p) => p.key === "a")!;
    expect(a.full).toContain("Bâtir le Cameroun");
    expect(a.full).toContain("solidité · local");

    // Pilier vide : dit honnêtement, jamais rempli d'inventions.
    const e = report.adve.find((p) => p.key === "e")!;
    expect(e.preview).toContain("rien de documenté");

    // RTIS : narrative du draft V3 reprise verbatim.
    const t = report.rtis.pillars.find((p) => p.key === "t")!;
    expect(t.preview).toBe("Marché en croissance de 4 %");
  });

  it("tout vide → rapport honnête 0/4, structure complète (jamais de crash)", () => {
    const report = composeDeterministicReport({
      companyName: "Marque X",
      classification: "LATENT",
      extractedValues: { a: {}, d: {}, v: {}, e: {} },
    });
    expect(report.executiveSummary).toContain("0 de vos 4 fondations");
    expect(report.adve).toHaveLength(4);
    expect(report.rtis.pillars).toHaveLength(4);
  });

  it("ADR-0164 : pillarScores fournis → ≥ 2 propositions concrètes par volet R/T/I/S, ancrées données", () => {
    const report = composeDeterministicReport({
      companyName: "La Paillote",
      classification: "FRAGILE",
      extractedValues: {
        a: { mission: "La vraie cuisine de chez nous" },
        d: { difference: "Recettes de famille, poisson braisé réputé" },
        v: { offre: "Plats du jour, poisson braisé, ndolé" },
        e: { canaux: "Bouche-à-oreille, WhatsApp pour les commandes" },
      },
      pillarScores: { a: 2, d: 12, v: 8, e: 1 },
      footprint: null,
      sectorLabel: "Tourisme & hôtellerie",
    });
    for (const key of ["r", "t", "i", "s"] as const) {
      const volet = report.rtis.pillars.find((p) => p.key === key)!;
      // Jamais une carte vide : au moins 2 puces, chacune avec son évidence.
      expect((volet.full.match(/•/g) ?? []).length).toBeGreaterThanOrEqual(2);
      expect(volet.full).toContain("Pourquoi :");
      expect(volet.preview.length).toBeGreaterThan(10);
    }
    // Ancrage réel : le volet I cite l'offre déclarée, le S cible la fondation la plus faible (E).
    const i = report.rtis.pillars.find((p) => p.key === "i")!;
    expect(i.full).toContain("Plats du jour");
    const s = report.rtis.pillars.find((p) => p.key === "s")!;
    expect(s.full).toContain("communauté");
  });
});

describe("report fidelity without model assistance", () => {
  it("labels all four origins and never calls generated material founder speech", () => {
    const a = { missionStatement: "Réparer localement", vision: "Leader mondial", citationFondatrice: "À retrouver", valeurs: ["Clarté"], _fieldProvenance: { missionStatement: "SOURCE", vision: "INFERRED", valeurs: "HUMAN" } };
    expect(intakeEvidenceEntries(a).map(e => e.origin)).toEqual(["SOURCE", "HUMAN", "UNKNOWN", "INFERRED"]);
    const report = composeDeterministicReport({ companyName: "Atelier", classification: "FRAGILE", compositeScore: 28, extractedValues: { a, d: {}, v: {}, e: {} } });
    expect(report.adve[0]!.full).toContain("Proposition à valider");
    expect(report.adve[0]!.full).toContain("Origine non documentée");
    expect(report.adve[0]!.full).not.toContain("Ce que vous nous avez dit");
    expect(report.executiveSummary).toContain("complétude du dossier : 28/100");
    expect(report.adve[1]!.full).not.toContain("collecte publique n'a rien trouvé");
  });
  it("excludes narrative and edition metadata from evidence rather than counting them as fields", () => {
    expect(intakeEvidenceEntries({ confidence: .8, currentVersion: 6, narrativeFull: "Synthèse générée", _fieldProvenance: { x: "SOURCE" }, fieldCertainty: { x: "DECLARED" } })).toEqual([]);
  });
});

describe("historical report read projection", () => {
  it("keeps the stored content unchanged and does not certify legacy SOURCE on regeneration", () => {
    const content = { missionStatement: "Reçu ou généré autrefois", valeurs: ["Clarté"], _fieldProvenance: { missionStatement: "SOURCE", valeurs: "HUMAN" } };
    const before = JSON.stringify(content);
    expect(intakeReportContent(content, "a", 0)._fieldProvenance).toEqual({ missionStatement: "UNKNOWN", valeurs: "HUMAN" });
    expect(intakeReportContent(content, "a", undefined)._fieldProvenance).toEqual({ missionStatement: "UNKNOWN", valeurs: "HUMAN" });
    expect(intakeReportContent(content, "a", 1)).toBe(content);
    expect(JSON.stringify(content)).toBe(before);
  });
});
