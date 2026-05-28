/**
 * OPERATOR_TAG_OVERTON_DELTA — handler (Phase 23 Epic 3 Story 3.7, ADR-0078 + ADR-0060).
 *
 * Operator tags an `overtonDeltaManual` on a CampaignAction as the manual peer
 * to the algorithmic embeddings path (FR26 peer to FR13). Persists the value
 * to `CampaignAction.overtonDeltaManual` ; the `IntentEmission` row created by
 * `mestor.emitIntent` is the auditable source-discriminator (`source: "MANUAL_OPERATOR"`
 * lives in the IntentEmission.payload).
 *
 * Downstream, `measureOvertonShift` (Story 3.2) consumes the manual value when
 * non-null and stamps `degradationCodes` with `MANUAL_OPERATOR_DELTA` — the
 * operator override is auditable AND traceable in two places (this Intent
 * payload + downstream measurement result).
 *
 * Validations :
 *   - `overtonDeltaManual ∈ [-1, 1]` (matches the algorithmic path's range).
 *   - CampaignAction belongs to the strategy (tenant guard).
 *
 * Cf. ADR-0078 §"Manual peer mode" + ADR-0060 manual-first parity invariant.
 */

import { db } from "@/lib/db";
import type { Intent, IntentResult } from "@/server/services/mestor/intents";

type TagIntent = Extract<Intent, { kind: "OPERATOR_TAG_OVERTON_DELTA" }>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason"
>;

export async function operatorTagOvertonDelta(intent: TagIntent): Promise<HandlerResult> {
  const { strategyId, campaignActionId, overtonDeltaManual, reason } = intent;

  if (overtonDeltaManual < -1 || overtonDeltaManual > 1) {
    return {
      status: "VETOED",
      summary: `overtonDeltaManual hors plage [-1, 1] : reçu ${overtonDeltaManual}.`,
      reason: "OUT_OF_RANGE",
    };
  }

  const action = await db.campaignAction.findUnique({
    where: { id: campaignActionId },
    select: {
      id: true,
      campaign: { select: { strategyId: true, id: true } },
    },
  });

  if (!action) {
    return {
      status: "FAILED",
      summary: `CampaignAction ${campaignActionId} introuvable.`,
      reason: "ACTION_NOT_FOUND",
    };
  }

  if (action.campaign.strategyId !== strategyId) {
    return {
      status: "VETOED",
      summary:
        `CampaignAction ${campaignActionId} appartient à la strategy ` +
        `${action.campaign.strategyId}, pas à ${strategyId}.`,
      reason: "TENANT_MISMATCH",
    };
  }

  const taggedAt = new Date();
  await db.campaignAction.update({
    where: { id: campaignActionId },
    data: { overtonDeltaManual, updatedAt: taggedAt },
  });

  return {
    status: "OK",
    tool: "campaign-tracker",
    summary:
      `overtonDeltaManual=${overtonDeltaManual.toFixed(3)} tagué sur ` +
      `CampaignAction ${campaignActionId}` +
      (reason ? ` — ${reason}` : "") +
      ". Source MANUAL_OPERATOR auditable via IntentEmission.payload.",
    output: {
      campaignActionId,
      campaignId: action.campaign.id,
      overtonDeltaManual,
      source: "MANUAL_OPERATOR" as const,
      taggedAt: taggedAt.toISOString(),
    },
  };
}
