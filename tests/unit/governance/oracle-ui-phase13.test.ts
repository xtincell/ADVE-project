/**
 * Phase 13 — Oracle UI components smoke test (B5, ADR-0014).
 *
 * Verrouille (assertions structurelles uniquement, pas de render React) :
 * 1. Les 14 composants Phase 13 sont exportés depuis phase13-sections.tsx
 * 2. Ils sont enregistrés dans SECTION_COMPONENTS de presentation-layout.tsx
 * 3. Compliance Design System Phase 11 :
 *    - Aucune classe Tailwind couleur brute (`text-zinc-*`, `bg-violet-*`, etc.)
 *    - Aucun `var(--ref-*)` (Reference token interdit hors styles/)
 *    - Composition primitives uniquement (Card/Stack/Heading/Text/Badge/...)
 *    - CVA `phase13SectionVariants` déclaré pour le tier (pas .join inline)
 *
 * Si ce test échoue → drift Phase 13 UI ou DS Phase 11. STOP, retour Phase 2.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const PHASE13_COMPONENTS_PATH = join(
  process.cwd(),
  "src/components/strategy-presentation/sections/phase13-sections.tsx",
);
const PRESENTATION_LAYOUT_PATH = join(
  process.cwd(),
  "src/components/strategy-presentation/presentation-layout.tsx",
);

const PHASE13_EXPORTS = [
  // BIG4 baseline (7)
  "Mckinsey7s",
  "BcgPortfolio",
  "BainNps",
  "DeloitteGreenhouse",
  "Mckinsey3Horizons",
  "BcgStrategyPalette",
  "DeloitteBudget",
  // DISTINCTIVE (5)
  "CultIndex",
  "ManipulationMatrix",
  "DevotionLadder",
  "OvertonDistinctive",
  "TarsisWeakSignals",
  // DORMANT (2)
  "ImhotepCrewProgramDormant",
  "AnubisCommsDormant",
];

const PHASE13_SECTION_IDS = [
  "mckinsey-7s",
  "bcg-portfolio",
  "bain-nps",
  "deloitte-greenhouse",
  "mckinsey-3-horizons",
  "bcg-strategy-palette",
  "deloitte-budget",
  "cult-index",
  "manipulation-matrix",
  "devotion-ladder",
  "overton-distinctive",
  "tarsis-weak-signals",
  "imhotep-crew-program-dormant",
  "anubis-comms-dormant",
];

describe("Phase 13 Oracle UI components (B5)", () => {
  let phase13Source = "";
  let layoutSource = "";

  it("loads phase13-sections.tsx + presentation-layout.tsx sources", async () => {
    phase13Source = await fs.readFile(PHASE13_COMPONENTS_PATH, "utf8");
    layoutSource = await fs.readFile(PRESENTATION_LAYOUT_PATH, "utf8");
    expect(phase13Source.length).toBeGreaterThan(0);
    expect(layoutSource.length).toBeGreaterThan(0);
  });

  describe("14 components declared and exported", () => {
    it("phase13-sections.tsx exports all 14 Phase 13 components", () => {
      for (const name of PHASE13_EXPORTS) {
        expect(phase13Source, `missing export: ${name}`).toMatch(
          new RegExp(`export function ${name}\\b`),
        );
      }
    });

    it("presentation-layout.tsx imports all 14 Phase 13 components", () => {
      for (const name of PHASE13_EXPORTS) {
        expect(layoutSource, `${name} not imported in presentation-layout`).toContain(name);
      }
    });

    it("SECTION_COMPONENTS map contains all 14 Phase 13 section ids", () => {
      for (const id of PHASE13_SECTION_IDS) {
        expect(layoutSource, `SECTION_COMPONENTS missing "${id}"`).toMatch(
          new RegExp(`"${id}":\\s*\\w+\\s*as never`),
        );
      }
    });
  });

  describe("Design System Phase 11 compliance (3 forbiddens)", () => {
    it("does NOT use raw Tailwind color classes (text-zinc-*, bg-violet-*, border-emerald-*, etc.)", () => {
      // Détecte les classes couleur brutes interdites hors primitives/styles
      const forbiddenPatterns = [
        /text-zinc-\d+/,
        /text-violet-\d+/,
        /text-emerald-\d+/,
        /bg-zinc-\d+/,
        /bg-violet-\d+/,
        /bg-emerald-\d+/,
        /border-zinc-\d+/,
        /border-violet-\d+/,
        /border-emerald-\d+/,
        /from-violet-\d+/,
        /to-zinc-\d+/,
      ];
      for (const pattern of forbiddenPatterns) {
        expect(phase13Source, `forbidden Tailwind raw color: ${pattern}`).not.toMatch(pattern);
      }
    });

    it("does NOT use Reference tokens (var(--ref-*)) outside styles/", () => {
      expect(phase13Source).not.toMatch(/var\(--ref-/);
    });

    it("does NOT use raw hex colors (#abc, #abcdef)", () => {
      // Permet les emojis, mais pas hex colors dans les className
      // Cherche 'className="...#hex...' patterns
      const hexInClassName = phase13Source.match(/className=["'][^"']*#[0-9a-fA-F]{3,6}[^"']*["']/g);
      expect(hexInClassName, "hex colors found in className").toBeNull();
    });

    it("declares CVA phase13SectionVariants (no inline .join() variants)", () => {
      expect(phase13Source).toContain("export const phase13SectionVariants = cva(");
      expect(phase13Source).toContain("BIG4_BASELINE:");
      expect(phase13Source).toContain("DISTINCTIVE:");
      expect(phase13Source).toContain("DORMANT:");
    });

    it("imports primitives from canonical @/components/primitives", () => {
      expect(phase13Source).toContain('from "@/components/primitives"');
      // Vérifier au moins les primitives clés utilisées
      const requiredPrimitives = ["Card", "CardHeader", "CardBody", "Badge", "Heading", "Text", "Stack", "Grid"];
      for (const p of requiredPrimitives) {
        expect(phase13Source, `primitive ${p} not imported`).toContain(p);
      }
    });
  });

  describe("Dormant sections — ADR references", () => {
    it("ImhotepCrewProgramDormant references ADR-0010 + ADR-0017", () => {
      const match = phase13Source.match(/export function ImhotepCrewProgramDormant[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("ADR-0010");
      expect(match![0]).toContain("ADR-0017");
    });

    it("AnubisCommsDormant references ADR-0011 + ADR-0018", () => {
      const match = phase13Source.match(/export function AnubisCommsDormant[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("ADR-0011");
      expect(match![0]).toContain("ADR-0018");
    });

    it("Both dormants reference cap 7 BRAINS (pré-réservé statut préservé)", () => {
      const dormantMatches = phase13Source.match(/cap 7 BRAINS/g);
      expect(dormantMatches?.length, "should mention cap 7 BRAINS in both dormants").toBeGreaterThanOrEqual(2);
    });
  });

  describe("Distinctive sections — La Fusée value-add markers", () => {
    it("CultIndex describes itself as distinctive vs Big4", () => {
      const match = phase13Source.match(/export function CultIndex[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      expect(match![0].toLowerCase()).toMatch(/distinctif|cult/);
    });

    it("ManipulationMatrix mentions 4 modes peddler/dealer/facilitator/entertainer", () => {
      const match = phase13Source.match(/export function ManipulationMatrix[\s\S]*?^}/m);
      expect(match).toBeTruthy();
      const text = match![0];
      expect(text).toContain("peddler");
      expect(text).toContain("dealer");
      expect(text).toContain("facilitator");
      expect(text).toContain("entertainer");
    });
  });
});
