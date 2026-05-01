/**
 * Phase 13 — Oracle PDF auto-snapshot pre-export (B6, ADR-0016).
 *
 * Verrouille (assertions structurelles sur le code source) :
 * 1. `loadOracle` live read assemble via assemblePresentation (plus de retour vide)
 * 2. `takeOracleSnapshot` calcule SHA256 sur content + idempotence (réutilise
 *    snapshotId existant si content inchangé)
 * 3. `ensureSnapshotForExport` wrapper auto-snapshot pre-export pour
 *    `exportOracleAsPdf` + `exportOracleAsMarkdown`
 * 4. SECTION_REGISTRY utilisé pour mapper les 35 sections (Phase 13)
 *
 * Si ce test échoue → drift Phase 13 PDF/snapshot. STOP, retour Phase 2.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const EXPORT_ORACLE_PATH = join(
  process.cwd(),
  "src/server/services/strategy-presentation/export-oracle.ts",
);

describe("Phase 13 Oracle PDF auto-snapshot pre-export (B6)", () => {
  let source = "";

  it("loads export-oracle.ts source", async () => {
    source = await fs.readFile(EXPORT_ORACLE_PATH, "utf8");
    expect(source.length).toBeGreaterThan(0);
  });

  describe("loadOracle live read (was empty pre-Phase-13)", () => {
    it("imports assemblePresentation dynamically", () => {
      expect(source).toContain('import("./index")');
      expect(source).toContain("assemblePresentation");
    });

    it("uses SECTION_REGISTRY to enumerate the 35 sections", () => {
      expect(source).toContain('import { SECTION_REGISTRY } from "./types"');
      expect(source).toMatch(/for\s*\(const\s+meta\s+of\s+SECTION_REGISTRY\)/);
    });

    it("does NOT return [] when no snapshotId provided (bug fix)", () => {
      // L'ancien code avait `return [];` sans rien faire. Maintenant il faut
      // qu'on retourne effectivement les sections assemblées.
      // Vérification : pas de pattern "return [];" suivi immédiatement de
      // commentaire "Live read" / structure vide.
      expect(source).not.toMatch(/return \[\];\s*\n\s*\}\s*\n+export async function exportOracle/);
    });
  });

  describe("takeOracleSnapshot SHA256 idempotence (ADR-0016)", () => {
    it("imports createHash from node:crypto", () => {
      expect(source).toContain('import { createHash } from "node:crypto"');
    });

    it("computes SHA256 on the live payload", () => {
      expect(source).toMatch(/createHash\(["']sha256["']\)\s*\.\s*update/);
    });

    it("queries last snapshot ordered by takenAt desc", () => {
      expect(source).toMatch(/orderBy:\s*\{\s*takenAt:\s*["']desc["']/);
    });

    it("reuses existing snapshotId if content hash matches", () => {
      expect(source).toMatch(/_contentHash\s*===\s*contentHash/);
      expect(source).toMatch(/reusedFrom:\s*lastSnapshot\.id/);
    });

    it("stores _contentHash in snapshotJson for future idempotence checks", () => {
      expect(source).toMatch(/_contentHash:\s*contentHash/);
    });

    it("returns { snapshotId, created, reusedFrom? }", () => {
      expect(source).toMatch(/created:\s*false,\s*reusedFrom/);
      expect(source).toMatch(/created:\s*true/);
    });
  });

  describe("ensureSnapshotForExport wrapper (B6 auto-snapshot pre-export)", () => {
    it("declares ensureSnapshotForExport function", () => {
      expect(source).toMatch(/async function ensureSnapshotForExport/);
    });

    it("returns early if opts.snapshotId already set (replay deterministe)", () => {
      expect(source).toMatch(/if\s*\(opts\.snapshotId\)\s*return\s+opts/);
    });

    it("calls takeOracleSnapshot when no snapshotId", () => {
      expect(source).toMatch(/await takeOracleSnapshot\(\{\s*strategyId,\s*lang:/);
    });
  });

  describe("Export functions use ensureSnapshotForExport (B6)", () => {
    it("exportOracleAsMarkdown calls ensureSnapshotForExport before loadOracle", () => {
      const match = source.match(/export async function exportOracleAsMarkdown[\s\S]*?const sections = await loadOracle/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("ensureSnapshotForExport");
    });

    it("exportOracleAsPdf calls ensureSnapshotForExport before loadOracle", () => {
      const match = source.match(/export async function exportOracleAsPdf[\s\S]*?const sections = await loadOracle/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain("ensureSnapshotForExport");
    });
  });
});
