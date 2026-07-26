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

export async function consumeAssistantBudget(userId: string): Promise<boolean> {
  const key = `assistant:${userId}`;
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await db.scanRateHit.count({ where: { ip: key, at: { gt: since } } });
    if (recent >= MAX_PER_WINDOW) return false;
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
