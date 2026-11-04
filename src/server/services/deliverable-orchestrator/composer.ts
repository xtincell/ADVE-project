import { isUsableGeneration } from "@/domain/generation-result";
import { checkLawTwoPreconditions } from "./preconditions";
import { materialHandoffBlock, type ProductionPin, type ProductionSourceManifest } from "@/domain/production-sources";
import { claimProductionPreview, readProductionPreview, requireReviewedUpstream, requireReviewedManifest, resolveProductionSources } from "./production-sources";
import { productionSourceInput } from "./production-prompt";

/**
 * Deliverable Orchestrator — Composer (Phase 17b, ADR-0050 — anciennement ADR-0037).
 *
 * Public handler appelé depuis Artemis commandant pour l'Intent
 * `COMPOSE_DELIVERABLE`. Phase 17 commit 3 implémente le mode PREVIEW :
 *   1. Résout le DAG des briefs requis (resolver.ts).
 *   2. Scanne le vault pour les kinds upstream (vault-matcher.ts).
 *   3. Vérifie les pre-conditions Loi 2 (manipulationMix.primary,
 *      au moins un pilier ADVE state=ACTIVE).
 *   4. Estime le coût agrégé (LLM tools manquants + Ptah forges).
 *   5. Retourne `DeliverableComposition` complète.
 *
 * Mode DISPATCHED (commit 4 router tRPC ou ultérieur) : à partir de la
 * composition validée + confirmation user, construit une `GlorySequence`
 * runtime ad-hoc et dispatch via `sequence-executor`. Ce dispatch émet
 * `INVOKE_GLORY_TOOL` pour chaque brief manquant + `PTAH_MATERIALIZE_BRIEF`
 * pour le forge final + `PROMOTE_BRAND_ASSET_TO_ACTIVE` une fois validé.
 *
 * Layer 4 — orchestrate Layer 2/3. Lit DB via vault-matcher mais n'écrit
 * pas (PREVIEW). Le dispatch DB-write viendra avec le router tRPC.
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { resolveRequirements, extractUpstreamKinds } from "./resolver";
import { matchVault, extractToGenerate } from "./vault-matcher";
import { getProducerSlug, isSupportedTargetKind } from "./target-mapping";
import {
  MissingPreconditionPillarError,
  TargetNotForgeableError,
  type ComposeDeliverableOutput,
  type DeliverableComposition,
} from "./types";

/**
 * Coût LLM moyen estimé d'un Glory tool brief→forge (USD).
 * Reflète SLO INVOKE_GLORY_TOOL costP95Usd=0.1 + marge ; tightened au commit 4
 * quand on aura un cost-resolver précis par tool.
 */
const ESTIMATED_GLORY_TOOL_COST_USD = 0.1;

/**
 * Coût Ptah moyen estimé (USD) — DEPENDS du provider/forgeKind. Phase 17 commit 3
 * applique un coût flat conservateur. Le commit 4 lira `Ptah cost-estimator`
 * quand il deviendra accessible côté pre-flight.
 */
const ESTIMATED_PTAH_FORGE_COST_USD = 0.5;

interface ComposeDeliverableInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly targetKind: string;
  readonly campaignId?: string;
  readonly overrideManipulationMode?: "peddler" | "dealer" | "facilitator" | "entertainer";
  readonly previewOnly?: boolean;
  readonly pins?: ProductionPin[];
  readonly calendarBrief?:{assetId:string;version:number};
  readonly previewIntentId?: string;
  readonly creativeProposalId?: string;
  /** Émission parente (COMPOSE_DELIVERABLE) — lignée de la forge (ADR-0136). */
  readonly sourceIntentId?: string;
}

/**
 * Handler principal — appelé depuis Artemis commandant case
 * `COMPOSE_DELIVERABLE` (commit 4 du découpage Phase 17).
 *
 * Phase 17 commit 3 : retourne toujours en mode PREVIEW (côté DB read-only).
 * Le dispatch full async sera ajouté au commit 4 via le router tRPC.
 */
