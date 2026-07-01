/**
 * Campaign Tracker — Superfan economy (Phase 19 Cluster C + Phase 23 Epic 4 Story 4.3).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Cluster C (3) :
 *   - superfan.attribution  — modèle paramétrique d'attribution d'évangélistes (PARTIAL/MVP)
 *   - superfan.stickiness   — cohort longitudinal J+30/J+90/J+180 via CRM connector (Phase 23 Story 4.3)
 *   - superfan.crmCapture   — segment évangélistes via CRM connector (Phase 23 Story 4.3)
 *
 * # Phase 23 Story 4.3 — connector wiring
 *
 * Both `measureDevotionStickinessCohort` and `captureSuperfansFromCampaign`
 * consume `crmProvider.fetchCohortSignal` (the Story 2.3 façade) and switch
 * on `ConnectorResult<CrmCohortSignal>` **exhaustively** — every consumer
 * handles `LIVE` / `DEFERRED_AWAITING_CREDENTIALS` / `DEGRADED` arms ; no
 * `default else` branch ; no swallow-to-LIVE on transient failure (P22-1
 * invariant + ADR-0046 no-magic-fallback).
 *
 * Return shapes are discriminated unions (`CohortRetentionMeasurement` /
 * `CrmCaptureMeasurement`) :
 *   - `OK` arm carries the measured values + observedAt.
 *   - `INSUFFICIENT_DATA` arm carries the typed reason (P22-2). Never a
 *     fabricated retention rate, never a fabricated evangelist count.
 *
 * Cf. ADR-0052 (campaign tracker L2 canon), ADR-0077 (Phase 23 parent),
 * ADR-0079 (external signal connectors via Credentials Vault), ADR-0081
 * (superfan-attribution calibration — child ADR of these sub-clusters).
 */

import { db } from "@/lib/db";
import { fetchCohortSignal, type CrmCohortWindow } from "@/server/services/anubis/providers/crm-provider";
import type { ConnectorDegradationReason } from "@/domain";
import {
  type SuperfanAttributionResult,
  type SuperfanAttributionByAction,
  DeferredAwaitingDepsError,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster superfan.attribution (PARTIAL/MVP — Phase 19 heuristic)
// ─────────────────────────────────────────────────────────────────────────
//
// Note (Phase 23 Story 4.3) : the **calibration path** (logistic regression
// + ROC AUC + RMSE + discriminated AttributionResult) lives at
// `services/campaign-tracker/superfan-attribution.ts` (Story 4.1 + 4.2 +
// 4.4 + 4.5). This Phase 19 heuristic computes a deterministic LTV
// multiplier and stays as-is — the two paths coexist (cf. ADR-0081 and the
// docblock in superfan-attribution.ts).

interface SuperfanAttributionInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * MVP heuristic : pour chaque CampaignAction avec devotionTransitionsObserved,
 * compte les transitions vers EVANGELISTE et applique un coefficient
 * conservateur de futureLtvAttribution.
 *
 * Coefficients Vague 2 (à calibrer en PRODUCTION via régression — Phase 23
 * Story 4.2 ships the calibration path in `superfan-attribution.ts`) :
 *   - 1 nouvel EVANGELISTE = 12× LTV de base sur horizon 24 mois
 *   - 1 nouvel FIDELE = 4× LTV
 *   - 1 nouvel INITIE = 1× LTV (baseline)
 */
const LTV_BASELINE_USD = 100; // multiplicateur conservateur, à canoniser en variable-bible
const COEF_EVANGELISTE = 12;
const COEF_FIDELE = 4;
const COEF_INITIE = 1;

export async function recomputeSuperfanAttribution(
  input: SuperfanAttributionInput,
): Promise<SuperfanAttributionResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const actions = await db.campaignAction.findMany({
    where: { campaignId: input.campaignId },
    select: {
      id: true,
      devotionTransitionsObserved: true,
      devotionRungTargeted: true,
    },
  });

  const degradationCodes: string[] = [];
  if (actions.every((a) => !a.devotionTransitionsObserved)) {
    degradationCodes.push("MISSING_DEVOTION_TRANSITIONS");
  }

  const byAction: SuperfanAttributionByAction[] = actions.map((a) => {
    const transitions = parseTransitions(a.devotionTransitionsObserved);
    const evangelists = sumTransitionsTo(transitions, "EVANGELISTE");
    const fideles = sumTransitionsTo(transitions, "FIDELE");
    const inities = sumTransitionsTo(transitions, "INITIE");

    const futureLtv =
      evangelists * COEF_EVANGELISTE * LTV_BASELINE_USD +
      fideles * COEF_FIDELE * LTV_BASELINE_USD +
      inities * COEF_INITIE * LTV_BASELINE_USD;

    return {
      campaignActionId: a.id,
      evangelistsProduced: evangelists,
      // Total local : count des évangélistes uniquement (la futureLtvAttribution
      // est l'agrégat LTV qui sert le widget Cockpit ; les counts évangélistes
      // alimentent le calibrage Phase 23).
      futureLtvAttribution: futureLtv,
      // MVP : pas de confidence interval (PRODUCTION via régression bootstrap).
      confidenceInterval: null,
    };
  });

  return {
    campaignId: input.campaignId,
    byAction,
    totalEvangelistsProduced: byAction.reduce((acc, b) => acc + b.evangelistsProduced, 0),
    totalFutureLtvAttribution: byAction.reduce((acc, b) => acc + b.futureLtvAttribution, 0),
    degradationCodes,
  };
}

