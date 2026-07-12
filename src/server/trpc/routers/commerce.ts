/**
 * commerce — boutique de la marque (Shopify) : état, sync, déconnexion.
 * Vague « le cockpit ramène tout, l'utilisateur autorise » (2026-07-12).
 * La CONNEXION passe par le flow OAuth (/api/integrations/oauth/shopify/
 * start?commerce=1) — jamais par tRPC. Lecture = chokepoint canonique
 * ADR-0129 (owner / opérateur / ADMIN / collaborateur ACTIVE) ; écritures
 * gouvernées, non délégables en v1 (la boutique n'est pas une zone métier
 * du SOCIAL_MANAGER — DENY par défaut du firewall ADR-0131).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";

async function assertAccess(userId: string, strategyId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
  }
}

export const commerceRouter = createTRPCRouter({
  /** État de la boutique connectée (zéro secret) + dernier relevé de ventes. */
  getShopStatus: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertAccess(ctx.session.user.id, input.strategyId);
      const { getShopStatus } = await import("@/server/services/anubis/commerce-connect");
      const status = await getShopStatus(input.strategyId);
      const lastMetrics = await ctx.db.signal.findFirst({
        where: { strategyId: input.strategyId, type: "COMMERCE_METRICS" },
        orderBy: { createdAt: "desc" },
        select: { data: true, createdAt: true },
      });
      return {
        ...status,
        metrics: lastMetrics
          ? { ...(lastMetrics.data as Record<string, unknown>), capturedAt: lastMetrics.createdAt.toISOString() }
          : null,
      };
    }),

  /** Rafraîchit commandes/CA/top produits (7 j) — Signal COMMERCE_METRICS. */
  syncShop: governedProcedure({
    kind: "ANUBIS_SYNC_COMMERCE",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "commerce:syncShop",
  }).mutation(async ({ ctx, input }) => {
    await assertAccess(ctx.session.user.id, input.strategyId);
    const { syncStrategyShopifyOrders } = await import("@/server/services/anubis/commerce-connect");
    return syncStrategyShopifyOrders(input.strategyId);
  }),

  /** Déconnecte la boutique (statut DISCONNECTED + purge credentials). */
  disconnectShop: governedProcedure({
    kind: "ANUBIS_SOCIAL_DISCONNECT_ACCOUNT",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "commerce:disconnectShop",
  }).mutation(async ({ ctx, input }) => {
    await assertAccess(ctx.session.user.id, input.strategyId);
    const { disconnectShop } = await import("@/server/services/anubis/commerce-connect");
    await disconnectShop(input.strategyId);
    return { ok: true };
  }),
});
