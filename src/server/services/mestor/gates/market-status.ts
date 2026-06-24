/**
 * mestor/gates/market-status.ts — ADR-0105 market kill-switch op-gate.
 *
 * Refuse toute mutation ciblant une stratégie dont le marché est FROZEN ou
 * SHADOWBANNED (lecture seule). Résout `strategyId → Strategy.countryCode →
 * Country.status`. PASS si pas de marché rattaché, marché ACTIVE, ou sentinelle
 * d'Intent marché (`MARKET:<code>`). Les Intents du kill-switch lui-même
 * (NEUTRALIZE/REINSTATE/PURGE_MARKET) sont exemptés en amont par kind.
 *
 * Lit le client brut (`@/lib/db`) — non market-filtré — pour voir les marchés
 * gelés que le Proxy `marketScopedDb` masquerait aux lectures non-ADMIN.
 */

import { db } from "@/lib/db";
import type { GateResult } from "./gate-types";

export async function marketStatusGate(strategyId: string): Promise<GateResult> {
  if (!strategyId || strategyId.startsWith("MARKET:")) return { verdict: "PASS" };

  const strat = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { countryCode: true },
  });
  const code = strat?.countryCode;
  if (!code) return { verdict: "PASS" };

  const country = await db.country.findUnique({ where: { code }, select: { status: true } });
  if (country && (country.status === "FROZEN" || country.status === "SHADOWBANNED")) {
    return {
      verdict: "BLOCK",
      reason: `Marché ${code} ${country.status} — opérations gelées (ADR-0105 market kill-switch).`,
    };
  }
  return { verdict: "PASS" };
}
