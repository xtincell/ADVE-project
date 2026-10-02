import { describe, expect, it } from "vitest";
import { Building2 } from "lucide-react";
import { resolveActiveHref } from "@/components/navigation/nav-active";

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
