/**
 * Phase 13 R1 — Test E2E flag _oracleEnrichmentMode (closure résidu B4).
 *
 * Verrouille la décision de chainage Glory→Brief→Forge selon le flag :
 * - `_oracleEnrichmentMode: true` → SKIP `chainGloryToPtah` (Ptah à la demande)
 * - `_oracleEnrichmentMode: false/absent` → CHAIN cascade hash-chain f9cd9de
 *
 * Test isolé via le helper pur `shouldChainPtahForge` extrait du
 * sequence-executor (R1). Test structurel additionnel vérifie que le helper
 * est utilisé dans la branche conditionnelle réelle.
 *
 * Si ce test échoue → drift Phase 13 contrainte "Ptah à la demande". STOP.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { shouldChainPtahForge } from "@/server/services/artemis/tools/sequence-executor";

describe("Phase 13 R1 — flag _oracleEnrichmentMode court-circuite chainGloryToPtah", () => {
  describe("shouldChainPtahForge helper (pure decision)", () => {
    it("retourne shouldChain=false si tool n'a pas de forgeOutput", () => {
      const result = shouldChainPtahForge({
        hasForgeOutput: false,
        oracleEnrichmentMode: false,
      });
      expect(result.shouldChain).toBe(false);
      expect(result.reason).toBe("no-forge-output");
    });

    it("retourne shouldChain=false si oracleEnrichmentMode=true (Ptah à la demande)", () => {
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: true,
      });
      expect(result.shouldChain).toBe(false);
      expect(result.reason).toBe("skipped-oracle-mode");
    });

    it("retourne shouldChain=true si forgeOutput présent ET oracleEnrichmentMode=false", () => {
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: false,
      });
      expect(result.shouldChain).toBe(true);
      expect(result.reason).toBe("chain-active");
    });

    it("retourne shouldChain=true si forgeOutput présent ET oracleEnrichmentMode absent (default false)", () => {
      // Simule le cas où le flag n'est pas défini dans le SequenceContext
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: false, // explicitement false (le helper ne reçoit pas undefined)
      });
      expect(result.shouldChain).toBe(true);
    });

    it("priorité du flag sur forgeOutput — si flag true même avec forgeOutput, no chain", () => {
      // Cas Phase 13 : pendant enrichOracle (B4), on passe le flag = true
      // pour que les tools forgeOutput (creative-evaluation-matrix,
      // bcg-portfolio-plotter, mckinsey-3-horizons-mapper) ne déclenchent pas
      // automatiquement la cascade Ptah.
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: true,
      });
      expect(result.shouldChain).toBe(false);
      expect(result.reason).toBe("skipped-oracle-mode");
    });
  });

  describe("Wiring dans sequence-executor.ts (B3 + R1)", () => {
    let executorSource = "";

    it("loads sequence-executor.ts source", async () => {
      executorSource = await fs.readFile(
        join(process.cwd(), "src/server/services/artemis/tools/sequence-executor.ts"),
        "utf8",
      );
      expect(executorSource.length).toBeGreaterThan(0);
    });

    it("exports shouldChainPtahForge helper", () => {
      expect(executorSource).toContain("export function shouldChainPtahForge");
    });

    it("utilise shouldChainPtahForge dans la branche conditionnelle de chainage", () => {
      expect(executorSource).toMatch(/const decision = shouldChainPtahForge\(/);
      expect(executorSource).toContain("if (decision.shouldChain && tool)");
    });

    it("log informatif présent quand reason === 'skipped-oracle-mode'", () => {
      expect(executorSource).toMatch(/decision\.reason === "skipped-oracle-mode"/);
      expect(executorSource).toContain("oracleEnrichmentMode=true — Ptah forge skipped");
    });

    it("la décision lit le flag depuis context._oracleEnrichmentMode", () => {
      expect(executorSource).toMatch(/oracleEnrichmentMode:\s*context\._oracleEnrichmentMode === true/);
    });
  });

  describe("Cascade hash-chain f9cd9de préservée hors enrichissement Oracle", () => {
    it("default behavior (no flag) → cascade complète", () => {
      // Ce qui se passe en production hors enrichOracle :
      // chainGloryToPtah est appelée pour TOUS les tools forgeOutput.
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: false,
      });
      expect(result.shouldChain).toBe(true);
    });

    it("Bouton 'Forge now' (B8) → flag false → cascade complète", () => {
      // Quand un user clique sur PtahForgeButton, la mutation forgeForSection
      // émet PTAH_MATERIALIZE_BRIEF directement via mestor.emitIntent — la
      // cascade hash-chain est toujours déclenchée. Ce helper concerne les
      // séquences qui invoquent des Glory tools chaînés.
      const result = shouldChainPtahForge({
        hasForgeOutput: true,
        oracleEnrichmentMode: false,
      });
      expect(result.shouldChain).toBe(true);
      expect(result.reason).toBe("chain-active");
    });
  });
});
