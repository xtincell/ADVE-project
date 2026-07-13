/**
 * Anti-drift — COMPOSE_DELIVERABLE mode DISPATCHED (ADR-0136, audit T3).
 *
 * Le composer était figé en PREVIEW (inputs `void`és, « commit 4 » jamais
 * livré). Le dispatch réel réutilise `executeTool` + `chainGloryToPtah`
 * (primitives éprouvées), PAS de refactor du moteur `executeSequence`.
 *
 * Invariants :
 *   1. `chainGloryToPtah` est exporté (primitive réutilisée par le composer) ;
 *   2. le dispatch est DORMANT par défaut : PREVIEW tant que `previewOnly`
 *      n'est pas EXPLICITEMENT `false` (backward-compat — aucun caller existant
 *      ne passe false) ;
 *   3. le chemin DISPATCHED appelle `executeTool` + `chainGloryToPtah`, honore
 *      operatorId/campaignId/overrideManipulationMode (plus de `void`) ;
 *   4. honnêteté sans clés : taskId absent → statut DISPATCHED + summary
 *      « DEFERRED » (jamais un faux succès).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0136 — COMPOSE_DELIVERABLE dispatch", () => {
  const composer = read("src/server/services/deliverable-orchestrator/composer.ts");
  const executor = read("src/server/services/artemis/tools/sequence-executor.ts");

  it("chainGloryToPtah est exporté (réutilisé par le composer)", () => {
    expect(executor).toContain("export async function chainGloryToPtah(");
  });

  it("dispatch dormant par défaut : PREVIEW sauf previewOnly === false explicite", () => {
    expect(composer).toContain('if (input.previewOnly !== false) {');
    // Le retour PREVIEW précède le dispatch.
    const previewIdx = composer.indexOf('status: "PREVIEW"');
    const dispatchIdx = composer.indexOf("return dispatchForge(");
    expect(previewIdx).toBeGreaterThan(-1);
    expect(dispatchIdx).toBeGreaterThan(previewIdx);
  });

  it("le chemin DISPATCHED exécute le tool + chaîne vers Ptah", () => {
    const fn = composer.slice(composer.indexOf("async function dispatchForge"));
    expect(fn).toContain("executeTool(targetSlug, input.strategyId");
    expect(fn).toContain("chainGloryToPtah({");
    expect(fn).toContain("shouldChainPtahForge(");
    // Les inputs jadis void'és sont désormais consommés.
    expect(fn).toContain("input.overrideManipulationMode");
    expect(fn).toContain("input.campaignId");
  });

  it("honnêteté sans clés : DEFERRED surfacé, jamais de faux succès", () => {
    const fn = composer.slice(composer.indexOf("async function dispatchForge"));
    expect(fn).toContain("sequenceExecutionId: taskId ?? null");
    expect(fn).toMatch(/DEFERRED|différée/);
    // Plus aucun `void input.*` dans le corps de composeDeliverable (dispatch réel).
    expect(composer.includes("void input.previewOnly")).toBe(false);
    expect(composer.includes("void input.campaignId")).toBe(false);
    expect(composer.includes("void getGloryTool")).toBe(false);
  });

  it("le livrable brief-only (sans forgeOutput) est un dispatch valide sans forge", () => {
    const fn = composer.slice(composer.indexOf("async function dispatchForge"));
    expect(fn).toContain("if (!chain.shouldChain)");
    expect(fn).toContain('status: "DISPATCHED"');
  });
});
