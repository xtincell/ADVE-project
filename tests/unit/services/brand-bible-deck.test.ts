/**
 * Bible de Marque (2ᵉ livrable) — intégrité du deck + rendu PDF 16:9.
 *
 * Le deck compile la séquence BRANDBOOK-D : 1 couverture + 1 slide par étape
 * GLORY (présente → contenu ; absente → empty-state honnête). Ce test verrouille :
 *   1. le kind BRAND_BIBLE est enregistré + mappé au pilier D ;
 *   2. chaque étape GLORY active de BRANDBOOK-D résout un Glory tool (donc chaque
 *      slide a un titre) ;
 *   3. l'export produit un vrai PDF (bytes %PDF-), couverture + slides comprises,
 *      sans inventer de données (empty-state pour les sections manquantes).
 */

import { describe, it, expect, vi } from "vitest";

// compileDeliverable touche la DB → mock pour tester le chemin de RENDU pur.
vi.mock("@/server/services/artemis/tools/deliverable-compiler", () => ({
  compileDeliverable: vi.fn(async () => ({
    sequenceKey: "BRANDBOOK-D",
    name: "Le Brandbook",
    format: "PDF",
    sections: [
      {
        sourceToolSlug: "chromatic-strategy-builder",
        title: "Stratégie chromatique",
        content: {
          palette: [{ name: "Corail", hex: "#E56458", role: "primaire" }],
          rationale: "Chaleur et énergie de fusée.",
        },
        sourceType: "GLORY",
      },
    ],
    meta: {
      strategyName: "Marque Test",
      generatedAt: "2026-06-30",
      sequenceName: "Le Brandbook",
      totalSteps: 12,
      completedSteps: 1,
    },
    isComplete: false,
    missingOutputs: ["semiotic-brand-analyzer"],
  })),
}));

import { getSequence } from "@/server/services/artemis/tools/sequences";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { BRAND_ASSET_KINDS } from "@/domain/brand-asset-kinds";
import { KIND_TO_PILLAR } from "@/server/services/source-classifier/pillar-mapping";
import { exportBrandBibleAsPdf } from "@/server/services/value-report-generator/brand-bible-pdf";
import { UPGRADERS_THEME } from "@/server/services/brand-theme";

describe("Bible de Marque — kind + spine BRANDBOOK-D", () => {
  it("le kind BRAND_BIBLE est enregistré + mappé au pilier D", () => {
    expect(BRAND_ASSET_KINDS).toContain("BRAND_BIBLE");
    expect(KIND_TO_PILLAR.BRAND_BIBLE).toBe("D");
  });

  it("BRANDBOOK-D existe et chaque étape GLORY active résout un Glory tool (slide titrée)", () => {
    const seq = getSequence("BRANDBOOK-D");
    expect(seq, "séquence BRANDBOOK-D introuvable").toBeDefined();
    const gloryRefs = seq!.steps
      .filter((s) => s.type === "GLORY" && s.status === "ACTIVE")
      .map((s) => (s as { ref: string }).ref);
    expect(gloryRefs.length).toBeGreaterThanOrEqual(8);
    for (const ref of gloryRefs) {
      expect(getGloryTool(ref), `slide ${ref} doit résoudre vers un Glory tool`).toBeTruthy();
    }
  });
});

describe("Bible de Marque — rendu PDF 16:9", () => {
  it("produit un vrai PDF (couverture + slides) sans inventer de données", async () => {
    // themeOverride → rendu pur (le thème de marque est testé séparément dans brand-theme.test.ts).
    const res = await exportBrandBibleAsPdf("strat_test", { themeOverride: UPGRADERS_THEME });
    // Bytes PDF valides.
    expect(res.pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(res.pdf.length).toBeGreaterThan(1000);
    // Couverture + au moins une slide de section.
    expect(res.slideCount).toBeGreaterThan(1);
    // Manifeste partiel → édition partielle honnête (pas de fabrication).
    expect(res.isComplete).toBe(false);
  });
});
