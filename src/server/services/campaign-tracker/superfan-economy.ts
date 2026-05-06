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
 * MVP Vague 3 (post-câblage Anubis CRM API) — promotion STUB → MVP.
 *
 * Câble `anubis.measureCohortRetention` pour mesurer rétention longitudinale
 * J+30/J+90/J+180 vs cohort initiale (segment `superfans-{campaignCode}`).
 *
 * Pattern Anubis Credentials Vault (ADR-0021) : si provider CRM absent, retour
 * DEFERRED avec degradation code structuré — L1 jamais bloqué.
 *
 * PRODUCTION : input.asOf permet replays historiques cron-scheduled (J+30/90/180).
 */
export async function measureDevotionStickinessCohort(
  input: StickinessInput,
): Promise<StickinessCohortResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, code: true, strategyId: true, endDate: true },
  });
  if (!campaign) {
    return {
      campaignId: input.campaignId,
      initialCohortSize: 0,
      cohortAtJ30: null,
      cohortAtJ90: null,
      cohortAtJ180: null,
      retentionRateJ30: null,
      retentionRateJ90: null,
      retentionRateJ180: null,
      degradationCodes: ["CAMPAIGN_NOT_FOUND"],
    };
  }
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const segmentName = `superfans-${campaign.code ?? campaign.id}`;
  const degradationCodes: string[] = [];

  // Mesure cohort à J+30, J+90, J+180 post-endDate (ou now si endDate null).
  const baseDate = campaign.endDate ?? new Date();
  const asOfJ30 = addDays(baseDate, 30);
  const asOfJ90 = addDays(baseDate, 90);
  const asOfJ180 = addDays(baseDate, 180);
  const now = input.asOf ?? new Date();

  // On invoque l'API Anubis seulement pour les fenêtres déjà passées.
  // Sinon currentSize est null (pas encore mesurable).
  const { measureCohortRetention } = await import("@/server/services/anubis");

  let cohortAtJ30: number | null = null;
  let cohortAtJ90: number | null = null;
  let cohortAtJ180: number | null = null;
  let initialCohortSize = 0;
  const allDeferred: string[] = [];

  for (const [windowName, asOf, setter] of [
    ["J30", asOfJ30, (v: number) => (cohortAtJ30 = v)],
    ["J90", asOfJ90, (v: number) => (cohortAtJ90 = v)],
    ["J180", asOfJ180, (v: number) => (cohortAtJ180 = v)],
  ] as const) {
    if (now < asOf) {
      degradationCodes.push(`WINDOW_${windowName}_NOT_REACHED`);
      continue;
    }
    try {
      const res = await measureCohortRetention({
        segmentName,
        strategyId: input.strategyId,
        asOf,
      });
      if (res.deferredReason) {
        allDeferred.push(`${windowName}_${res.deferredReason}`);
      }
      initialCohortSize = Math.max(initialCohortSize, res.initialSize);
      setter(res.currentSize);
    } catch {
      allDeferred.push(`${windowName}_ANUBIS_ERROR`);
    }
  }

  if (allDeferred.length > 0) {
    degradationCodes.push(...allDeferred);
  }

  const computeRate = (current: number | null) =>
    current !== null && initialCohortSize > 0 ? current / initialCohortSize : null;

  return {
    campaignId: campaign.id,
    initialCohortSize,
    cohortAtJ30,
    cohortAtJ90,
    cohortAtJ180,
    retentionRateJ30: computeRate(cohortAtJ30),
    retentionRateJ90: computeRate(cohortAtJ90),
    retentionRateJ180: computeRate(cohortAtJ180),
    degradationCodes,
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
 * MVP Vague 3 (post-câblage Anubis CRM API) — promotion PARTIAL → MVP solide.
 *
 * Câble `anubis.createCrmSegment` pour matérialiser le segment `superfans-{campaignCode}`
 * dans le CRM externe. Identifie les évangélistes via `CampaignAction.devotionTransitionsObserved`
 * (transitions vers EVANGELISTE/FIDELE).
 *
 * Pattern Anubis Credentials Vault (ADR-0021) : si CRM provider absent → DEFERRED
 * avec deferredReason structuré. L1 jamais bloqué.
 */
export async function captureSuperfansFromCampaign(
  input: CrmCaptureInput,
): Promise<CrmCaptureResult> {
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
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const segmentName = `superfans-${campaign.code ?? campaign.id}`;

  // Aggrège les userIds des évangélistes / fideles via devotionTransitionsObserved.
  // MVP : on extrait le count (l'identification précise userIds nécessite un join CRM —
  // reportée à PRODUCTION quand schema cohort tracking sera ship Vague 4).
  const evangelistsCount = campaign.actions.reduce((acc, a) => {
    const transitions = parseTransitions(a.devotionTransitionsObserved);
    return acc + sumTransitionsTo(transitions, "EVANGELISTE") + sumTransitionsTo(transitions, "FIDELE");
  }, 0);

  // Câblage Anubis CRM segment.
  const { createCrmSegment } = await import("@/server/services/anubis");
  const result = await createCrmSegment({
    name: segmentName,
    strategyId: input.strategyId,
    memberUserIds: [], // MVP : userIds explicites ne sont pas extraits — count uniquement
    tag: `campaign:${campaign.id}`,
  });

  const degradationCodes: string[] = [];
  if (result.deferredReason) {
    degradationCodes.push(result.deferredReason);
  }
  if (evangelistsCount === 0) {
    degradationCodes.push("NO_EVANGELISTS_DETECTED");
  }

  return {
    campaignId: input.campaignId,
    segmentName,
    segmentCreated: result.created,
    memberCount: evangelistsCount, // count, pas userIds explicit (MVP)
    degradationCodes,
  };
}

// Re-export pour cohérence imports cross-modules.
void DeferredAwaitingDepsError;
