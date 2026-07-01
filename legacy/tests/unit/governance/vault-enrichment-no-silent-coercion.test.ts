/**
 * Phase 21 (ADR-0067) — Vault enrichment NO silent coercion
 *
 * Avant : la coercion silencieuse (array→string join) puis `validationWarning`
 * persisté en base permettait à des recos invalides d'arriver dans la DB
 * avec un simple warning.
 *
 * Après : la coercion est SUPPRIMÉE. Le LLM passe par retry x2 outer (Zod
 * strict via `executeStructuredLLMCall`). Per-field validation rejette
 * proprement la reco au lieu de la coercer.
 *
 * Ce test verrouille la suppression — interdit la réintroduction.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const FILE = path.resolve(
  __dirname,
  "../../../src/server/services/vault-enrichment/index.ts",
);

describe("ADR-0067 — Vault enrichment silent coercion is removed", () => {
  it("file no longer contains 'sera coerce a l'application' fallback", () => {
    const src = fs.readFileSync(FILE, "utf8");
    expect(src).not.toContain("sera coerce a l'application");
  });

  it("file no longer contains the array→string join coercion path", () => {
    const src = fs.readFileSync(FILE, "utf8");
    expect(src).not.toContain('reco.proposedValue = joined');
  });

  it("file uses executeStructuredLLMCall instead of callLLMAndParse", () => {
    const src = fs.readFileSync(FILE, "utf8");
    expect(src).toContain("executeStructuredLLMCall");
    expect(src).not.toContain("from \"@/server/services/utils/llm\"");
  });

  it("file declares VaultRecommendationLLMSchema", () => {
    const src = fs.readFileSync(FILE, "utf8");
    expect(src).toContain("VaultRecommendationLLMSchema");
    expect(src).toContain("VaultEnrichmentLLMResponseSchema");
  });

  it("VaultEnrichmentResult type exposes `rejected` and `llmError`", async () => {
    const mod = await import("@/server/services/vault-enrichment");
    expect(typeof mod.enrichFromVault).toBe("function");
    // Type level check via module surface
    const result: import("@/server/services/vault-enrichment").VaultEnrichmentResult = {
      pillarKey: "a",
      recommendations: [],
      vaultSize: 0,
      rejected: [{ field: "test", reason: "schema mismatch" }],
      llmError: "x",
    };
    expect(result.rejected?.length).toBe(1);
    expect(result.llmError).toBe("x");
  });
});