interface RawTransition {
  from: string;
  to: string;
  count: number;
}

function parseTransitions(payload: unknown): readonly RawTransition[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((t): RawTransition[] => {
    if (typeof t !== "object" || t === null) return [];
    const obj = t as Record<string, unknown>;
    if (typeof obj.from === "string" && typeof obj.to === "string" && typeof obj.count === "number") {
      return [{ from: obj.from, to: obj.to, count: obj.count }];
    }
    return [];
  });
}

function sumTransitionsTo(transitions: readonly RawTransition[], target: string): number {
  return transitions.filter((t) => t.to === target).reduce((acc, t) => acc + t.count, 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster superfan.stickiness — Phase 23 Story 4.3 connector wiring
// ─────────────────────────────────────────────────────────────────────────

const COHORT_WINDOWS: readonly CrmCohortWindow[] = ["J+30", "J+90", "J+180"] as const;

const WINDOW_TO_DAYS: Readonly<Record<CrmCohortWindow, number>> = {
  "J+30": 30,
  "J+90": 90,
  "J+180": 180,
};

/**
 * Why this typed-reason alphabet : the Phase 23 P22-2 invariant requires the
 * `INSUFFICIENT_DATA` branch to carry a **typed** cause, not a free-text
 * string. Operator UIs (Console + Cockpit) render distinct messages per
 * reason ; ad-hoc string accumulation would defeat the discriminator.
 *
 * Reasons :
 *   - `DEFERRED_AWAITING_CREDENTIALS` — CRM connector not configured.
 *   - `DEGRADED_<flavour>`            — connector configured, upstream failed.
 *   - `WINDOW_NOT_REACHED`            — campaign too recent for J+30 / J+90 /
 *                                       J+180 ; this is **expected**, not an
 *                                       error — render as "measurement pending".
 *   - `CAMPAIGN_NOT_FOUND`            — defensive (operator passed bad id).
 *   - `TENANT_MISMATCH`               — defensive (strategyId / campaignId
 *                                       don't belong together).
 *   - `NO_EVANGELISTS_DETECTED`       — only for crmCapture (cohort exists
 *                                       but contains zero evangelists).
 */
export type SuperfanInsufficientReason =
  | "DEFERRED_AWAITING_CREDENTIALS"
  | "DEGRADED_INSUFFICIENT_DATA"
  | "DEGRADED_VENDOR_OUTAGE"
  | "DEGRADED_RATE_LIMITED"
  | "DEGRADED_AUTH_REVOKED"
  | "WINDOW_NOT_REACHED"
  | "CAMPAIGN_NOT_FOUND"
  | "TENANT_MISMATCH"
  | "NO_EVANGELISTS_DETECTED";

function mapDegradationToReason(reason: ConnectorDegradationReason): SuperfanInsufficientReason {
  switch (reason) {
    case "INSUFFICIENT_DATA":
      return "DEGRADED_INSUFFICIENT_DATA";
    case "VENDOR_OUTAGE":
      return "DEGRADED_VENDOR_OUTAGE";
    case "RATE_LIMITED":
      return "DEGRADED_RATE_LIMITED";
    case "AUTH_REVOKED":
      return "DEGRADED_AUTH_REVOKED";
  }
}

/**
 * Per-window retention measurement carried on the OK arm. Each window value
 * is a number (no `null`) — the OK arm structurally guarantees all three
 * windows produced LIVE signal.
 */
export type CohortWindowSnapshot = {
  readonly cohortSize: number;
  readonly retained: number;
  /** retained / cohortSize (0..1). */
  readonly retentionRate: number;
  readonly observedAt: string;
};

/**
 * Discriminated union return type for `measureDevotionStickinessCohort`.
 * Pattern P22-2 — `INSUFFICIENT_DATA` is first-class ; no `null` on score
 * fields ; downstream consumer must switch exhaustively.
 *
 * The OK arm requires **all three** windows to have produced LIVE signal.
 * Partial fills are explicitly forbidden : if any one of J+30 / J+90 /
 * J+180 returns DEFERRED or DEGRADED, the whole measurement returns
 * `INSUFFICIENT_DATA` with the first non-LIVE reason. This is a deliberate
 * MVP choice — "two out of three windows" is too ambiguous to defend
 * cliente ; the OK arm is "we have full visibility on the cohort".
 */
export type CohortRetentionMeasurement =
  | {
      readonly state: "OK";
      readonly campaignId: string;
      readonly J30: CohortWindowSnapshot;
      readonly J90: CohortWindowSnapshot;
      readonly J180: CohortWindowSnapshot;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      readonly campaignId: string;
      readonly reason: SuperfanInsufficientReason;
      /** ISO date when this window will become reachable, if reason === "WINDOW_NOT_REACHED". */
      readonly nextReachableAt?: string;
    };

interface StickinessInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  /** Override pour cron scheduler. Default = now(). */
  readonly asOf?: Date;
}

/**
 * Phase 23 Story 4.3 — connector-wired cohort retention.
 *
 * Iterates J+30 / J+90 / J+180 windows ; for each, calls
 * `crmProvider.fetchCohortSignal` (Story 2.3 façade). Returns the
 * discriminated union :
 *
 *   - All three windows reachable + LIVE → OK with full snapshot.
 *   - Any window not yet reachable (campaign too recent) → INSUFFICIENT_DATA
 *     with reason `WINDOW_NOT_REACHED` + `nextReachableAt`.
 *   - Any window DEFERRED_AWAITING_CREDENTIALS → INSUFFICIENT_DATA with
 *     reason `DEFERRED_AWAITING_CREDENTIALS` (operator hasn't configured the
 *     CRM connector — info tone, not error).
 *   - Any window DEGRADED → INSUFFICIENT_DATA with the mapped DEGRADED
 *     reason — the operator can act on the typed cause (rate-limited :
 *     retry later ; auth revoked : rotate credentials ; etc.).
 *
 * Never throws across the consumer boundary (P22-1 invariant). Never returns
 * a fabricated retention value (P22-2 invariant).
 */
export async function measureDevotionStickinessCohort(
  input: StickinessInput,
): Promise<CohortRetentionMeasurement> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, code: true, strategyId: true, endDate: true },
  });
  if (!campaign) {
    return { state: "INSUFFICIENT_DATA", campaignId: input.campaignId, reason: "CAMPAIGN_NOT_FOUND" };
  }
  if (campaign.strategyId !== input.strategyId) {
    return { state: "INSUFFICIENT_DATA", campaignId: input.campaignId, reason: "TENANT_MISMATCH" };
  }

  const baseDate = campaign.endDate ?? new Date();
  const now = input.asOf ?? new Date();

  const snapshots: Partial<Record<CrmCohortWindow, CohortWindowSnapshot>> = {};
  for (const window of COHORT_WINDOWS) {
    const reachableAt = addDays(baseDate, WINDOW_TO_DAYS[window]);
    if (now < reachableAt) {
      return {
        state: "INSUFFICIENT_DATA",
        campaignId: campaign.id,
        reason: "WINDOW_NOT_REACHED",
        nextReachableAt: reachableAt.toISOString(),
      };
    }
    const signal = await fetchCohortSignal(input.operatorId, campaign.id, window);
    switch (signal.state) {
      case "LIVE":
        snapshots[window] = {
          cohortSize: signal.data.cohortSize,
          retained: signal.data.retained,
          retentionRate: signal.data.retentionRate,
          observedAt: signal.observedAt,
        };
        break;
      case "DEFERRED_AWAITING_CREDENTIALS":
        return {
          state: "INSUFFICIENT_DATA",
          campaignId: campaign.id,
          reason: "DEFERRED_AWAITING_CREDENTIALS",
        };
      case "DEGRADED":
        return {
          state: "INSUFFICIENT_DATA",
          campaignId: campaign.id,
          reason: mapDegradationToReason(signal.reason),
        };
    }
  }

  // All three windows resolved LIVE — structurally guaranteed by the loop above.
  return {
    state: "OK",
    campaignId: campaign.id,
    J30: snapshots["J+30"]!,
    J90: snapshots["J+90"]!,
    J180: snapshots["J+180"]!,
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster superfan.crmCapture — Phase 23 Story 4.3 connector wiring
// ─────────────────────────────────────────────────────────────────────────

/**
 * Discriminated union return type for `captureSuperfansFromCampaign`. Same
 * P22-2 pattern as `CohortRetentionMeasurement` — typed INSUFFICIENT_DATA
 * branch, no fabricated count.
 *
 * The OK arm exposes :
 *   - `localEvangelistCount` — count from `CampaignAction.devotionTransitionsObserved`
 *     (Phase 19 source — the local heuristic ground truth).
 *   - `crmCohortSize` — count from `crmProvider.fetchCohortSignal` (Phase 23
 *     CRM-side truth ; may differ from local count if CRM segment is mis-aligned).
 *   - `segmentName` — canonical segment name `superfans-{campaignCode}` for
 *     downstream CRM provider use.
 *
 * Cross-checking local vs CRM count is what makes the "we know how many
 * evangelists you have" claim defensible — if the two diverge significantly,
 * the operator sees a degradation hint.
 */
export type CrmCaptureMeasurement =
  | {
      readonly state: "OK";
      readonly campaignId: string;
      readonly segmentName: string;
      readonly localEvangelistCount: number;
      readonly crmCohortSize: number;
      readonly observedAt: string;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      readonly campaignId: string;
      readonly reason: SuperfanInsufficientReason;
      readonly segmentName: string;
      /** Always-available local count from devotionTransitionsObserved, even on the INSUFFICIENT_DATA arm. */
      readonly localEvangelistCount: number;
    };

interface CrmCaptureInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  /** CRM-side cohort window for cross-check ; default J+30. */
  readonly window?: CrmCohortWindow;
}

