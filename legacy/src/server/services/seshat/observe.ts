/**
 * Seshat — observation des Intents (ADR-0038, boucle async status/observationStatus).
 *
 * Le manifest Seshat déclare la capability `observe` + accepte `OBSERVE_INTENT`,
 * et `governance/bootstrap.ts` appelle `observeIntent(intentId, result)` sur
 * chaque `intent.completed`. Mais la fonction n'existait pas : `bootstrap`
 * l'invoquait via optional-chaining (`mod.observeIntent?.()`), donc la boucle
 * était MORTE — toute `IntentEmission` restait `PENDING_OBSERVATION` à vie, et
 * l'index `(observationStatus, emittedAt)` + le cron staleness n'avaient jamais
 * de transition à observer.
 *
 * Cette implémentation ferme la boucle de façon DÉTERMINISTE (zéro LLM,
 * idempotente, un seul UPDATE indexé) : un handler qui a rendu proprement passe
 * à `OBSERVED` ; un échec passe à `NOT_APPLICABLE` (rien de mesurable). Le cron
 * staleness conserve sa prérogative `STALE_OBSERVATION` sur les retards.
 */

import { db } from "@/lib/db";

/** Statuts d'exécution handler considérés comme « effet réellement produit ». */
const OBSERVABLE_HANDLER_STATUSES = new Set(["OK", "DOWNGRADED"]);

/**
 * Décision PURE (testable sans DB) de la transition d'observation.
 * - Idempotent : ne transitionne QUE depuis `PENDING_OBSERVATION` (sinon `null`).
 * - `OBSERVED` si le handler a produit un effet (OK/DOWNGRADED).
 * - `NOT_APPLICABLE` sinon (FAILED/VETOED — rien à mesurer).
 */
export function nextObservationStatus(
  handlerStatus: string,
  currentObservation: string,
): "OBSERVED" | "NOT_APPLICABLE" | null {
  if (currentObservation !== "PENDING_OBSERVATION") return null;
  return OBSERVABLE_HANDLER_STATUSES.has(handlerStatus) ? "OBSERVED" : "NOT_APPLICABLE";
}

/**
 * Ferme la boucle d'observation Seshat pour une IntentEmission.
 * Appelé par `bootstrap` sur `intent.completed` (fire-and-forget, best-effort).
 * Retourne `{ recorded: true }` uniquement quand l'effet est passé à OBSERVED.
 */
export async function observeIntent(
  intentId: string,
  _result?: unknown,
): Promise<{ recorded: boolean }> {
  if (!intentId) return { recorded: false };

  const emission = await db.intentEmission.findUnique({
    where: { id: intentId },
    select: { id: true, status: true, observationStatus: true },
  });
  if (!emission) return { recorded: false };

  const next = nextObservationStatus(emission.status, emission.observationStatus);
  if (!next) return { recorded: false }; // déjà observé / non transitionnable → no-op idempotent

  await db.intentEmission.update({
    where: { id: emission.id },
    data: { observationStatus: next, observedAt: new Date() },
  });
  return { recorded: next === "OBSERVED" };
}
