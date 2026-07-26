/**
 * ADR-0179 — Surface streaming du LLM Gateway : verrous anti-drift (HARD).
 *
 * La surface streaming (`streaming.ts`) doit rester STRUCTURELLEMENT alignée
 * sur `callLLM` — même parité Sonnet 5, même résolution d'ordre providers,
 * mêmes gardes. Ces verrous scannent la source : toute divergence (ordre
 * hardcodé, parité recopiée au lieu de partagée, import provider direct)
 * casse le merge.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GATEWAY_DIR = join(process.cwd(), "src/server/services/llm-gateway");
const streamingSrc = readFileSync(join(GATEWAY_DIR, "streaming.ts"), "utf8");
const paritySrc = readFileSync(join(GATEWAY_DIR, "parity.ts"), "utf8");
const indexSrc = readFileSync(join(GATEWAY_DIR, "index.ts"), "utf8");

describe("ADR-0179 — parité Sonnet 5 PARTAGÉE (module parity.ts)", () => {
  it("parity.ts définit le garde-fou canonique (thinking disabled + température strippée)", () => {
    expect(paritySrc).toContain("applySonnet5Parity");
    expect(paritySrc).toContain('thinking: { type: "disabled"');
    expect(paritySrc).toContain("temperature: undefined");
  });

  it("streaming.ts consomme parity.ts — jamais une copie locale du garde-fou", () => {
    expect(streamingSrc).toMatch(/from ["']\.\/parity["']/);
    // Le littéral du garde-fou ne doit exister QUE dans parity.ts.
    expect(streamingSrc).not.toContain('thinking: { type: "disabled"');
  });

  it("index.ts (callLLM) consomme le MÊME module parity.ts", () => {
    expect(indexSrc).toMatch(/from ["']\.\/parity["']/);
    expect(indexSrc).not.toContain('thinking: { type: "disabled"');
  });
});

describe("ADR-0179 — ordre providers résolu, jamais hardcodé", () => {
  it("streaming.ts passe par resolveTextProviderOrder + buildTextProviderCandidates", () => {
    expect(streamingSrc).toContain("resolveTextProviderOrder(");
    expect(streamingSrc).toContain("buildTextProviderCandidates(");
  });

  it("streaming.ts n'importe aucun SDK provider en direct (le modèle vient de buildProviderModel)", () => {
    // Seuls les vrais imports comptent — la prose des commentaires peut citer
    // le SDK (c'est précisément l'histoire que ce module documente).
    expect(streamingSrc).not.toMatch(/from ["']@ai-sdk\/|import\(["']@ai-sdk\//);
    expect(streamingSrc).toContain("buildProviderModel(");
  });

  it("streaming.ts respecte le toggle premium + LLM_PRIMARY_PROVIDER (architecture opérateur 2026-07-16)", () => {
    expect(streamingSrc).toContain("isPremiumMode()");
    expect(streamingSrc).toContain("LLM_PRIMARY_PROVIDER");
  });
});

describe("ADR-0179 — gardes de gestion identiques à callLLM", () => {
  it("budget Thot (checkBudget) est appliqué quand strategyId est fourni", () => {
    expect(streamingSrc).toContain("checkBudget(");
  });

  it("police de débit par modèle (acquireSlot/releaseSlot)", () => {
    expect(streamingSrc).toContain("acquireSlot(");
    expect(streamingSrc).toContain("releaseSlot(");
  });

  it("circuit breaker alimenté (recordProviderFailure/Success)", () => {
    expect(streamingSrc).toContain("recordProviderFailure(");
    expect(streamingSrc).toContain("recordProviderSuccess(");
  });

  it("cost tracking non-bloquant (trackCost)", () => {
    expect(streamingSrc).toContain("trackCost(");
  });
});