/**
 * Phase 23 Story 4.3 — connector-wired CRM capture cross-check.
 *
 * Computes the local evangelist count from `CampaignAction.devotionTransitionsObserved`
 * (Phase 19 source of truth), then cross-checks against the CRM cohort size via
 * `crmProvider.fetchCohortSignal`. Returns the discriminated union :
 *
 *   - CRM LIVE → OK with both local + CRM counts (operator can see divergence
 *     in the Console campaign-tracker view ; Epic 6 Story 6.6 surfaces).
 *   - CRM DEFERRED → INSUFFICIENT_DATA with reason `DEFERRED_AWAITING_CREDENTIALS`
 *     ; the local count is preserved on the branch (always observable).
 *   - CRM DEGRADED → INSUFFICIENT_DATA with the mapped DEGRADED reason ;
 *     local count preserved.
 *   - Local count = 0 → INSUFFICIENT_DATA with reason `NO_EVANGELISTS_DETECTED`
 *     ; CRM call is skipped (no point cross-checking an empty segment).
 *
 * Never throws across the consumer boundary. Never fabricates an evangelist
 * count on the CRM side.
 */
export async function captureSuperfansFromCampaign(
  input: CrmCaptureInput,
): Promise<CrmCaptureMeasurement> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      code: true,
      strategyId: true,
      actions: {
        select: { devotionTransitionsObserved: true },
      },
    },
  });
  if (!campaign) {
    return {
      state: "INSUFFICIENT_DATA",
      campaignId: input.campaignId,
      reason: "CAMPAIGN_NOT_FOUND",
      segmentName: "",
      localEvangelistCount: 0,
    };
  }
  if (campaign.strategyId !== input.strategyId) {
    return {
      state: "INSUFFICIENT_DATA",
      campaignId: input.campaignId,
      reason: "TENANT_MISMATCH",
      segmentName: "",
      localEvangelistCount: 0,
    };
  }

  const segmentName = `superfans-${campaign.code ?? campaign.id}`;

  // Local count — from devotionTransitionsObserved (Phase 19 source of truth).
  const localEvangelistCount = campaign.actions.reduce((acc, a) => {
    const transitions = parseTransitions(a.devotionTransitionsObserved);
    return acc + sumTransitionsTo(transitions, "EVANGELISTE") + sumTransitionsTo(transitions, "FIDELE");
  }, 0);

  if (localEvangelistCount === 0) {
    return {
      state: "INSUFFICIENT_DATA",
      campaignId: campaign.id,
      reason: "NO_EVANGELISTS_DETECTED",
      segmentName,
      localEvangelistCount: 0,
    };
  }

  const window = input.window ?? "J+30";
  const signal = await fetchCohortSignal(input.operatorId, campaign.id, window);
  switch (signal.state) {
    case "LIVE":
      return {
        state: "OK",
        campaignId: campaign.id,
        segmentName,
        localEvangelistCount,
        crmCohortSize: signal.data.cohortSize,
        observedAt: signal.observedAt,
      };
    case "DEFERRED_AWAITING_CREDENTIALS":
      return {
        state: "INSUFFICIENT_DATA",
        campaignId: campaign.id,
        reason: "DEFERRED_AWAITING_CREDENTIALS",
        segmentName,
        localEvangelistCount,
      };
    case "DEGRADED":
      return {
        state: "INSUFFICIENT_DATA",
        campaignId: campaign.id,
        reason: mapDegradationToReason(signal.reason),
        segmentName,
        localEvangelistCount,
      };
  }
}

// Re-export pour cohérence imports cross-modules.
void DeferredAwaitingDepsError;
