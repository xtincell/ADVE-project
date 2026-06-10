/**
 * TYPED RECOMMENDATION GENERATOR — function-calling generation (ADR-0088)
 *
 * Closes the loop the Core Engine opened: the apply side already executes typed
 * `RecommendationPayload`s by id (apply-payload.ts), but nothing *emitted* them.
 * This generator analyses the structured pillars and emits targeted mutation
 * events — deterministic rules, no LLM, fully testable — persisted as
 * `Recommendation` rows whose `proposedValue` IS a typed payload. The existing
 * `applyRecos` typed branch then applies them by id.
 *
 * Rules (consequence-of-ADVE, RTIS-derived):
 *   1. RECOMMENDED initiative  → SELECT_INITIATIVE (promote to roadmap).
 *   2. UNMITIGATED risk already covered by a SELECTED initiative
 *                              → SET_RISK_STATUS = MITIGATED.
 *   3. High-severity (≥67) UNMITIGATED risk with NO mitigating initiative
 *                              → ADD_INITIATIVE (templated from risk.mitigation)
 *                                 carrying mitigatesRiskIds = [risk.id].
 */

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import { collectInitiatives, INITIATIVE_TIMEFRAMES } from "@/lib/types/pillar-schemas";
import type { RecommendationPayload } from "@/lib/types/recommendation-payload";

type Blob = Record<string, unknown>;
type Timeframe = (typeof INITIATIVE_TIMEFRAMES)[number];
const HIGH_SEVERITY = 67;

function coerceTimeframe(v: unknown): Timeframe {
  return (INITIATIVE_TIMEFRAMES as readonly string[]).includes(v as string) ? (v as Timeframe) : "PHASE_1";
}

export interface TypedRecoCandidate {
  payload: RecommendationPayload;
  targetPillarKey: string;
  targetField: string;
  operation: string;
  explain: string;
  confidence: number;
}

/**
 * Pure: derive typed mutation candidates from the structured pillar blobs.
 * `pillars` is keyed by lowercase pillar key (a..s).
 */
export function buildTypedRecommendations(pillars: Record<string, Blob | null | undefined>): TypedRecoCandidate[] {
  const out: TypedRecoCandidate[] = [];
  const i = pillars.i ?? {};
  const r = pillars.r ?? {};

  const initiatives = collectInitiatives(i) as Blob[];
  const matrix = Array.isArray(r.probabilityImpactMatrix) ? (r.probabilityImpactMatrix as Blob[]) : [];

  // Rule 1 — promote RECOMMENDED initiatives into the roadmap.
  for (const init of initiatives) {
    if (init.status === "RECOMMENDED" && typeof init.id === "string") {
      const timeframe = coerceTimeframe(init.timeframe);
      out.push({
        payload: { kind: "SELECT_INITIATIVE", initiativeId: init.id, timeframe },
        targetPillarKey: "i",
        targetField: "catalogueParCanal",
        operation: "MODIFY",
        explain: `Promouvoir « ${String(init.action ?? init.id)} » dans la roadmap (${timeframe}).`,
        confidence: 0.7,
      });
    }
  }

  // FK set of risk ids mitigated by a SELECTED initiative.
  const mitigatedBySelected = new Set<string>();
  const mitigatedByAny = new Set<string>();
  for (const init of initiatives) {
    const ids = Array.isArray(init.mitigatesRiskIds) ? (init.mitigatesRiskIds as string[]) : [];
    for (const id of ids) {
      mitigatedByAny.add(id);
      if (init.status === "SELECTED_FOR_ROADMAP") mitigatedBySelected.add(id);
    }
  }

  for (const risk of matrix) {
    if (typeof risk.id !== "string" || risk.status !== "UNMITIGATED") continue;

    // Rule 2 — a covered (by a selected initiative) risk should be marked mitigated.
    if (mitigatedBySelected.has(risk.id)) {
      out.push({
        payload: { kind: "SET_RISK_STATUS", riskId: risk.id, status: "MITIGATED" },
        targetPillarKey: "r",
        targetField: "probabilityImpactMatrix",
        operation: "MODIFY",
        explain: `Le risque « ${String(risk.risk ?? risk.id)} » est couvert par une initiative retenue — le marquer MITIGATED.`,
        confidence: 0.8,
      });
      continue;
    }

    // Rule 3 — high-severity, uncovered risk → propose a mitigating initiative.
    const severity = typeof risk.severity === "number" ? risk.severity : 0;
    if (severity >= HIGH_SEVERITY && !mitigatedByAny.has(risk.id)) {
      const action = typeof risk.mitigation === "string" && risk.mitigation
        ? risk.mitigation
        : `Mitiger : ${String(risk.risk ?? "risque")}`;
      out.push({
        payload: {
          kind: "ADD_INITIATIVE",
          pillar: "i",
          channel: "PRODUCTION",
          initiative: {
            id: randomUUID(),
            action,
            format: "Initiative",
            objectif: `Mitiger le risque « ${String(risk.risk ?? risk.id)} »`,
            status: "RECOMMENDED",
            mitigatesRiskIds: [risk.id],
          },
        },
        targetPillarKey: "i",
        targetField: "catalogueParCanal",
        operation: "ADD",
        explain: `Risque non couvert (sévérité ${severity}) : proposer une initiative de mitigation.`,
        confidence: 0.65,
      });
    }
  }

  return out;
}

/**
 * Generate + persist typed recommendations for a strategy. Creates a
 * RecommendationBatch + Recommendation rows whose proposedValue is a typed
 * payload (applied later by the applyRecos typed branch). Returns the batch id
 * and the candidate count.
 */
export async function generateTypedRecommendations(
  strategyId: string,
): Promise<{ batchId: string | null; count: number }> {
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    select: { key: true, content: true },
  });
  const pillars: Record<string, Blob> = {};
  for (const row of rows) pillars[row.key] = (row.content ?? {}) as Blob;

  const candidates = buildTypedRecommendations(pillars);
  if (candidates.length === 0) return { batchId: null, count: 0 };

  const batch = await db.recommendationBatch.create({
    data: {
      strategyId,
      missionType: "I_GENERATION",
      sourcePillars: ["r", "i"],
      targetPillars: [...new Set(candidates.map((c) => c.targetPillarKey))],
      totalRecos: candidates.length,
      pendingCount: candidates.length,
      agent: "MESTOR",
    },
  });

  for (const c of candidates) {
    await db.recommendation.create({
      data: {
        strategyId,
        targetPillarKey: c.targetPillarKey,
        targetField: c.targetField,
        operation: c.operation,
        proposedValue: c.payload as unknown as Prisma.InputJsonValue,
        agent: "MESTOR",
        source: "R+T",
        confidence: c.confidence,
        explain: c.explain,
        urgency: "SOON",
        impact: "MEDIUM",
        destructive: false,
        applyPolicy: "suggest",
        status: "PENDING",
        batchId: batch.id,
        missionType: "I_GENERATION",
      },
    });
  }

  return { batchId: batch.id, count: candidates.length };
}
