import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
  useSearchParams: () => { throw new Promise(() => {}); },
}));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "brand-fixture" }));
vi.mock("@/components/shared/loading-skeleton", () => ({
  SkeletonPage: () => React.createElement("p", {}, "Chargement des assets"),
}));
import AssetsPage from "@/app/(cockpit)/cockpit/brand/assets/page";

afterEach(() => vi.unstubAllGlobals());

it("conserve la page et son attente locale quand les paramètres d’asset suspendent au prérendu", () => {
  vi.stubGlobal("React", React);
  const html = renderToString(React.createElement("main", {},
    React.createElement("h1", {}, "Bibliothèque de marque"),
    React.createElement(AssetsPage),
  ));
  expect(html).toContain("Bibliothèque de marque");
  expect(html).toContain("Chargement des assets");
});
