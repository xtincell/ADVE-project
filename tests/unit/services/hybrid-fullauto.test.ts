/**
 * P3 — 3ᵉ mode HYBRID « full auto à mes risques » (ADR-0060 trichotomie).
 *
 * L'infra HYBRID couvrait déjà LLM-remplit / opérateur-injecte. Ce test couvre
 * le 3ᵉ mode : `fullAuto` bypasse la bascule manuelle sur sortie LLM Zod-invalide
 * et surface un résultat `llm-at-risk` explicitement flaggé non fiable.
 *
 * On teste le shaper pur `atRiskResult` (la décision fullAuto vs manual-required
 * vit dans `executeHybridTool` mais dépend du LLM ; le shaper est la partie
 * déterministe testable sans LLM).
 */

import { describe, expect, it } from "vitest";
import { atRiskResult } from "@/server/services/artemis/tools/engine";
import type { GloryToolDef } from "@/server/services/artemis/tools/tool-types";

const FAKE_TOOL = { slug: "demo-hybrid", layer: "HYBRID" } as unknown as GloryToolDef;

const FAILED_LLM_OUTPUT: Record<string, unknown> = {
  status: "FAILED",
  errorCode: "ZOD_VALIDATION_FAILED",
  errorMessage: "schema mismatch",
  history: [{ error: "expected number", rawSnippet: "{ score: 'high' }" }],
  _meta: { tool: "demo-hybrid", attempts: 3 },
};

describe("atRiskResult — full auto à mes risques", () => {
  it("surfaces path llm-at-risk (not manual-required)", () => {
    const r = atRiskResult(FAKE_TOOL, FAILED_LLM_OUTPUT, "intent-1");
    expect(r.path).toBe("llm-at-risk");
  });

  it("flags the output as risk-accepted + not schema-enforced", () => {
    const r = atRiskResult(FAKE_TOOL, FAILED_LLM_OUTPUT, "intent-1");
    const meta = r.output._meta as Record<string, unknown>;
    expect(meta.riskAccepted).toBe(true);
    expect(meta.schemaEnforced).toBe(false);
    expect(meta.path).toBe("llm-at-risk");
  });

  it("preserves the best-effort LLM payload (history, errorCode) for the operator", () => {
    const r = atRiskResult(FAKE_TOOL, FAILED_LLM_OUTPUT, "intent-1");
    expect(r.output.errorCode).toBe("ZOD_VALIDATION_FAILED");
    expect(r.output.history).toEqual(FAILED_LLM_OUTPUT.history);
    expect(r.intentId).toBe("intent-1");
  });

  it("persists no GloryOutput (not a schema-valid deliverable)", () => {
    const r = atRiskResult(FAKE_TOOL, FAILED_LLM_OUTPUT, null);
    expect(r.outputId).toBe("");
  });
});
