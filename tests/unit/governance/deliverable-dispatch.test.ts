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
    expect(fn).toContain("generativeTaskId: taskId ?? null");
    expect(fn).not.toContain("sequenceExecutionId: taskId");
    expect(fn).toMatch(/DEFERRED|différée/);
    // Plus aucun `void input.*` dans le corps de composeDeliverable (dispatch réel).
    expect(composer.includes("void input.previewOnly")).toBe(false);
    expect(composer.includes("void input.campaignId")).toBe(false);
    expect(composer.includes("void getGloryTool")).toBe(false);
  });

  it("dette 4.11.a — l'outil cible n'est jamais appelé sans ses entrées obligatoires résolues", () => {
    const fn = composer.slice(composer.indexOf("async function dispatchForge"));
    expect(fn).toContain("planTargetInputs(");
    expect(fn).toContain("requiredInputs:");
    // Le manque est refusé avant la réservation de l'aperçu (aucun appel, aperçu réutilisable).
    expect(composer.indexOf('status: "MISSING_INPUTS"')).toBeGreaterThan(-1);
    expect(composer.indexOf('status: "MISSING_INPUTS"')).toBeLessThan(composer.indexOf("await claimProductionPreview("));
    const commandant = read("src/server/services/artemis/commandant.ts");
    expect(commandant).toContain('result.status === "MISSING_INPUTS"');
    expect(commandant).toContain("missingInputs");
    // Le moteur refuse une entrée obligatoire absente avant l'émission INVOKE_GLORY_TOOL.
    const engine = read("src/server/services/artemis/tools/engine.ts");
    const guard = engine.indexOf("throw new MissingToolInputsError(");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(engine.indexOf('intentKind: "INVOKE_GLORY_TOOL"'));
  });

  it("dette 4.11.a — chaque livrable cible déclare ses entrées obligatoires et leur origine", async () => {
    const { TARGET_INPUT_CONTRACT } = await import("@/server/services/deliverable-orchestrator/target-inputs");
    const { SUPPORTED_TARGET_KINDS, getProducerSlug } = await import("@/server/services/deliverable-orchestrator/target-mapping");
    const { getGloryTool } = await import("@/server/services/artemis/tools/registry");
    const { resolveRequirements } = await import("@/server/services/deliverable-orchestrator/resolver");
    for (const kind of SUPPORTED_TARGET_KINDS) {
      const tool = getGloryTool(getProducerSlug(kind)!)!;
      const contract = TARGET_INPUT_CONTRACT[kind];
      // Chaque champ déclaré par l'outil est classé, et rien d'autre.
      expect(Object.keys(contract).sort(), kind).toEqual([...tool.inputFields].sort());
      const rules = Object.entries(contract);
      expect(rules.some(([, r]) => r.required), `${kind} sans entrée obligatoire`).toBe(true);
      const requires = resolveRequirements(kind).briefDag.find(n => n.depth === 0)!.requires;
      for (const [field, rule] of rules) {
        if (rule.required) expect(rule.sources.length, `${kind}.${field}`).toBeGreaterThan(0);
        expect(rule.label.trim().length, `${kind}.${field}`).toBeGreaterThan(0);
        for (const source of rule.sources) {
          if (source.from === "BRAND_FILE") expect(tool.pillarBindings[field], `${kind}.${field} sans liaison`).toBeTruthy();
          if (source.from === "PREREQUISITE") expect(requires, `${kind}.${field}`).toContain(source.kind);
        }
      }
    }
  });

  it("le livrable brief-only (sans forgeOutput) est un dispatch valide sans forge", () => {
    const fn = composer.slice(composer.indexOf("async function dispatchForge"));
    expect(fn).toContain("if (!chain.shouldChain)");
    expect(fn).toContain('status: "DISPATCHED"');
  });
});