export async function composeDeliverable(
  input: ComposeDeliverableInput,
): Promise<ComposeDeliverableOutput> {
  // 1. Validation kind cible
  if (!isSupportedTargetKind(input.targetKind)) {
    throw new TargetNotForgeableError(input.targetKind as BrandAssetKind);
  }
  const targetKind = input.targetKind as BrandAssetKind;

  // 2. Résolution DAG
  const { targetSlug, briefDag } = resolveRequirements(targetKind);

  // 3. Vault scan sur les kinds upstream
  const upstreamKinds = extractUpstreamKinds(briefDag);
  const vaultMatches = await matchVault(input.strategyId, upstreamKinds, input.campaignId);

  // 4. Pre-conditions Loi 2 — manipulationMix.primary + ADVE ACTIVE
  const missingPreconditions = await checkLawTwoPreconditions(input.strategyId);

  // 5. Estimation coût agrégé
  const toGenerate = extractToGenerate(vaultMatches);
  const estimatedCostUsd =
    toGenerate.length * ESTIMATED_GLORY_TOOL_COST_USD +
    ESTIMATED_PTAH_FORGE_COST_USD; // 1 forge Ptah pour le target final

  const composition: DeliverableComposition = {
    targetKind,
    targetGloryToolSlug: targetSlug,
    briefDag,
    vaultMatches,
    estimatedCostUsd,
    missingPreconditions,
  };

  // 6. Verdict status
  if (missingPreconditions.length && (input.previewOnly === false || missingPreconditions.some(k => k === "STRATEGY_ARCHIVED" || k === "STRATEGY_NOT_FOUND"))) {
    return {
      composition,
      status: "MISSING_PRECONDITIONS",
      sequenceExecutionId: null,
      summary: `Pre-conditions Loi 2 manquantes : ${missingPreconditions.join(", ")}. Compléter via /cockpit/brand/proposition.`,
    };
  }

  // PREVIEW par défaut (backward-compatible) : le dispatch réel n'a lieu que
  // sur `previewOnly === false` EXPLICITE. Les callers existants passent
  // `previewOnly: true` (router + page forge) → comportement inchangé.
  const prior=input.previewOnly===false && input.previewIntentId ? await readProductionPreview(input.strategyId,input.previewIntentId):null;
  const sourceManifest = await resolveProductionSources(input.strategyId, input.pins ?? [], input.campaignId, input.creativeProposalId,input.calendarBrief??prior?.sourceManifest.calendarBrief);
  const materialBlock = materialHandoffBlock(sourceManifest);
  if (input.previewOnly !== false) {
    return {
      composition,
      status: "PREVIEW",
      previewIntentId: input.sourceIntentId, sourceManifest, materialBlock,
      sequenceExecutionId: null,
      summary: buildPreviewSummary(composition),
    };
  }

  // ── DISPATCHED (ADR-0136) — matérialisation réelle du livrable cible ──
  if (!input.previewIntentId) throw new Error("Préparez et relisez un aperçu avant de lancer la production.");
  const reviewed = prior!;
  if (reviewed.targetKind !== targetKind || reviewed.campaignId !== (input.campaignId ?? null) || reviewed.overrideManipulationMode !== (input.overrideManipulationMode ?? null))
    throw new Error("Le périmètre de production diffère de l’aperçu ; préparez un nouvel aperçu.");
  requireReviewedManifest(reviewed.sourceManifest, sourceManifest);
  requireReviewedUpstream(reviewed.upstreamSnapshot, vaultMatches);
  if (materialBlock) throw new Error(materialBlock);
  await claimProductionPreview(input.strategyId, input.previewIntentId, input.sourceIntentId,sourceManifest.calendarBrief);
  return dispatchForge(composition, input, targetSlug, reviewed.sourceManifest);
}

/**
 * Mode DISPATCHED (ADR-0136) — exécute le Glory tool producteur du livrable
 * cible, puis chaîne vers Ptah pour matérialiser l'asset (réutilise les
 * primitives éprouvées `executeTool` + `chainGloryToPtah`, PAS de refactor du
 * moteur de séquence). Honnête sans clés provider : la forge Ptah remonte
 * `DEFERRED_AWAITING_CREDENTIALS` (taskId absent) et le statut le reflète.
 *
 * Les briefs requis sont résolus et tracés avant toute matérialisation.
 */
