/**
 * devotion-attribution — associe les transitions de dévotion OBSERVÉES aux
 * CampaignAction qui ont pu les produire (ADR-0135 §B). Ranime la chaîne
 * d'attribution/calibration qui lisait un champ (`devotionTransitionsObserved`)
 * que PERSONNE n'écrivait (audit 2026-07-13, T7).
 *
 * Doctrine (jamais de fabrication) :
 *   - la transition est MESURÉE (un SuperfanProfile réel a monté de rung —
 *     `Signal` type DEVOTION_TRANSITION daté par `superfan-ingest`) ;
 *   - l'ASSOCIATION à une action est un modèle d'attribution DÉCLARÉ et
 *     nommé : « last-touch dans la fenêtre » (l'action la plus récemment
 *     active avant l'observation, dans une fenêtre de rappel bornée) ;
 *   - c'est exactement l'hypothèse que la régression teste : si les features
 *     de l'action (cohérence big-idea, budget) ne prédisent pas la transition,
 *     le ROC-AUC tombe vers 0.5 et le gate de calibration REFUSE la promotion.
 *     Le système travaille — il n'invente pas un chiffre.
 *   - idempotent : reconstruit intégralement les records MEASURED à chaque
 *     passe, PRÉSERVE les records saisis à la main (source ≠ MEASURED).
 *
 * 100 % déterministe, zéro LLM (LOI 9).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { DEVOTION_TRANSITION_SIGNAL } from "@/server/services/seshat/superfan-ingest";

/** Marqueur des records écrits par l'attribution (vs saisie manuelle opérateur). */
export const MEASURED_SOURCE = "MEASURED" as const;

/**
 * Fenêtre de rappel : une transition n'est attribuée qu'à une action dont le
 * DÉBUT est ≤ 45 j avant l'observation (pas de crédit aux actions anciennes).
 */
export const ATTRIBUTION_LOOKBACK_DAYS = 45;
/** Latence d'effet tolérée après la FIN d'une action (les effets traînent). */
export const ATTRIBUTION_GRACE_DAYS = 14;

export interface ActionWindow {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface ObservedTransition {
  from: string;
  to: string;
  observedAt: Date;
}

const DAY_MS = 86_400_000;

/**
 * Last-touch dans la fenêtre : l'action la plus récemment DÉMARRÉE qui était
 * active au moment de l'observation (ou l'a précédée dans la latence d'effet),
 * et pas plus vieille que la fenêtre de rappel. `null` si aucune — une
 * transition non rattachable N'EST PAS forcée sur une action au hasard.
 */
export function lastTouchActionId(
  observedAt: Date,
  actions: readonly ActionWindow[],
): string | null {
  const obs = observedAt.getTime();
  let best: { id: string; start: number } | null = null;
  for (const a of actions) {
    if (!a.startDate) continue;
    const start = a.startDate.getTime();
    if (start > obs) continue; // action postérieure à la transition
    if (obs - start > ATTRIBUTION_LOOKBACK_DAYS * DAY_MS) continue; // trop ancienne
    const windowEnd = (a.endDate ?? a.startDate).getTime() + ATTRIBUTION_GRACE_DAYS * DAY_MS;
    if (obs > windowEnd) continue; // hors fenêtre d'effet
    if (!best || start > best.start) best = { id: a.id, start };
  }
  return best?.id ?? null;
}

interface MeasuredRecord {
  from: string;
  to: string;
  count: number;
  source: typeof MEASURED_SOURCE;
  lastObservedAt: string;
}

/** Agrège les transitions attribuées à une action en records `{from,to,count}`. */
export function aggregateMeasured(transitions: readonly ObservedTransition[]): MeasuredRecord[] {
  const byPair = new Map<string, MeasuredRecord>();
  for (const t of transitions) {
    const key = `${t.from}→${t.to}`;
    const rec = byPair.get(key);
    const iso = t.observedAt.toISOString();
    if (rec) {
      rec.count += 1;
      if (iso > rec.lastObservedAt) rec.lastObservedAt = iso;
    } else {
      byPair.set(key, { from: t.from, to: t.to, count: 1, source: MEASURED_SOURCE, lastObservedAt: iso });
    }
  }
  return [...byPair.values()];
}

/** Records existants NON-MEASURED (saisie opérateur) — préservés au rebuild. */
function preserveManual(existing: unknown): Record<string, unknown>[] {
  if (!Array.isArray(existing)) return [];
  return existing.filter(
    (r): r is Record<string, unknown> =>
      typeof r === "object" && r !== null && (r as Record<string, unknown>).source !== MEASURED_SOURCE,
  );
}

export interface AttributionResult {
  state: "LIVE";
  transitionsSeen: number;
  transitionsAttributed: number;
  actionsUpdated: number;
}

/**
 * Reconstruit `CampaignAction.devotionTransitionsObserved` pour une stratégie
 * depuis les `Signal` DEVOTION_TRANSITION observés. Idempotent, préserve la
 * saisie manuelle. Écrit uniquement les actions dont le contenu change.
 */
export async function rebuildActionTransitions(strategyId: string): Promise<AttributionResult> {
  const [signals, actions] = await Promise.all([
    db.signal.findMany({
      where: { strategyId, type: DEVOTION_TRANSITION_SIGNAL },
      select: { createdAt: true, data: true },
    }),
    db.campaignAction.findMany({
      where: { campaign: { strategyId } },
      select: { id: true, startDate: true, endDate: true, devotionTransitionsObserved: true },
    }),
  ]);

  const windows: ActionWindow[] = actions.map((a) => ({ id: a.id, startDate: a.startDate, endDate: a.endDate }));

  // Attribue chaque transition à une action (last-touch) ; groupe par action.
  const byAction = new Map<string, ObservedTransition[]>();
  let attributed = 0;
  for (const s of signals) {
    const d = (s.data ?? {}) as Record<string, unknown>;
    if (typeof d.from !== "string" || typeof d.to !== "string") continue;
    const actionId = lastTouchActionId(s.createdAt, windows);
    if (!actionId) continue; // transition réelle mais non rattachable — honnête
    attributed += 1;
    const list = byAction.get(actionId) ?? [];
    list.push({ from: d.from, to: d.to, observedAt: s.createdAt });
    byAction.set(actionId, list);
  }

  // Réécrit chaque action : records manuels préservés + MEASURED reconstruits.
  let updated = 0;
  for (const a of actions) {
    const measured = aggregateMeasured(byAction.get(a.id) ?? []);
    const preserved = preserveManual(a.devotionTransitionsObserved);
    const next = [...preserved, ...measured];
    const prev = Array.isArray(a.devotionTransitionsObserved) ? a.devotionTransitionsObserved : [];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue; // rien changé
    await db.campaignAction.update({
      where: { id: a.id },
      data: { devotionTransitionsObserved: next as unknown as Prisma.InputJsonValue },
    });
    updated += 1;
  }

  return { state: "LIVE", transitionsSeen: signals.length, transitionsAttributed: attributed, actionsUpdated: updated };
}
