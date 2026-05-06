/**
 * Campaign Tracker — Superfan economy (Phase 19, ADR-0052 Cluster C).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 2 (3) :
 *   - superfan.attribution  — modèle paramétrique d'attribution d'évangélistes (PARTIAL/MVP)
 *   - superfan.stickiness   — cohort longitudinal J+30/J+90/J+180 (STUB — deps Anubis CRM)
 *   - superfan.crmCapture   — capture segment CRM nominal post-archive (PARTIAL/MVP)
 *
 * MVP heuristic — pas de modèle ML calibré. PRODUCTION via ADR enfant.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import {
  type SuperfanAttributionResult,
  type SuperfanAttributionByAction,
  type StickinessCohortResult,
  DeferredAwaitingDepsError,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster superfan.attribution (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

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
 * Coefficients Vague 2 (à calibrer en PRODUCTION via régression) :
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
// Sous-cluster superfan.stickiness (STUB — deps Anubis CRM)
// ─────────────────────────────────────────────────────────────────────────

interface StickinessInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  /** Override pour cron scheduler. Default = now(). */
  readonly asOf?: Date;
}

/**
 * STUB Vague 2 — pas de cron scheduler câblé, dépend de :
 *   - Anubis CRM segment lookup (`superfans-{campaignCode}` créé par crmCapture)
 *   - Anubis CRM cohort retention API (provider-spécifique)
 *
 * Retourne `DEFERRED_AWAITING_DEPS` jusqu'à câblage Vague 3 ou pre-Vague 3 PR.
 */
export async function measureDevotionStickinessCohort(
  _input: StickinessInput,
): Promise<StickinessCohortResult> {
  // STUB pattern : on ne throw pas, on retourne result avec degradationCode
  // structuré (cf. ADR-0052 §2.5 primitive #1, pattern Anubis Credentials Vault ADR-0021).
  return {
    campaignId: _input.campaignId,
    initialCohortSize: 0,
    cohortAtJ30: null,
    cohortAtJ90: null,
    cohortAtJ180: null,
    retentionRateJ30: null,
    retentionRateJ90: null,
    retentionRateJ180: null,
    degradationCodes: ["DEFERRED_AWAITING_DEPS", "MISSING_CRM_SEGMENTS"],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster superfan.crmCapture (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface CrmCaptureInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

interface CrmCaptureResult {
  readonly campaignId: string;
  readonly segmentName: string;
  readonly segmentCreated: boolean;
  readonly memberCount: number;
  readonly degradationCodes: readonly string[];
}

/**
 * MVP : génère segment name canonique `superfans-{campaignCode}`. Anubis broadcast
 * câblage à compléter (provider-spécifique : Mailchimp / HubSpot / etc. via
 * Credentials Vault ADR-0021).
 *
 * Pattern résilient : si Anubis CRM provider absent, retourne segmentCreated=false
 * + degradationCode `DEFERRED_AWAITING_CREDENTIALS`. L1 jamais bloqué.
 */
export async function captureSuperfansFromCampaign(
  input: CrmCaptureInput,
): Promise<CrmCaptureResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, code: true, strategyId: true },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const segmentName = `superfans-${campaign.code ?? campaign.id}`;

  // MVP : on retourne le plan sans toucher l'API Anubis (gating par credentials).
  // Vague 3 promotion `MVP → PRODUCTION` câblera anubis.broadcast.createSegment.
  return {
    campaignId: input.campaignId,
    segmentName,
    segmentCreated: false,
    memberCount: 0,
    degradationCodes: ["DEFERRED_AWAITING_CREDENTIALS", "ANUBIS_CRM_PROVIDER_NOT_CONFIGURED"],
  };
}

// Re-export pour cohérence imports cross-modules.
void DeferredAwaitingDepsError;
