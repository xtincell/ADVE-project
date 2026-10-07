import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => initial === "overview" ? ["identity", vi.fn()] : react.useState(initial) };
});
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  brandNode: { workspace: { useQuery: () => ({ data: state.data, refetch: vi.fn() }) } },
} }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useStrategy: () => ({ setStrategyId: vi.fn() }) }));
vi.mock("@/components/portfolio/PortfolioReferencesForm", () => ({ PortfolioReferencesForm: () => null }));
import { BrandWorkspace, writeOrigin } from "@/components/portfolio/BrandWorkspace";
function render(author: string | null = "seed-spawt", hasHistory = true) {
  const root = { id: "brand", name: "Marque de recette", slug: "fixture", operatorId: "team", strategyId: "strategy", sourceRefs: [] };
  state.data = { root, nodes: [root], barre: null, inheritedFrom: null, referenceIssues: [],
    sourceStatus: "NOT_CONNECTED", strategies: [{ id: "strategy", name: "Dossier de recette", dataSources: [], campaigns: [], brandAssets: [],
      pillars: [{ key: "a", currentVersion: 3, validationStatus: "VALIDATED", staleAt: null,
        versions: hasHistory ? [{ version: 3, author, createdAt: new Date("2026-07-14T12:00:00Z"), reason: "Initial seed" }] : [] }],
    }],
  };
  return renderToStaticMarkup(createElement(BrandWorkspace, { nodeId: root.id }));
}
describe("état enregistré et preuve d’écriture restent distincts", () => {
  it("ne présente plus un état importé comme une approbation sans provenance", () => {
    const html = render();
    expect(html).toContain("État enregistré : Validé");
    expect(html).toContain("version 3");
    expect(html).toContain("Dernière écriture : Import initial");
    expect(html).toContain("ne constitue pas une preuve d’approbation");
  });
  it("une modification opérateur n’est pas rebaptisée validation", () => {
    const html = render("OPERATOR:fixture-user");
    expect(html).toContain("Modification par un opérateur");
    expect(html).not.toContain("Validé par");
    expect(html).not.toContain("fixture-user");
  });
  it("l’absence d’historique reste visible sans auteur inventé", () => {
    const html = render(null, false);
    expect(html).toContain("Historique d’écriture indisponible");
    expect(html).not.toContain("Dernière écriture");
  });
  it("ne transforme pas un auteur inconnu en décision humaine", () => {
    expect(writeOrigin("migration-inconnue")).toBe("Origine à qualifier");
    expect(writeOrigin(null)).toBe("Origine à qualifier");
    expect(writeOrigin("AUTO_FILLER")).toBe("Traitement assisté");
  });
});
