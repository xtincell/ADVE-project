import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../init";
import { canAccessStrategy, getOperatorContext, scopeStrategies } from "@/server/services/operator-isolation";
import { db } from "@/lib/db";

/**
 * Chokepoint d'ownership par marque — middleware canonique (ADR-0166).
 *
 * Recensement 2026-07-20 (suite fuite gazette Jehuty, v6.27.230) : 43 routeurs
 * `protectedProcedure` acceptaient un `strategyId` arbitraire sans vérifier
 * l'accès — tout compte authentifié pouvait lire (et parfois muter) les données
 * d'une autre marque. Ce middleware résout l'accès UNE fois, via le chokepoint
 * ADR-0129 (`canAccessStrategy` : owner / opérateur / collaborateur ACTIVE /
 * god-mode), AVANT le handler.
 *
 * Deux formes :
 * - `strategyScopedProcedure` — remplace `protectedProcedure` quand l'input a
 *   un `strategyId` REQUIS top-level. `strategyId` absent → BAD_REQUEST (le
 *   middleware refuse de laisser passer un appel non scopable).
 * - `assertRawStrategyScope(userId, raw, { optional })` — pour les bases
 *   composées (ex. `auditedProcedure(protectedProcedure, …).use(…)`) et les
 *   inputs à `strategyId` optionnel (le handler DOIT alors scoper lui-même la
 *   branche sans strategyId via `scopeStrategies`).
 *
 * Verrou CI : `tests/unit/governance/strategy-ownership-guard.test.ts` (HARD)
 * — toute procédure protected+strategyId sans garde casse le build.
 */
export async function assertRawStrategyScope(
  userId: string,
  rawInput: unknown,
  opts: { optional?: boolean } = {},
): Promise<void> {
  const strategyId =
    rawInput && typeof rawInput === "object" && "strategyId" in rawInput
      ? (rawInput as { strategyId?: unknown }).strategyId
      : undefined;

  if (typeof strategyId !== "string" || strategyId.length === 0) {
    if (opts.optional) return;
    throw new TRPCError({ code: "BAD_REQUEST", message: "strategyId requis" });
  }

  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" });
  }
}

/**
 * Ids des marques accessibles à l'utilisateur (owner / opérateur / collaborateur
 * ACTIVE). `null` = accès global (ADMIN/god-mode) — pas de filtre à poser.
 * Pour scoper les modèles à lien `strategyId` lâche (sans relation Prisma :
 * Conversation, CrmContact, ActionCostEstimate…) via `strategyId: { in: ids }`.
 */
export async function accessibleStrategyIds(userId: string): Promise<string[] | null> {
  const opCtx = await getOperatorContext(userId);
  if (opCtx.role === "ADMIN") return null;
  const rows = await db.strategy.findMany({
    where: scopeStrategies(opCtx),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export const strategyScopedProcedure = protectedProcedure.use(
  async ({ ctx, getRawInput, next }) => {
    await assertRawStrategyScope(ctx.session.user.id, await getRawInput());
    return next({ ctx });
  },
);
