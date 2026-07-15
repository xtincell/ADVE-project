/**
 * ANUBIS — Ingestion de métriques externes AGNOSTIQUE (ADR-0146).
 *
 * Point d'entrée déterministe (zéro LLM) pour toute source d'activité poussant
 * des chiffres RÉELS dans La Fusée : un quiz d'acquisition, une app mobile, un
 * CRM, une newsletter, une remontée terrain, un webhook. Le contrat est
 * volontairement générique — « une autre marque peut vouloir piloter un quizz »
 * (opérateur, 2026-07-13) : aucune forme n'est codée en dur pour une marque.
 *
 * Routage par cellule (chacune indépendante, jamais fabriquée) :
 *   - stage AARRR + campaignId → upsert `CampaignAARRMetric` IDEMPOTENT
 *     (clé logique campaign × stage × metric × période — ré-émettre écrase la
 *     valeur au lieu de dupliquer : c'est « la valeur courante de ce point de
 *     funnel cette période »).
 *   - kpiActivityId → `MissionActivity.kpiActual = value`, GARDÉ par portée
 *     (l'activité doit appartenir à une mission de CETTE marque).
 *   - TOUJOURS un `Signal type=EXTERNAL_METRIC` de provenance (sourceType +
 *     label + horodatage) — c'est LUI qui allume honnêtement une source dans le
 *     cockpit de mission (récence réelle, pas un « bientôt » figé).
 *
 * La garde de portée du token (BRAND ne pousse que sa marque) est appliquée EN
 * AMONT par la route `/api/ingest/metrics` ; ici on suppose la marque autorisée.
 */

import type { IntentResult } from "@/server/services/mestor/intents";
import type { Intent } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";

type IngestIntent = Extract<Intent, { kind: "INGEST_EXTERNAL_METRIC" }>;
type HandlerResult = Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">;

const AARR_STAGES = new Set(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]);

/** Période comptable UTC "YYYY-MM" (déterministe). */
function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface IngestOutcome {
  sourceType: string;
  period: string;
  /** Cellules écrites vers le funnel AARRR de la campagne. */
  aarrWritten: number;
  /** KPIs d'activité de mission mis à jour. */
  kpiWritten: number;
  /** Cellules ignorées (avec raison honnête — jamais un chiffre inventé). */
  skipped: Array<{ metric: string; reason: string }>;
  /** Id du Signal de provenance créé (toujours). */
  signalId: string;
}

export async function ingestExternalMetric(intent: IngestIntent): Promise<HandlerResult> {
  const { strategyId, sourceType, campaignId, missionId, metrics } = intent;
  const period = intent.period ?? currentPeriod();
  const outcome: IngestOutcome = {
    sourceType,
    period,
    aarrWritten: 0,
    kpiWritten: 0,
    skipped: [],
    signalId: "",
  };

  // Portée campagne : la campagne doit appartenir à la marque (garde anti-cross-brand).
  let campaignOk = false;
  if (campaignId) {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { strategyId: true },
    });
    campaignOk = campaign?.strategyId === strategyId;
  }

  type AARRStageLiteral = "ACQUISITION" | "ACTIVATION" | "RETENTION" | "REVENUE" | "REFERRAL";

  for (const cell of metrics) {
    const stage: AARRStageLiteral | null =
      cell.stage && AARR_STAGES.has(cell.stage) ? (cell.stage as AARRStageLiteral) : null;

    // ── Route 1 : funnel AARRR (stage + campagne) ──
    if (stage) {
      if (!campaignId) {
        outcome.skipped.push({ metric: cell.metric, reason: "AARRR requiert campaignId" });
      } else if (!campaignOk) {
        outcome.skipped.push({ metric: cell.metric, reason: "campaignId hors de cette marque" });
      } else {
        // Idempotence : une seule row par campaign × stage × metric × période.
        const existing = await db.campaignAARRMetric.findFirst({
          where: { campaignId, stage, metric: cell.metric, period },
          select: { id: true },
        });
        if (existing) {
          await db.campaignAARRMetric.update({
            where: { id: existing.id },
            data: { value: cell.value, target: cell.target ?? null, measuredAt: new Date() },
          });
        } else {
          await db.campaignAARRMetric.create({
            data: { campaignId, stage, metric: cell.metric, value: cell.value, target: cell.target ?? null, period },
          });
        }
        outcome.aarrWritten += 1;
      }
    }

    // ── Route 2 : KPI d'activité de mission (garde de portée) ──
    if (cell.kpiActivityId) {
      const activity = await db.missionActivity.findUnique({
        where: { id: cell.kpiActivityId },
        select: { id: true, mission: { select: { strategyId: true, id: true } } },
      });
      if (!activity) {
        outcome.skipped.push({ metric: cell.metric, reason: "activité KPI introuvable" });
      } else if (activity.mission.strategyId !== strategyId) {
        outcome.skipped.push({ metric: cell.metric, reason: "activité KPI hors de cette marque" });
      } else if (missionId && activity.mission.id !== missionId) {
        outcome.skipped.push({ metric: cell.metric, reason: "activité KPI hors de cette mission" });
      } else {
        await db.missionActivity.update({
          where: { id: activity.id },
          data: { kpiActual: cell.value },
        });
        outcome.kpiWritten += 1;
      }
    }

    // Cellule sans routage effectif → capturée uniquement dans le Signal (provenance brute).
    if (!stage && !cell.kpiActivityId) {
      outcome.skipped.push({ metric: cell.metric, reason: "sans stage AARRR ni kpiActivityId — provenance seule" });
    }
  }

  // ── Provenance TOUJOURS (récence honnête des sources, ADR-0144 cockpit) ──
  const signal = await db.signal.create({
    data: {
      strategyId,
      type: "EXTERNAL_METRIC",
      data: {
        sourceType,
        sourceLabel: intent.sourceLabel ?? null,
        campaignId: campaignId ?? null,
        missionId: missionId ?? null,
        period,
        metrics: metrics.map((m) => ({
          stage: m.stage ?? null,
          metric: m.metric,
          value: m.value,
          target: m.target ?? null,
          kpiActivityId: m.kpiActivityId ?? null,
        })),
        ingestedAt: new Date().toISOString(),
      },
    },
    select: { id: true },
  });
  outcome.signalId = signal.id;

  const summary = `Métriques ${sourceType} ingérées (${period}) : ${outcome.aarrWritten} AARRR, ${outcome.kpiWritten} KPI activité${outcome.skipped.length ? `, ${outcome.skipped.length} ignorée(s)` : ""}`;

  return { status: "OK", summary, output: outcome };
}
