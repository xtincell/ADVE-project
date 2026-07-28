import { describe, expect, it, vi } from "vitest";

// Rendu réel du PDF composé sur un document fabriqué de toutes pièces :
// prouve que jsPDF avale la structure (pas seulement que tsc l'accepte).
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/brand-bible/compose", () => ({
  composeBrandBible: async () => ({
    strategyId: "s1",
    brandName: "SPAWT",
    generatedAt: new Date(0),
    sections: [
      {
        pillarKey: "A", storageKey: "a", title: "Authenticité", role: "Identité",
        blurb: "Fondation", completionPct: 62,
        entries: [
          { field: "archetype", label: "Archetype", value: "EXPLORATEUR", provenance: "HUMAN" },
          { field: "ikigai", label: "Ikigai de marque", value: { love: "la table", competence: "le goût" }, provenance: "SOURCE" },
        ],
        missing: [{ field: "citationFondatrice", label: "Citation fondatrice" }],
        citations: [{ sourceId: "src1", fileName: "PRD.pdf", certainty: "OFFICIAL", excerpt: "Le Palais compte cinq axes." }],
      },
      {
        pillarKey: "D", storageKey: "d", title: "Distinction", role: "Signature",
        blurb: "Ce qui distingue", completionPct: null,
        entries: [], missing: [{ field: "univers", label: "Univers" }], citations: [],
      },
    ],
    coverage: { filled: 2, total: 4, pct: 62 },
    sourcesUsed: 1,
    retrieval: "SEMANTIC",
  }),
}));
vi.mock("@/server/services/brand-theme", async (orig) => {
  const m = await (orig as () => Promise<Record<string, unknown>>)();
  return { ...m, resolveBrandTheme: async () => (m as { UPGRADERS_THEME: unknown }).UPGRADERS_THEME };
});

describe("livre de marque — rendu PDF réel", () => {
  it("produit un PDF avec une page par volet", async () => {
    const { exportComposedBrandBibleAsPdf } = await import(
      "@/server/services/value-report-generator/brand-bible-pdf"
    );
    const r = await exportComposedBrandBibleAsPdf("s1");
    expect(r.pdf.length).toBeGreaterThan(1000);
    expect(r.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(r.slideCount).toBe(3); // couverture + 2 volets
    expect(r.isComplete).toBe(false); // 62% → jamais « complet »
  });

  it("le contenu déclaré, sa provenance et ses citations atterrissent dans le PDF", async () => {
    const { exportComposedBrandBibleAsPdf } = await import(
      "@/server/services/value-report-generator/brand-bible-pdf"
    );
    const { pdf } = await exportComposedBrandBibleAsPdf("s1");
    const { PDFParse } = await import("pdf-parse");
    const { text } = await new PDFParse({ data: new Uint8Array(pdf) }).getText();

    expect(text).toContain("SPAWT");
    expect(text).toContain("Archetype");
    expect(text).toContain("EXPLORATEUR");
    // La provenance voyage avec la valeur — c'est tout l'intérêt du livre.
    expect(text).toContain("HUMAN");
    // Le document cité est nommé.
    expect(text).toContain("PRD.pdf");
    // Un volet sans rien de déclaré le DIT, au lieu de disparaître.
    expect(text).toMatch(/Rien de declare sur ce volet/);
    // Et ce qui manque est nommé.
    expect(text).toContain("Citation fondatrice");
  });
});
