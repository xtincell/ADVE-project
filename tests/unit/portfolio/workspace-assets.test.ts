import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceAssets } from "@/components/portfolio/WorkspaceAssets";
import { groupWorkspaceAssets, type WorkspaceAsset } from "@/domain/portfolio-barre";

const logo: WorkspaceAsset = {
  id: "logo-canon", nativeId: "logo-canon", name: "Logo SPAWT horizontal",
  brand: "SPAWT — La carte du bon goût", kind: "logo final", state: "Actif",
  preview: "/brand/spawt/logos/logo-cat-horizontal.png", url: "/brand/spawt/logos/logo-cat-horizontal.png",
  source: "La Fusée", note: "Identité principale",
};
const historical = { ...logo, id: "logo-historique", nativeId: "logo-historique", brand: "SPAWT", note: "Dossier historique" };
const render = (assets: WorkspaceAsset[], search = "", includeArchives = false) => renderToStaticMarkup(createElement(WorkspaceAssets, {
  assets, search, includeArchives, onSelectContent: () => undefined,
}));
const cards = (html: string) => (html.match(/<article\b/g) ?? []).length;

describe("réception de la grille d’assets du portefeuille", () => {
  it("présente une seule carte pour le même lien de fichier dans deux dossiers", () => {
    const html = render([logo, historical]);
    expect(cards(html)).toBe(1);
    expect(html).toContain("SPAWT — La carte du bon goût");
    expect(html).toContain("Dossier historique");
    expect(html).toContain("2 rattachements");
    expect((html.match(/>Consulter le contenu</g) ?? []).length).toBe(2);
  });
  it("retrouve un dossier sans masquer les autres usages du même lien", () => {
    const html = render([logo, historical], "carte du bon goût");
    expect(cards(html)).toBe(1);
    expect(html).toContain("Dossier historique");
  });
  it("garde deux fichiers différents portant le même nom", () => {
    expect(cards(render([logo, { ...historical, url: "/brand/spawt/logos/logo-v2.png" }]))).toBe(2);
  });
  it("un aperçu commun ne fusionne pas deux actifs sans fichier", () => {
    expect(cards(render([{ ...logo, url: null }, { ...historical, url: null }]))).toBe(2);
  });
  it("les archives sont filtrées par rattachement et restent récupérables", () => {
    const archived = { ...historical, state: "Archivé" };
    expect(render([logo, archived])).not.toContain("Dossier historique");
    const html = render([logo, archived], "", true);
    expect(cards(html)).toBe(1);
    expect(html).toContain("Archivé");
    expect(html).toContain("Actif");
  });
  it("ne confond ni versions de fichier, ni autorités sources", () => {
    const groups = groupWorkspaceAssets([logo, historical,
      { ...historical, id: "v2", url: `${logo.url}?v=2` },
      { ...historical, id: "autre-source", source: "La Barre" },
    ]);
    expect(groups.map((group) => group.usages.map((usage) => usage.id))).toEqual([
      ["logo-canon", "logo-historique"], ["v2"], ["autre-source"],
    ]);
  });
  it("préserve les identités, états et noms divergents sans élire de master", () => {
    const other = { ...historical, strategyId: "historical", state: "Brouillon", name: "Autre appellation" };
    const [group] = groupWorkspaceAssets([{ ...logo, strategyId: "canon" }, other]);
    expect(group?.usages).toEqual([{ ...logo, strategyId: "canon" }, other]);
    const html = render([logo, other]);
    expect(html).toContain("Fichier partagé");
    expect(html).toContain("Autre appellation");
    expect(html).toContain("Brouillon");
    expect(html).toContain("Actif");
  });
  it("ne regroupe ni n’active une destination refusée", () => {
    const html = render([{ ...logo, url: "javascript:alert(1)" }, { ...historical, url: "javascript:alert(1)" }]);
    expect(cards(html)).toBe(2);
    expect(html).not.toContain("javascript:");
    expect(groupWorkspaceAssets([{ ...logo, state: "Remplacé" }], { includeArchives: false })).toEqual([]);
  });
});
