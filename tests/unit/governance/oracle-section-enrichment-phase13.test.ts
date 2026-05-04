/**
 * Phase 13 — SECTION_ENRICHMENT B4 completeness + flag _oracleEnrichmentMode test.
 *
 * Verrouille (sans run engine — assertions structurelles uniquement) :
 * 1. Les 14 nouvelles sections Phase 13 sont déclarées dans SECTION_ENRICHMENT
 * 2. Chaque entry a `_glorySequence` pointant vers une séquence Phase 13 valide
 * 3. Chaque entry a `_brandAssetKind` valide (BrandAssetKind enum)
 * 4. Imhotep+Anubis Neteru Ground (Phase 14/15 ADR-0019/0020) ont `_skipSequenceExecution: true`
 *    + sequenceKey IMHOTEP-CREW/ANUBIS-COMMS (ex-`_isDormant`, retiré par ADR-0045)
 * 5. Le pillar mapping est cohérent (pillar valide A/D/V/E/R/T/I/S lowercase)
 *
 * Le test du flag `_oracleEnrichmentMode` court-circuitant chainGloryToPtah viendra
 * avec un test d'intégration mockant sequence-executor (B4 résidu, à faire avant merge).
 *
 * Si ce test échoue → drift Phase 13 SECTION_ENRICHMENT. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { isBrandAssetKind } from "@/domain/brand-asset-kinds";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import { ALL_SEQUENCES } from "@/server/services/artemis/tools/sequences";

describe("Phase 13 SECTION_ENRICHMENT B4 + Neteru Ground writeback (ADR-0045 cleanup)", () => {
  // Lire le fichier source pour extraire les entrées (SECTION_ENRICHMENT n'est pas exporté)
  let sourceContent = "";
  it("loads enrich-oracle.ts source for structural assertions", async () => {
    sourceContent = await fs.readFile(
      join(process.cwd(), "src/server/services/strategy-presentation/enrich-oracle.ts"),
      "utf8",
    );
    expect(sourceContent.length).toBeGreaterThan(0);
  });

  describe("14 new Phase 13 SECTION_ENRICHMENT entries (B4)", () => {
    const PHASE13_SECTION_IDS = [
      "mckinsey-7s", "bcg-portfolio", "bain-nps", "deloitte-greenhouse",
      "mckinsey-3-horizons", "bcg-strategy-palette", "deloitte-budget",
      "cult-index", "manipulation-matrix", "devotion-ladder",
      "overton-distinctive", "tarsis-weak-signals",
      "imhotep-crew-program", "anubis-plan-comms",
    ];

    it("declares all 14 sections in SECTION_ENRICHMENT", () => {
      for (const id of PHASE13_SECTION_IDS) {
        expect(sourceContent.includes(`"${id}":`), `missing entry "${id}"`).toBe(true);
      }
    });

    it("each entry uses _glorySequence pointing to a valid Phase 13 sequence", () => {
      const validSequenceKeys = new Set(ALL_SEQUENCES.map((s) => s.key));
      for (const id of PHASE13_SECTION_IDS) {
        const entryMatch = sourceContent.match(new RegExp(`"${id}":\\s*\\{[^}]*_glorySequence:\\s*"([^"]+)"`));
        expect(entryMatch, `entry "${id}" missing _glorySequence`).toBeTruthy();
        const seqKey = entryMatch![1]!;
        expect(validSequenceKeys.has(seqKey as never), `${id} → ${seqKey} not in ALL_SEQUENCES`).toBe(true);
      }
    });

    it("each entry uses _brandAssetKind that is a valid BrandAssetKind enum value", () => {
      for (const id of PHASE13_SECTION_IDS) {
        const entryMatch = sourceContent.match(new RegExp(`"${id}":\\s*\\{[^}]*_brandAssetKind:\\s*"([^"]+)"`));
        expect(entryMatch, `entry "${id}" missing _brandAssetKind`).toBeTruthy();
        const kind = entryMatch![1]!;
        expect(isBrandAssetKind(kind), `${id} → kind=${kind} invalid`).toBe(true);
      }
    });

    it("section_registry brandAssetKind matches SECTION_ENRICHMENT _brandAssetKind", () => {
      for (const id of PHASE13_SECTION_IDS) {
        const meta = SECTION_REGISTRY.find((s) => s.id === id);
        expect(meta, `section "${id}" missing from SECTION_REGISTRY`).toBeDefined();
        const entryMatch = sourceContent.match(new RegExp(`"${id}":\\s*\\{[^}]*_brandAssetKind:\\s*"([^"]+)"`));
        const enrichKind = entryMatch![1]!;
        expect(meta!.brandAssetKind, `${id} brandAssetKind drift between registry and enrichment`).toBe(enrichKind);
      }
    });
  });

  describe("Neteru Ground sections (Imhotep + Anubis writeback-only, Phase 14/15 ADR-0045)", () => {
    it("imhotep-crew-program has _skipSequenceExecution: true + _glorySequence IMHOTEP-CREW", () => {
      const entryMatch = sourceContent.match(/"imhotep-crew-program":\s*\{[^}]*\}/);
      expect(entryMatch).toBeTruthy();
      expect(entryMatch![0]).toContain("_skipSequenceExecution: true");
      expect(entryMatch![0]).toContain('_glorySequence: "IMHOTEP-CREW"');
      expect(entryMatch![0]).toContain('_brandAssetKind: "GENERIC"');
    });

    it("anubis-plan-comms has _skipSequenceExecution: true + _glorySequence ANUBIS-COMMS", () => {
      const entryMatch = sourceContent.match(/"anubis-plan-comms":\s*\{[^}]*\}/);
      expect(entryMatch).toBeTruthy();
      expect(entryMatch![0]).toContain("_skipSequenceExecution: true");
      expect(entryMatch![0]).toContain('_glorySequence: "ANUBIS-COMMS"');
      expect(entryMatch![0]).toContain('_brandAssetKind: "GENERIC"');
    });

    it("anti-drift — no _isDormant: true flag should remain in SECTION_ENRICHMENT (ADR-0045)", () => {
      // On vise le drift réel (déclaration runtime) ; les commentaires
      // explicitement historiques ("`_isDormant` (Phase 13 ...)") sont autorisés.
      expect(sourceContent).not.toMatch(/_isDormant:\s*true/);
    });
  });

  describe("BrandAsset promotion helper exists", () => {
    it("promoteSectionToBrandAsset function declared with Loi 1 altitude check", () => {
      expect(sourceContent).toContain("async function promoteSectionToBrandAsset");
      expect(sourceContent).toContain("ACTIVE existant → SKIP (Loi 1 altitude)");
      expect(sourceContent).toContain('state: "DRAFT"'); // create new in DRAFT
    });

    it("idempotent on (strategyId, kind) — UPDATE existing DRAFT, CREATE new otherwise", () => {
      expect(sourceContent).toContain("findFirst");
      expect(sourceContent).toContain("brandAsset.update");
      expect(sourceContent).toContain("brandAsset.create");
    });
  });

  describe("Flag _oracleEnrichmentMode passed to executeSequence", () => {
    it("enrichAllSections passes { _oracleEnrichmentMode: true } to executeSequence", () => {
      // Vérifier que le flag est passé dans le 3ème argument de executeSequence
      expect(sourceContent).toMatch(/executeSequence\([^)]*_oracleEnrichmentMode:\s*true/);
    });

    it("imports executeSequence from artemis/tools/sequence-executor (canonical path)", () => {
      expect(sourceContent).toContain('import("@/server/services/artemis/tools/sequence-executor")');
    });
  });
});
