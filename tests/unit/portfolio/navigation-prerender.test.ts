import * as React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Building2 } from "lucide-react";

const route = vi.hoisted(() => ({
  pathname: "/cockpit/brand/deliverables",
  search: "tab=production&strategy=brand-fixture&operator=team-fixture",
  suspendSearch: false,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => {
    if (route.suspendSearch) throw new Promise(() => {});
    return new URLSearchParams(route.search);
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children),
}));
vi.mock("@/lib/i18n/locale-context", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
import { Sidebar } from "@/components/navigation/sidebar";
import { MobileTabBar } from "@/components/navigation/mobile-tab-bar";

const navGroups = [{ title: "Marque", items: [
  { href: "/cockpit/brand/deliverables", label: "Livrables", icon: Building2 },
  { href: "/cockpit/brand/deliverables?tab=production", label: "Studio de production", icon: Building2 },
  { href: "/cockpit/brand/assets", label: "Banque d’assets", icon: Building2 },
] }];
const props = { navGroups, portalAccentVar: "var(--color-accent)" };

beforeEach(() => { vi.stubGlobal("React", React); route.suspendSearch = false; });
afterEach(() => vi.unstubAllGlobals());

describe.each([["bureau", Sidebar], ["mobile", MobileTabBar]] as const)("navigation partagée %s", (_name, Navigation) => {
  it("préserve les liens utiles et le contenu de page quand la recherche suspend au prérendu", () => {
    route.suspendSearch = true;
    const html = renderToString(React.createElement("div", {},
      React.createElement(Navigation, props),
      React.createElement("main", {}, "Contenu de page conservé"),
    ));
    expect(html).toContain("Contenu de page conservé");
    expect(html).toContain('href="/cockpit/brand/deliverables?tab=production"');
    expect(html).toContain("Studio de production");
    expect(html).toContain('href="/cockpit/brand/assets"');
  });

  it("conserve la marque et l’équipe lorsque les paramètres sont disponibles", () => {
    const html = renderToString(React.createElement(Navigation, props));
    expect(html).toContain('href="/cockpit/brand/deliverables?tab=production&amp;strategy=brand-fixture&amp;operator=team-fixture"');
    expect(html).toContain('href="/cockpit/brand/assets?strategy=brand-fixture&amp;operator=team-fixture"');
  });
});

it("allume le studio mobile après résolution des paramètres d’onglet", () => {
  const html = renderToString(React.createElement(MobileTabBar, props));
  expect(html).toMatch(/href="\/cockpit\/brand\/deliverables\?tab=production[^\"]*" aria-current="page"/);
  expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
});
