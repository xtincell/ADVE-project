/**
 * Phase 21 F-A.5 (ADR-0069) — Readiness UI parity
 *
 * Source unique de vérité pour le statut pillaire UI :
 *   `notoria.getDashboard` → `byPillar[k]` → `getPillarChipStatus(...)`
 *
 * Tout calcul direct du statut depuis `pillar.completionLevel` /
 * `pillar.validationStatus` / `cl[k] === "COMPLET"` dans les composants UI
 * est un drift narratif (cf. doctrine NEFER, ADR-0060 manual-first parity).
 *
 * Mode soft baseline 5 — autorise les patterns existants tant que le compteur
 * ne grimpe pas. Promotion hard quand baseline=0 (audit complet).
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const COMPONENTS_DIR = path.resolve(__dirname, "../../../src/components");
const NOTORIA_PAGE = path.resolve(__dirname, "../../../src/components/cockpit/notoria/notoria-page.tsx");
const HELPER = path.resolve(__dirname, "../../../src/components/cockpit/notoria/lib/pillar-chip-status.ts");
const GETDASHBOARD = path.resolve(__dirname, "../../../src/server/trpc/routers/notoria.ts");

const BASELINE_DIRECT_PATTERNS = 5;

describe("ADR-0069 — Notoria getDashboard exposes byPillar (canonical)", () => {
  it("notoria.ts imports getStrategyReadiness", () => {
    const src = fs.readFileSync(GETDASHBOARD, "utf8");
    expect(src).toContain("getStrategyReadiness");
  });

  it("getDashboard return shape includes `byPillar`", () => {
    const src = fs.readFileSync(GETDASHBOARD, "utf8");
    expect(src).toContain("byPillar");
    expect(src).toMatch(/byPillar:\s*\{?/);
  });

  it("byPillar projection includes stale + displayLabel + rtisCascadeReady", () => {
    const src = fs.readFileSync(GETDASHBOARD, "utf8");
    expect(src).toContain("stale: p.stale");
    expect(src).toContain("displayLabel: p.displayLabel");
    expect(src).toContain("rtisCascadeReady: p.gates.RTIS_CASCADE.ok");
  });
});

describe("ADR-0069 — pillar-chip-status helper exists and is canonical", () => {
  it("helper file exists at canonical path", () => {
    expect(fs.existsSync(HELPER)).toBe(true);
  });

  it("helper exports getPillarChipStatus + isPillarReadyForCascade + types", () => {
    const src = fs.readFileSync(HELPER, "utf8");
    expect(src).toContain("export function getPillarChipStatus");
    expect(src).toContain("export function isPillarReadyForCascade");
    expect(src).toContain("export type PillarChipVariant");
    expect(src).toContain("export interface PillarChipStatus");
    expect(src).toContain("export interface PillarReadinessProjection");
  });
});

describe("ADR-0069 — notoria-page consumes the helper", () => {
  it("notoria-page.tsx imports getPillarChipStatus", () => {
    const src = fs.readFileSync(NOTORIA_PAGE, "utf8");
    expect(src).toContain("getPillarChipStatus");
    expect(src).toContain("./lib/pillar-chip-status");
  });

  it("notoria-page.tsx no longer hardcodes COMPLETION_COLORS as a Record literal", () => {
    const src = fs.readFileSync(NOTORIA_PAGE, "utf8");
    // Le mapping legacy doit avoir été supprimé. Nous interdisons sa
    // re-déclaration locale (mais autorisons les références dans des
    // commentaires expliquant le retrait).
    const codeOnly = src
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(codeOnly).not.toContain("COMPLETION_COLORS: Record<string, string>");
  });

  it("notoria-page.tsx isReady() goes through chipStatus", () => {
    const src = fs.readFileSync(NOTORIA_PAGE, "utf8");
    expect(src).toContain("chipStatus(k).isReadyForCascade");
  });
});

describe("ADR-0069 — Anti-drift baseline (mode soft)", () => {
  it("count of direct cl[k]===COMPLET / completionLevel === COMPLET in components stays under baseline", () => {
    let count = 0;
    walkTs(COMPONENTS_DIR, (filePath) => {
      // Skip helper itself + tests
      if (filePath.endsWith("/lib/pillar-chip-status.ts")) return;
      const src = fs.readFileSync(filePath, "utf8");
      // Pattern A : `cl[k] === "COMPLET"` ou similaires
      const a = src.match(/\b(?:cl|completionLevels?)\s*\[[^\]]+\]\s*===\s*["']COMPLET/g);
      // Pattern B : `=== "COMPLET" ||` souvent suivi de FULL
      const b = src.match(/===\s*["']COMPLET["']\s*\|\|\s*[^"]*===\s*["']FULL/g);
      count += (a?.length ?? 0) + (b?.length ?? 0);
    });
    expect(count).toBeLessThanOrEqual(BASELINE_DIRECT_PATTERNS);
  });
});

// ── helpers ──

function walkTs(dir: string, cb: (filePath: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTs(full, cb);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      cb(full);
    }
  }
}
