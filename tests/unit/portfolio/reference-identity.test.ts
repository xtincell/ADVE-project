import { describe, expect, it } from "vitest";
import {
  PortfolioReferencesSchema, readPortfolioReferences,
  portfolioReferenceKey, inspectPortfolioReferences, portfolioProjectFollowUps,
} from "@/domain/portfolio-reference";

const project = { system: "LA_BARRE" as const, instance: "barre-matanga" as const, kind: "project" as const, id: "PRJ-EOTY26" };
const radar = { system: "RADAR" as const, instance: "radar-matanga", kind: "brief" as const, id: "491", project,
  label: "FRC-076", url: "https://radar.example/#/taches?brief=491" };
describe("identités des raccordements du portefeuille", () => {
  it("admet deux dossiers de même identifiant dans deux instances Radar", () => {
    expect(PortfolioReferencesSchema.safeParse([radar, { ...radar, instance: "radar-personnel" }]).success).toBe(true);
    expect(portfolioReferenceKey(radar)).not.toBe(portfolioReferenceKey({ ...radar, instance: "radar-personnel" }));
  });
  it("refuse un Radar sans instance, un code métier à la place de son id, ou un autre type", () => {
    for (const bad of [{ ...radar, instance: undefined }, { ...radar, id: "FRC-076" },
      { ...radar, id: "0" }, { ...radar, kind: "project" }, { ...radar, instance: "../perso" }]) {
      expect(PortfolioReferencesSchema.safeParse([bad]).success).toBe(false);
    }
  });
  it("relie le suivi au projet exact sans copier son état", () => {
    const rows = PortfolioReferencesSchema.parse([radar, { ...radar, instance: "radar-personnel" },
      { ...radar, id: "492", project: { ...project, id: "PRJ-AUTRE" } }]);
    expect(portfolioProjectFollowUps([...rows, rows[0]!], "PRJ-EOTY26").map((r) => r.instance))
      .toEqual(["radar-matanga", "radar-personnel"]);
    expect(portfolioProjectFollowUps(rows, "PRJ-INCONNU")).toEqual([]);
    expect(PortfolioReferencesSchema.safeParse([{ ...radar, status: "Livré" }]).success).toBe(false);
  });
  it("ne lit pas une autre instance Barre dans le dépôt Matanga fixe", () => {
    expect(PortfolioReferencesSchema.safeParse([{ ...radar, project: { ...project, instance: "autre-barre" } }]).success).toBe(false);
    expect(PortfolioReferencesSchema.safeParse([{ system: "LA_BARRE", instance: "autre-barre", kind: "project", id: "PRJ-EOTY26" }]).success).toBe(false);
  });
  it("conserve les anciennes identités Barre sans créer un doublon qualifié", () => {
    const legacy = { system: "LA_BARRE" as const, kind: "brand" as const, id: "MQ-br" };
    expect(readPortfolioReferences([legacy])).toEqual([legacy]);
    expect(portfolioReferenceKey(legacy)).toBe(portfolioReferenceKey({ ...legacy, instance: "barre-matanga" }));
    expect(PortfolioReferencesSchema.safeParse([legacy, { ...legacy, instance: "barre-matanga" }]).success).toBe(false);
  });
  it("conserve les références saines et signale chaque entrée rejetée", () => {
    const good = { system: "LA_BARRE" as const, kind: "brand" as const, id: "MQ-br" };
    const parsed = inspectPortfolioReferences([good, { system: "INCONNU", id: "x" }, radar, good]);
    expect(parsed.references).toEqual([good, radar]);
    expect(parsed.issues.map((i) => i.index)).toEqual([1, 3]);
    expect(readPortfolioReferences([good, { broken: true }])).toEqual([good]);
    expect(PortfolioReferencesSchema.safeParse([good, { broken: true }]).success).toBe(false);
  });
  it("ne prend pas un format corrompu pour un tableau de liens vide", () => {
    expect(inspectPortfolioReferences({ wrong: true }).issues).toHaveLength(1);
    expect(inspectPortfolioReferences(null)).toEqual({ references: [], issues: [] });
    expect(inspectPortfolioReferences(Array.from({ length: 41 }, (_, i) => ({ ...radar, id: String(i + 1) }))).issues).toHaveLength(1);
  });
  it("refuse un contexte de projet sur un site ou une stratégie", () => {
    expect(PortfolioReferencesSchema.safeParse([{ system: "WEB", kind: "site", id: "site", url: "https://example.test", project }]).success).toBe(false);
    expect(PortfolioReferencesSchema.safeParse([{ ...radar, project: { ...project, kind: "brand" } }]).success).toBe(false);
  });
});
