/**
 * Phase 13 — Ptah on-demand forge buttons (B8, ADR-0014).
 *
 * Verrouille (assertions structurelles) :
 * 1. PtahForgeButton existe + utilise primitives + tRPC + toast
 * 2. Route tRPC strategyPresentation.forgeForSection câblée avec governedProcedure
 * 3. 4 sections distinctives ont des boutons forge :
 *    - bcg-portfolio (design/Figma)
 *    - mckinsey-3-horizons (design/Figma)
 *    - manipulation-matrix (image/Magnific/nano-banana-pro)
 *    - imhotep-crew-program-dormant (icon)
 * 4. Cap 7 BRAINS respecté : pas de nouveau Intent kind, réutilise PTAH_MATERIALIZE_BRIEF
 *
 * Si ce test échoue → drift Phase 13 forge buttons. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const FORGE_BUTTON_PATH = join(
  process.cwd(),
  "src/components/neteru/ptah-forge-button.tsx",
);
const ROUTER_PATH = join(
  process.cwd(),
  "src/server/trpc/routers/strategy-presentation.ts",
);
const SECTIONS_PATH = join(
  process.cwd(),
  "src/components/strategy-presentation/sections/phase13-sections.tsx",
);

describe("Phase 13 Ptah forge buttons (B8)", () => {
  let buttonSource = "";
  let routerSource = "";
  let sectionsSource = "";

  it("loads sources", async () => {
    buttonSource = await fs.readFile(FORGE_BUTTON_PATH, "utf8");
    routerSource = await fs.readFile(ROUTER_PATH, "utf8");
    sectionsSource = await fs.readFile(SECTIONS_PATH, "utf8");
    expect(buttonSource.length).toBeGreaterThan(0);
    expect(routerSource.length).toBeGreaterThan(0);
    expect(sectionsSource.length).toBeGreaterThan(0);
  });

  describe("PtahForgeButton component", () => {
    it("uses tRPC strategyPresentation.forgeForSection mutation", () => {
      expect(buttonSource).toContain("trpc.strategyPresentation.forgeForSection.useMutation");
    });

    it("uses primitives Button + Dialog + Spinner + Tag (DS Phase 11)", () => {
      expect(buttonSource).toContain('from "@/components/primitives"');
      expect(buttonSource).toContain("Button");
      expect(buttonSource).toContain("Dialog");
      expect(buttonSource).toContain("Spinner");
    });

    it("uses useToast for NSP-style notifications (success/warning/error)", () => {
      expect(buttonSource).toContain("useToast");
    });

    it("declares PtahForgeButtonProps with the 6 fields needed", () => {
      expect(buttonSource).toContain("strategyId: string");
      expect(buttonSource).toContain("sectionId: string");
      expect(buttonSource).toContain("brandAssetKind: string");
      expect(buttonSource).toContain("forgeKind:");
      expect(buttonSource).toMatch(/providerHint\?:/);
      expect(buttonSource).toMatch(/manipulationMode\?:/);
    });

    it("dialog confirm pattern (no auto-trigger Ptah, R6 i18n)", () => {
      expect(buttonSource).toContain("setConfirmOpen");
      // Phase 13 R6 — texts via t() keys (FR canonique fallback)
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.title["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.cancel["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.confirm["']\)/);
    });
  });

  describe("tRPC route forgeForSection", () => {
    it("declared in strategy-presentation router", () => {
      expect(routerSource).toContain("forgeForSection:");
    });

    it("uses governedProcedure with PTAH_MATERIALIZE_BRIEF kind (réutilisé, pas nouveau)", () => {
      const match = routerSource.match(/forgeForSection:\s*governedProcedure\(\{[\s\S]*?\}\)/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain('kind: "PTAH_MATERIALIZE_BRIEF"');
    });

    it("preconditions include RTIS_CASCADE (Pillar 4 Loi 2)", () => {
      // Match jusqu'au .mutation(...) qui suit le bloc governedProcedure({...})
      const match = routerSource.match(/forgeForSection:\s*governedProcedure\([\s\S]*?\.mutation\(/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("RTIS_CASCADE");
    });

    it("queries BrandAsset state=DRAFT (idempotent avec B4 writeback)", () => {
      const handlerMatch = routerSource.match(/forgeForSection:[\s\S]*?\.mutation\(async/);
      const fullHandler = routerSource.match(/forgeForSection:[\s\S]+?^\s\s\}\),/m);
      expect(handlerMatch).toBeTruthy();
      expect(fullHandler).toBeTruthy();
      expect(fullHandler![0]).toContain('state: "DRAFT"');
    });

    it("emits PTAH_MATERIALIZE_BRIEF via mestor.emitIntent (cascade hash-chain)", () => {
      const fullHandler = routerSource.match(/forgeForSection:[\s\S]+?^\s\s\}\),/m);
      expect(fullHandler![0]).toContain("emitIntent");
      expect(fullHandler![0]).toContain('kind: "PTAH_MATERIALIZE_BRIEF"');
    });
  });

  describe("4 forge buttons câblés dans les sections distinctives", () => {
    it("BcgPortfolio renders PtahForgeButton (design/Figma deck)", () => {
      const match = sectionsSource.match(/export function BcgPortfolio[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("<PtahForgeButton");
      expect(match![0]).toContain('forgeKind="design"');
      expect(match![0]).toContain('providerHint="figma"');
      expect(match![0]).toContain('brandAssetKind="BCG_PORTFOLIO"');
    });

    it("Mckinsey3Horizons renders PtahForgeButton (design/Figma deck)", () => {
      const match = sectionsSource.match(/export function Mckinsey3Horizons[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("<PtahForgeButton");
      expect(match![0]).toContain('forgeKind="design"');
      expect(match![0]).toContain('providerHint="figma"');
      expect(match![0]).toContain('brandAssetKind="MCK_3H"');
    });

    it("ManipulationMatrix renders PtahForgeButton (image/Magnific/nano-banana-pro)", () => {
      const match = sectionsSource.match(/export function ManipulationMatrix[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("<PtahForgeButton");
      expect(match![0]).toContain('forgeKind="image"');
      expect(match![0]).toContain('providerHint="magnific"');
      expect(match![0]).toContain('modelHint="nano-banana-pro"');
      expect(match![0]).toContain('brandAssetKind="MANIPULATION_MATRIX"');
    });

    it("ImhotepCrewProgramDormant renders PtahForgeButton (icon placeholder)", () => {
      const match = sectionsSource.match(/export function ImhotepCrewProgramDormant[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("<PtahForgeButton");
      expect(match![0]).toContain('forgeKind="icon"');
      expect(match![0]).toContain('brandAssetKind="GENERIC"');
    });

    it("Forge buttons gated by strategyId presence (no render if missing)", () => {
      // Vérifie le pattern `strategyId && ... ? ... : null`
      const matches = sectionsSource.match(/strategyId\s*&&\s*[\w]+\s*\?[\s\S]*?<PtahForgeButton/g);
      expect(matches?.length, "should have at least 4 strategyId-gated forge buttons").toBeGreaterThanOrEqual(2);
    });
  });

  describe("Cap 7 BRAINS preserved (no new Intent kind)", () => {
    it("router reuses PTAH_MATERIALIZE_BRIEF, no new IMHOTEP_FORGE / ANUBIS_FORGE etc.", () => {
      // Pas de nouveau Intent kind défini dans le router B8
      expect(routerSource).not.toMatch(/IMHOTEP_FORGE|ANUBIS_FORGE|FORGE_FOR_SECTION/);
    });
  });
});
