import { describe, expect, it } from "vitest";
import { projectBarreWorkspace, barreFileUrl } from "@/domain/portfolio-barre";
import { PortfolioReferencesSchema } from "@/domain/portfolio-reference";
const data = {
  clients: [{ id: "fc", nom: "FrieslandCampina" }],
  marques: [{ id: "br", clientId: "fc", nom: "Bonnet Rouge", vault: { vision: "Ensemble", sources: { vision: "Brief" }, inferences: { vision: { pourquoi: "Proposition" } } } }, { id: "pk", clientId: "fc", nom: "Peak" }, { id: "tomate", clientId: "autre", nom: "Belles Tomates" }],
  campagnes: [{ id: "noel", marqueIds: ["br", "pk"], nom: "Noël 2026", gamme: "EVAP" }],
  projets: [{ id: "p1", campagneId: "noel", nom: "EOY", sections: { identite: { clientId: "fc", marqueIds: ["br", "pk"], budget: null }, brief: { verbatim: "Reçu le 29" } }, perimetre: { marches: ["M-CI"], infere: {} } }, { id: "p2", nom: "Belles Tomates", sections: { identite: { clientId: "fc", marqueIds: ["tomate"] } } }],
  sku: [{ id: "s1", marque: "br", nom: "EVAP", categorie: "EVAP" }, { id: "s2", marque: "br", nom: "Ancien", archive: { motif: "Doublon" } }], assets: [],
};
describe("ventilation fidèle aux identités sources", () => {
  it("garde une seule campagne et un seul projet multimarque", () => {
    const r = projectBarreWorkspace(data, [{ system: "LA_BARRE", kind: "client", id: "fc" }]);
    expect(r.campaigns).toHaveLength(1); expect(r.projects).toHaveLength(1);
    expect(r.projects[0]?.brands).toEqual(["Bonnet Rouge", "Peak"]);
    expect(r.projects[0]?.budget).toBeNull(); expect(r.projects[0]?.markets).toEqual(["CI"]);
    expect(r.issues).toHaveLength(1); expect(r.issues[0]).toContain("Belles Tomates");
  });
  it("conserve une clôture inférée et son motif sans valider le statut source", () => {
    const project = { ...data.projets[0], statut: "creation", cloture: {
      le: "2026-09-22", bilan: "", releve: "Historique de production", infere: { pourquoi: "À confirmer par le titulaire" },
    } };
    const input = { ...data, projets: [project] }, before = JSON.stringify(input);
    const result = projectBarreWorkspace(input, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.projects[0]).toMatchObject({ status: "creation", closure: {
      date: "2026-09-22", inferred: true, reason: "À confirmer par le titulaire", origin: "Historique de production", report: "",
    } });
    expect(JSON.stringify(input)).toBe(before);
  });
  it("garde le bilan et l’origine d’une clôture consignée", () => {
    const result = projectBarreWorkspace({ ...data, projets: [{ ...data.projets[0], cloture: {
      le: "2026-10-01", bilan: "Retour documenté", releve: "décidé à la main",
    } }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.projects[0]).toHaveProperty("closure", { date: "2026-10-01", inferred: false,
      reason: "", origin: "décidé à la main", report: "Retour documenté" });
  });
  it("ne ferme ni une échéance passée ni un dossier rouvert", () => {
    for (const extra of [{}, { cloture: { bilan: "incomplet" } }, { cloturesPassees: [{ le: "2026-01-01" }] }]) {
      const result = projectBarreWorkspace({ ...data, projets: [{ ...data.projets[0], ...extra,
        sections: { ...data.projets[0]!.sections, identite: { ...data.projets[0]!.sections!.identite, echeance: "2020-01-01" } },
      }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
      expect(result.projects[0]).toHaveProperty("closure", null);
    }
  });
  it("ne confond pas mention de source et validation d’une inférence", () => {
    const r = projectBarreWorkspace(data, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(r.knowledge[0]?.certainty).toBe("INFERRED"); expect(r.knowledge[0]?.evidence).toBe("Proposition");
  });
  it("une référence SKU descendante ne masque pas les archives à la racine", () => {
    const r = projectBarreWorkspace(data, [{ system: "LA_BARRE", kind: "client", id: "fc" }, { system: "LA_BARRE", kind: "sku", id: "s1" }]);
    expect(r.products).toHaveLength(2); expect(r.products[1]?.archived).toBe(true);
    const leaf = projectBarreWorkspace(data, [{ system: "LA_BARRE", kind: "sku", id: "s1" }]);
    expect(leaf.products).toHaveLength(1);
  });
  it("ne présente jamais une source cassée comme un portefeuille vide", () => {
    expect(() => projectBarreWorkspace({ error: "indisponible" }, [])).toThrow();
  });
  it("refuse les liens locaux, la traversée et les exécutables", () => {
    for (const path of ["/Users/client/logo.png", "assets/../private.json", "javascript:alert(1)", "https://other.test/a.png"]) expect(barreFileUrl(path)).toBeNull();
    expect(barreFileUrl("assets/review/logo pic.png")).toContain("logo%20pic.png");
    expect(PortfolioReferencesSchema.safeParse([{ system: "WEB", kind: "site", id: "x", url: "javascript:alert(1)" }]).success).toBe(false);
  });
  it("refuse un raccordement répété", () => {
    const ref = { system: "LA_BARRE", kind: "brand", id: "br" };
    expect(PortfolioReferencesSchema.safeParse([ref, ref]).success).toBe(false);
  });
  it("refuse les identités mal typées et les URLs contenant des identifiants", () => {
    for (const ref of [
      { system: "LA_BARRE", kind: "strategy", id: "x" },
      { system: "LA_BARRE", kind: "range", id: "sans-marque" },
      { system: "WEB", kind: "site", id: "x" },
      { system: "GITHUB", kind: "repository", id: "x", url: "https://credential@github.com/example/repo" },
    ]) expect(PortfolioReferencesSchema.safeParse([ref]).success).toBe(false);
  });
  it("signale les références disparues sans détruire le lien", () => {
    const result = projectBarreWorkspace(data, [{ system: "LA_BARRE", kind: "sku", id: "absent" }]);
    expect(result.products).toHaveLength(0);
    expect(result.issues[0]).toContain("absent");
  });
  it("conserve les fichiers de même caractéristiques en signalant la qualification nécessaire", () => {
    const result = projectBarreWorkspace({ ...data, sku: [...data.sku, { ...data.sku[0], id: "s3" }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products).toHaveLength(3);
    expect(result.products.filter((p) => p.possibleDuplicate)).toHaveLength(2);
    expect(result.issues[0]).toContain("caractéristiques");
  });
  it("ne confond pas les saveurs déjà déclarées dans le catalogue source", () => {
    const sku = ["vanille", "chocolat"].map((saveur) => ({ id: saveur, marque: "br", nom: saveur, categorie: "CEREALES", format: "50g", saveur, contenant: "paquet" }));
    const result = projectBarreWorkspace({ ...data, sku }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products).toHaveLength(2);
    expect(result.products.some((p) => p.possibleDuplicate)).toBe(false);
  });
  it("conserve la différence entre une boîte et un sachet de même contenance", () => {
    const sku = ["boîte", "sachet"].map((contenant) => ({ id: contenant, marque: "br", nom: contenant, categorie: "IMP", format: "400g", contenant }));
    const result = projectBarreWorkspace({ ...data, sku }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products.some((p) => p.possibleDuplicate)).toBe(false);
  });
  it("ouvre la revue disponible sans fabriquer de lien public pour un master privé", () => {
    const result = projectBarreWorkspace({ ...data, sku: [{ id: "pack", marque: "br", nom: "Pack", production: "assets/production/pack.png", review: "assets/review/pack.png", vignette: "assets/review/proxy/pack.jpg" }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products[0]?.url).toBe("/la-barre/assets/review/pack.png");
    expect(result.products[0]).toMatchObject({ hasProductionReference: true });
    expect(barreFileUrl("assets/production/pack.png")).toBeNull();
  });
  it("signale le repère local d'un master même si aucune revue n'est disponible", () => {
    const result = projectBarreWorkspace({ ...data, sku: [{ id: "pack", marque: "br", nom: "Pack", chemin: "/Users/owner/private-pack.pdf" }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products[0]).toMatchObject({ url: null, preview: null, hasProductionReference: true });
  });
  it("garde la provenance d'un reclassement quand les droits sont encore vides", () => {
    const result = projectBarreWorkspace({ ...data, assets: [{ id: "composition", marque: "br", nom: "Vue de gamme", role: "gamme", source: "Ancienne fiche SKU conservée", note: "Lecture du packshot, pas accord client", aQualifier: true, droits: { zones: [], expire: null, cession: "" } }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.assets[0]?.note).toContain("Ancienne fiche SKU conservée");
    expect(result.assets[0]?.note).toContain("Lecture du packshot, pas accord client");
    expect(result.assets[0]?.note).toContain("Droits d’usage non renseignés");
    expect(result.assets[0]?.state).toBe("À qualifier");
  });
  it("emploie le fichier de revue léger désigné par la source pour l'aperçu et l'ouverture", () => {
    const result = projectBarreWorkspace({ ...data, proxys: { "assets/review/pack.png": "assets/review/proxy/pack.jpg" }, sku: [{ id: "pack", marque: "br", nom: "Pack", vignette: "assets/review/pack.png", review: "assets/review/pack.png" }] }, [{ system: "LA_BARRE", kind: "brand", id: "br" }]);
    expect(result.products[0]).toMatchObject({ preview: "/la-barre/assets/review/proxy/pack.jpg", url: "/la-barre/assets/review/proxy/pack.jpg" });
  });
});

describe("installation source identity", () => {
  it("does not resolve a legacy or foreign reference against the same ID in another corpus", () => {
    const ref = { system: "LA_BARRE" as const, kind: "brand" as const, id: "br" };
    expect(projectBarreWorkspace(data, [ref], "barre-own").projects).toEqual([]);
    expect(projectBarreWorkspace(data, [{ ...ref, instance: "barre-other" }], "barre-own").products).toEqual([]);
    expect(projectBarreWorkspace(data, [{ ...ref, instance: "barre-own" }], "barre-own").projects.map((p) => p.id)).toEqual(["p1"]);
  });
  it("returns actual project backlinks for an exact admitted BrandNode without writing the source", () => {
    const linked = { ...data, marques: data.marques.map((m) => m.id === "br" ? { ...m, sourceRefs: [{ system: "LA_FUSEE", kind: "brand", id: "node-a" }] } : m) };
    const before = JSON.stringify(linked);
    expect(projectBarreWorkspace(linked, [{ system: "LA_FUSEE", kind: "brand", id: "node-a" }], "barre-own").projects.map((p) => p.id)).toEqual(["p1"]);
    expect(projectBarreWorkspace(linked, [{ system: "LA_FUSEE", kind: "brand", id: "node-b" }], "barre-own").projects).toEqual([]);
    expect(JSON.stringify(linked)).toBe(before);
  });
});
