import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GuidelinesDocument } from "@/server/services/guidelines-renderer";
const query = vi.hoisted(() => ({ data: undefined as unknown, error: null as unknown, isLoading: false, isFetching: false, refetch: vi.fn() }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "fixture-brand" }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ client: { guidelines: {} } }),
  guidelines: { generate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, get: { useQuery: () => query }, shareLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) } },
} }));
import GuidelinesPage from "@/app/(cockpit)/cockpit/brand/guidelines/page";
const asset = { id: "palette", name: "Palette déclarée", version: 2, state: "DRAFT", stateLabel: "Brouillon", content: { accent: "#2155A4" }, fileUrl: null,
  provenance: { status: "UNLINKED" as const, sourceId: null, sourceName: null, certainty: null, message: "Aucun document relié à cet actif." } };
const document = { strategyId: "fixture-brand", title: "Marque de recette", generatedAt: "2026-10-08T00:00:00Z",
  identity: { logo: null, chromatic: asset, typography: null, counts: { logos: 0, palettes: 1, typographies: 0 }, activeCounts: { logos: 0, palettes: 0, typographies: 0 }, colors: { all: ["#2155A4"], accent: "#2155A4", primary: null }, fonts: { display: null, body: null, all: [] } },
  books: [], sources: [{ id: "source", name: "Guidelines <script>interdit</script>", certainty: "DECLARED", shared: false, createdAt: "2026-07-29T00:00:00Z" }],
  sections: [], score: null, classification: "LATENT", brandAssets: [], drivers: [],
} satisfies GuidelinesDocument;
describe("la page Guidelines consomme le document structuré réel", () => {
  it("rend une palette et les références sans attendre un champ html inexistant", () => {
    query.data = document;
    const html = renderToStaticMarkup(createElement(GuidelinesPage));
    expect(html).toContain("#2155A4");
    expect(html).toContain("Brouillon");
    expect(html).toContain("Cette proposition n’est pas une identité en usage");
    expect(html).toContain("Aucun document relié à cet actif");
    expect(html).toContain("Guidelines &lt;script&gt;interdit&lt;/script&gt;");
    expect(html).toContain("Consulter la source");
    expect(html).not.toContain("<script>interdit");
    expect(html).not.toContain("Aucun guideline genere");
    expect(html).not.toContain("Regenerer");
    expect(html).not.toContain("Completion");
  });
  it("un défaut de lecture reste une erreur et ne propose pas de générer des données", () => {
    query.data = undefined; query.error = { message: "Lecture refusée" };
    const html = renderToStaticMarkup(createElement(GuidelinesPage));
    expect(html).toContain("Lecture refusée"); expect(html).not.toContain("Generer");
    query.error = null;
  });
});
