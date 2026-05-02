/**
 * OPERATOR_AMEND_PILLAR — handler (ADR-0023)
 *
 * Manual edition of an ADVE pillar field by an operator. Voie unique pour
 * que l'utilisateur puisse corriger une vision, affiner une persona,
 * ajuster une valeur fondatrice — sans attendre que Notoria propose une
 * recommandation drift-driven.
 *
 * Flow:
 *   1. Concurrency guard (expectedVersion vs Pillar.currentVersion).
 *   2. PILLAR_COHERENCE gate (LOCKED/destructive/cross-ADVE/financial).
 *   3. Cost gate Thot pre-flight if mode != PATCH_DIRECT.
 *   4. Recommendation row (status ACCEPTED, agent HUMAN, source USER_INTENT).
 *   5. writePillarAndScore (author OPERATOR) — RTIS staleness propagated
 *      automatically by the gateway (LOI 1).
 *   6. Mark Recommendation APPLIED.
 *   7. eventBus pillar.amended.cascade-due + (STRATEGIC_REWRITE only)
 *      mark dependent ACTIVE BrandAssets staleAt=now() — they stay
 *      ACTIVE (BrandAssetState enum sémantique préservée).
 *
 * Out of scope here (LLM_REPHRASE preview): the modal calls a separate
 * tRPC `pillar.previewAmend` that returns a proposed value without
 * mutation; the resolved value lands in this handler as `proposedValue`.
 */

import type { Intent, IntentResult } from "./intents";
import { applyPillarCoherenceGate } from "@/server/services/notoria/gates";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { db } from "@/lib/db";

type AmendIntent = Extract<Intent, { kind: "OPERATOR_AMEND_PILLAR" }>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