async function dispatchForge(
  composition: DeliverableComposition,
  input: ComposeDeliverableInput,
  targetSlug: string,
  sourceManifest: ProductionSourceManifest,
): Promise<ComposeDeliverableOutput> {
  const tool = getGloryTool(targetSlug);
  if (!tool) {
    throw new TargetNotForgeableError(composition.targetKind);
  }

  const { executeTool } = await import("@/server/services/artemis/tools/engine");
  const { shouldChainPtahForge, chainGloryToPtah } = await import(
    "@/server/services/artemis/tools/sequence-executor"
  );

  // 1. Exécute le tool producteur (produit le brief + promeut le BrandAsset).
  const { PillarResolver } = await import("@/server/services/artemis/tools/pillar-resolver");
  const bindings = tool.pillarBindings ? (await PillarResolver.forStrategy(input.strategyId)).resolveBindingsAsStrings(tool.pillarBindings) : {};
  const selectedText = productionSourceInput(sourceManifest);
  const { prepareUpstreamBriefs } = await import("./upstream-cascade");
  const cascade = await prepareUpstreamBriefs({
    composition, strategyId: input.strategyId, operatorId: input.operatorId, campaignId: input.campaignId,
    previewIntentId: input.previewIntentId!, dispatchIntentId: input.sourceIntentId!,
    sourceText: selectedText, calendarBrief: sourceManifest.calendarBrief,
  });
  const sourceText = [selectedText, cascade.text].filter(Boolean).join("\n\n");
  const calendar=sourceManifest.calendarBrief;
  const toolInput = { ...bindings, ...(calendar ? {format:calendar.format??"",platform:calendar.platform,theme:calendar.theme??"",angle:calendar.angle??"",
    creativeFamily:calendar.family??"",creativeMode:calendar.mode,campaign_context:calendar.name,
    concept:sourceManifest.creativeProposal?.direction || calendar.angle || calendar.theme || calendar.name}:{}), ...(sourceText ? { production_sources: sourceText } : {}) };
  const run = await executeTool(targetSlug, input.strategyId, toolInput, { production: { previewIntentId: input.previewIntentId!, dispatchIntentId:input.sourceIntentId!, sourceText } });

  if (!isUsableGeneration(run.output)) throw new Error("Le brief n’a pas pu être produit. La tentative reste conservée ; aucun rendu n’a été lancé.");

  // 2. Livrable brief-only (pas de forgeOutput) : la sortie du tool EST le
  //    livrable — pas de matérialisation Ptah. Dispatch réussi sans taskId.
  const chain = shouldChainPtahForge({
    hasForgeOutput: !!tool.forgeOutput,
    oracleEnrichmentMode: false,
  });
  if (!chain.shouldChain) {
    return {
      composition,
      status: "DISPATCHED",
      previewIntentId: input.previewIntentId, sourceManifest, briefOutputId: run.outputId,
      sequenceExecutionId: null,
      summary:
        `Livrable ${composition.targetKind} produit (brief-only via ${targetSlug}, ` +
        `asset ${run.outputId || "—"}) — pas de forge Ptah requise.`,
    };
  }

  // 3. Forge : chaîne vers Ptah (matérialisation via provider). Sans clés →
  //    DEFERRED (taskId absent), honnête.
  const context: Record<string, unknown> = {};
  const effectiveMode=input.overrideManipulationMode ?? sourceManifest.mixReview?.primary;
  if (effectiveMode) context._manipulationMode = effectiveMode;
  if (input.campaignId) context._campaignId = input.campaignId;

  let materialStatus = "DEFERRED";
  const taskId = await chainGloryToPtah({
    tool,
    toolOutput: run.output,
    sourceIntentId: run.intentId ?? input.sourceIntentId ?? `compose:${composition.targetKind}`,
    strategyId: input.strategyId,
    sourceBrandAssetId:calendar?.assetId, context, calendarBrief:calendar,
    // Glory has already turned the upstream briefs into the final image prompt. Their full audit copies stay with Glory.
    productionSourceText:productionSourceInput({...sourceManifest,calendarBrief:undefined}),
    productionArtwork:sourceManifest.productionArtwork,
    productionReferences:sourceManifest.sources.flatMap(s=>s.transport==="IMAGE_REFERENCE"&&s.role==="REFERENCE"&&s.originalHash?[{assetId:s.assetId,version:s.version,originalHash:s.originalHash}]:[]), onForgeReceipt: status => { materialStatus = status; },
  });

  return {
    composition,
    status: "DISPATCHED",
    sequenceExecutionId: null,
    generativeTaskId: taskId ?? null,
    previewIntentId: input.previewIntentId, sourceManifest, briefOutputId: run.outputId,
    materialStatus,
    summary: taskId && materialStatus !== "DEFERRED"
      ? `Forge lancée pour ${composition.targetKind} (tool ${targetSlug}, tâche Ptah ${taskId}).`
      : `Forge de ${composition.targetKind} différée (provider non configuré — DEFERRED). ` +
        `Le brief est produit ; aucun rendu reçu.${taskId ? ` Tâche : ${taskId}.` : ""}`,
  };
}

// ── Helpers internes ────────────────────────────────────────────────────

function buildPreviewSummary(composition: DeliverableComposition): string {
  const total = composition.vaultMatches.length;
  const reusing = composition.vaultMatches.filter((m) => m.status === "ACTIVE_REUSE").length;
  const toRefresh = composition.vaultMatches.filter((m) => m.status === "STALE_REFRESH").length;
  const toGenerate = composition.vaultMatches.filter((m) => m.status === "MISSING_GENERATE").length;

  return (
    `PREVIEW pour ${composition.targetKind} via ${composition.targetGloryToolSlug} : ` +
    `${total} kinds upstream (${reusing} réutilisés, ${toRefresh} à rafraîchir, ${toGenerate} à générer) — ` +
    `coût estimé $${composition.estimatedCostUsd.toFixed(2)}.`
  );
}

// Re-export pour tests / consumers externes
export { resolveRequirements } from "./resolver";
export { matchVault } from "./vault-matcher";
export { getProducerSlug };
export type { DeliverableComposition, ComposeDeliverableOutput };
export { MissingPreconditionPillarError };
