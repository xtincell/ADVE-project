import { describe, expect, it } from "vitest";
import { Building2 } from "lucide-react";
import { resolveActiveHref, withCockpitContext } from "@/components/navigation/nav-active";
import { cockpitNavGroups } from "@/components/navigation/portal-configs";

describe("navigation du portefeuille avec contexte d’équipe", () => {
  const groups = [{ title: "", items: [
    { href: "/cockpit/portfolio?operator=team", label: "Portefeuille", icon: Building2 },
    { href: "/cockpit/portfolio/marque?operator=team", label: "Marque", icon: Building2 },
  ] }];
  it("allume la marque malgré le paramètre d’équipe sans allumer la racine", () => {
    expect(resolveActiveHref(groups, "/cockpit/portfolio/marque")).toBe(groups[0]!.items[1]!.href);
    expect(resolveActiveHref(groups, "/cockpit/portfolio")).toBe(groups[0]!.items[0]!.href);
    expect(resolveActiveHref(groups, "/cockpit/portfolio/inconnue")).toBeNull();
  });
});

describe("navigation de production et banque d’assets", () => {
  const documents = "/cockpit/brand/deliverables";
  const studio = `${documents}?tab=production`;

  it("distingue le studio des documents sur la même route", () => {
    expect(resolveActiveHref(cockpitNavGroups, documents)).toBe(documents);
    expect(resolveActiveHref(cockpitNavGroups, documents, "tab=documents&strategy=brand")).toBe(documents);
    expect(resolveActiveHref(cockpitNavGroups, documents, "strategy=brand&tab=production&operator=team")).toBe(studio);
    expect(resolveActiveHref(cockpitNavGroups, `${documents}/DEVOTION-LADDER`)).toBe(documents);
    expect(resolveActiveHref(cockpitNavGroups, "/cockpit/brand/assets")).toBe("/cockpit/brand/assets");
  });

  it("transporte le dossier et l’équipe sans transporter les filtres d’une autre page", () => {
    const href = withCockpitContext(studio, "strategyId=brand&operator=team&tab=old&page=4&search=other");
    expect(href).toBe(`${studio}&strategy=brand&operator=team`);
    expect(withCockpitContext("/cockpit/brand/assets#images", "strategy=brand&operator=team"))
      .toBe("/cockpit/brand/assets?strategy=brand&operator=team#images");
  });

  it("respecte une destination explicite et ne propage pas le contexte hors cockpit", () => {
    expect(withCockpitContext(`${studio}&strategy=other&operator=other-team`, "strategy=brand&operator=team"))
      .toBe(`${studio}&strategy=other&operator=other-team`);
    expect(withCockpitContext("/console/socle", "strategy=brand&operator=team")).toBe("/console/socle");
    expect(withCockpitContext("https://other.example/cockpit/brand/assets", "strategy=brand"))
      .toBe("https://other.example/cockpit/brand/assets");
  });
});