export async function operatorAmendPillar(intent: AmendIntent): Promise<HandlerResult> {
  const startedAt = Date.now();
  const {
    strategyId,
    operatorId,
    pillarKey,
    mode,
    field,
    proposedValue,
    reason,
    overrideLocked,
    expectedVersion,
  } = intent;

  // ── 0. Argument coherence (cheap guards before any DB read) ─────────
  if (mode === "STRATEGIC_REWRITE" && reason.trim().length < 20) {
    return {
      status: "VETOED",
      summary: "STRATEGIC_REWRITE requiert une raison ≥20 caractères.",
      reason: "REASON_TOO_SHORT",
    };
  }
  if (mode === "LLM_REPHRASE" && proposedValue === undefined) {
    return {
      status: "VETOED",
      summary:
        "LLM_REPHRASE requiert un proposedValue résolu (utilisez pillar.previewAmend pour le générer).",
      reason: "MISSING_PROPOSED_VALUE",
    };
  }

  // ── 1. Load pillar + concurrency guard ──────────────────────────────
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillarKey } },
  });
  if (!pillar) {
    return {
      status: "FAILED",
      summary: `Pilier ${pillarKey} introuvable pour la stratégie ${strategyId}.`,
      reason: "PILLAR_NOT_FOUND",
    };
  }
  if (
    typeof expectedVersion === "number" &&
    expectedVersion !== (pillar.currentVersion ?? 1)
  ) {
    return {
      status: "VETOED",
      summary: `Conflit de version : attendue ${expectedVersion}, courante ${pillar.currentVersion}. Recharge la page.`,
      reason: "CONCURRENCY_CONFLICT",
    };
  }

  // ── 2. PILLAR_COHERENCE gate ────────────────────────────────────────
  const gate = await applyPillarCoherenceGate({
    strategyId,
    pillarKey,
    field,
    mode,
    proposedValue,
    currentStatus: (pillar.validationStatus ?? "DRAFT") as
      | "DRAFT"
      | "AI_PROPOSED"
      | "VALIDATED"
      | "LOCKED",
    overrideLocked: overrideLocked ?? false,
  });
  if (gate.blocked) {
    return {
      status: "VETOED",
      summary: gate.reason ?? "Bloqué par PILLAR_COHERENCE.",
      reason: gate.reason,
      output: { warnings: gate.warnings },
    };
  }

  // ── 3. Cost gate Thot pre-flight (LLM_REPHRASE / STRATEGIC_REWRITE) ─
  // validateExecution is currently a Phase 0 stub (always {ok:true}); we
  // still call it so when Phase 1 budget gating ships, OPERATOR_AMEND_PILLAR
  // is automatically subject to it without code change here.
  let estimatedCost: { amount: number; currency: string } | undefined;
  if (mode !== "PATCH_DIRECT") {
    const plannedCostUsd = mode === "STRATEGIC_REWRITE" ? 0.05 : 0.02;
    try {
      const { validateExecution } = await import(
        "@/server/services/financial-brain/capacity"
      );
      const cap = await validateExecution(intent, plannedCostUsd);
      if (!cap.ok) {
        return {
          status: "VETOED",
          summary: `Budget Thot insuffisant (${cap.reason}).`,
          reason: cap.reason,
        };
      }
      estimatedCost = { amount: plannedCostUsd, currency: "USD" };
    } catch {
      // Capacity service optional in current build — silent fallback.
    }
  }

  // ── 4. Create Recommendation (ACCEPTED, agent HUMAN, USER_INTENT) ──
  const reco = await db.recommendation.create({
    data: {
      strategyId,
      targetPillarKey: pillarKey,
      targetField: field,
      operation: "SET",
      currentSnapshot: getNested(
        (pillar.content as Record<string, unknown>) ?? {},
        field,
      ) as never,
      proposedValue: proposedValue as never,
      agent: "HUMAN",
      source: "USER_INTENT",
      confidence: 1.0,
      explain: reason,
      impact: mode === "STRATEGIC_REWRITE" ? "HIGH" : "MEDIUM",
      destructive: gate.destructive ?? false,
      applyPolicy:
        mode === "STRATEGIC_REWRITE" ? "requires_review" : "auto",
      status: "ACCEPTED",
      reviewedBy: operatorId,
      reviewedAt: new Date(),
      missionType: "ADVE_UPDATE",
    },
  });

  // ── 5. Apply via Pillar Gateway (LOI 1, audit/version/staleAt auto) ─
  const writeResult = await writePillarAndScore({
    strategyId,
    pillarKey,
    operation: { type: "SET_FIELDS", fields: [{ path: field, value: proposedValue }] },
    author: { system: "OPERATOR", userId: operatorId, reason },
  });
  if (!writeResult.success) {
    await db.recommendation.update({
      where: { id: reco.id },
      data: { status: "REJECTED", revertedAt: new Date(), revertReason: writeResult.error },
    });
    return {
      status: "FAILED",
      summary: writeResult.error ?? "Écriture refusée par le Pillar Gateway.",
      reason: "GATEWAY_REJECTED",
      output: { warnings: writeResult.warnings },
    };
  }

  // ── 6. Mark recommendation APPLIED ─────────────────────────────────
  await db.recommendation.update({
    where: { id: reco.id },
    data: { status: "APPLIED", appliedAt: new Date() },
  });

  // ── 7. Cascade side-effects ─────────────────────────────────────────
  let staleAssetCount = 0;
  if (mode === "STRATEGIC_REWRITE") {
    // Mark dependent ACTIVE BrandAssets as stale (they stay ACTIVE; the
    // operator UI shows a "regen suggested" badge).
    const updated = await db.brandAsset.updateMany({
      where: {
        strategyId,
        pillarSource: pillarKey.toUpperCase(),
        state: "ACTIVE",
        staleAt: null,
      },
      data: {
        staleAt: new Date(),
        staleReason: `Pilier ${pillarKey.toUpperCase()} amendé v${writeResult.version} — regenerate suggested`,
      },
    });
    staleAssetCount = updated.count;
  }
  try {
    const { eventBus } = await import("@/server/governance/event-bus");
    eventBus.publish("pillar.amended.cascade-due", {
      strategyId,
      pillarKey,
      mode,
      version: writeResult.version,
      stalePropagated: writeResult.stalePropagated,
      staleAssetCount,
    });
  } catch {
    /* eventBus best-effort */
  }

  return {
    status: "OK",
    tool: "mestor.operator-amend",
    summary: `Pilier ${pillarKey.toUpperCase()}.${field} amendé (mode ${mode}, v${writeResult.version}). RTIS stale: ${writeResult.stalePropagated.length}, assets stale: ${staleAssetCount}. ${Date.now() - startedAt}ms.`,
    output: {
      version: writeResult.version,
      stalePillars: writeResult.stalePropagated,
      staleAssets: staleAssetCount,
      warnings: writeResult.warnings,
      recommendationId: reco.id,
    },
    estimatedCost,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let cur: unknown = obj;
  for (const s of segments) {
    if (cur && typeof cur === "object" && s in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[s];
    } else {
      return undefined;
    }
  }
  return cur;
}
