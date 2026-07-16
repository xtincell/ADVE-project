/**
 * Garde de LECTURE par marque — chokepoint ADR-0129 pour les routers legacy.
 *
 * Audit 2026-07-16 (`legacy-read-procedures-cross-tenant`,
 * `superfan-overton-queries-unscoped-pii`) : le durcissement requireOperator
 * (PR #447) couvrait les mutations, pas les lectures — tout compte authentifié
 * pouvait lire campagnes, missions, commissions, superfans (PII) de n'importe
 * quelle marque en passant un strategyId arbitraire. Toute query legacy qui
 * prend un strategyId appelle ce garde en tête.
 */
import { TRPCError } from "@trpc/server";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";

export async function assertStrategyRead(userId: string, strategyId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" });
  }
}
