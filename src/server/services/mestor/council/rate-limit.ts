/**
 * Rate-limit du chat Assistant — RÉUTILISE le store partagé `ScanRateHit`
 * (ADR-0161 : cross-worker, durable, sans Redis) plutôt qu'un compteur Map
 * par-instance. Clé préfixée `assistant:<userId>` — le champ `ip` du store est
 * une clé de fenêtre opaque, aucun risque de collision avec les IP réelles du
 * scoreur public (fenêtres et budgets indépendants par construction du count
 * filtré sur la clé).
 *
 * Fail-open assumé (même doctrine que le scoreur) : si le store est
 * injoignable, la route a de toute façon besoin de la DB pour persister le
 * fil — inutile de doubler la panne d'un 429 mensonger.
 */

import { db } from "@/lib/db";

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 20;

/**
 * Budget de DÉLIBÉRATION — distinct de celui du chat, et bien plus serré.
 *
 * Un message de chat coûte 1 appel LLM ; une délibération en coûte 5 (4
 * critiques + 1 synthèse, la position étant fournie par l'appelant). Le budget
 * du chat ne pouvait donc pas servir de garde-fou de coût : il autorisait 20
 * délibérations en dix minutes, soit une centaine d'appels sur le budget de la
 * marque. Et le chemin n'avait AUCUN contrôle serveur — `retry: false` côté
 * client n'en est pas un (relecture adversariale 2026-07-27).
 *
 * Compteur SÉPARÉ (préfixe de clé distinct) : consommer une délibération ne
 * doit pas fermer le chat, et inversement.
 */
const DELIBERATION_MAX_PER_WINDOW = 4;

export async function consumeAssistantBudget(userId: string): Promise<boolean> {
  return consume(`assistant:${userId}`, MAX_PER_WINDOW);
}

/** Budget dédié de l'analyse approfondie. Voir `DELIBERATION_MAX_PER_WINDOW`. */
export async function consumeDeliberationBudget(userId: string): Promise<boolean> {
  return consume(`council-deliberate:${userId}`, DELIBERATION_MAX_PER_WINDOW);
}

async function consume(key: string, max: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await db.scanRateHit.count({ where: { ip: key, at: { gt: since } } });
    if (recent >= max) return false;
    await db.scanRateHit.create({ data: { ip: key } });
    return true;
  } catch (err) {
    console.warn(
      "[assistant-rate-limit] store indisponible — fail-open:",
      err instanceof Error ? err.message : err,
    );
    return true;
  }
}
