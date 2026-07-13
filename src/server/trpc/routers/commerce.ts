/**
 * commerce — connecteurs `MediaPlatformConnection` de la marque : boutique
 * Shopify (état, sync, déconnexion) + liens des apps mobiles (App Store /
 * Play Store, Increment 2b). Vague « le cockpit ramène tout, l'utilisateur
 * autorise » (2026-07-12). La CONNEXION Shopify passe par le flow OAuth
 * (/api/integrations/oauth/shopify/start?commerce=1) — jamais par tRPC ;
 * les liens d'app (URLs publiques, aucun secret) se posent par tRPC gouverné.
 * Lecture = chokepoint canonique ADR-0129 (owner / opérateur / ADMIN /
 * collaborateur ACTIVE) ; écritures gouvernées, non délégables en v1 (DENY
 * par défaut du firewall ADR-0131).
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

  // ── Apps mobiles de la marque (App Store / Play Store) — Increment 2b ──

  /** Liens des apps + disponibilité des métriques (téléchargements/avis). */
  getMobileAppStatus: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertAccess(ctx.session.user.id, input.strategyId);
      const { getMobileAppStatus } = await import("@/server/services/anubis/mobile-app-connect");
      return getMobileAppStatus(input.strategyId);
    }),

  /** Pose/actualise les liens d'app (URLs publiques ; null délie un store). */
  linkMobileApp: governedProcedure({
    kind: "ANUBIS_LINK_MOBILE_APP",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      appStoreUrl: z
        .union([z.string().trim().regex(/^https:\/\/apps\.apple\.com\/\S+$/i, "URL App Store invalide"), z.null()])
        .default(null),
      playStoreUrl: z
        .union([
          z.string().trim().regex(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=\S+$/i, "URL Play Store invalide"),
          z.null(),
        ])
        .default(null),
    }),
    caller: "commerce:linkMobileApp",
  }).mutation(async ({ ctx, input }) => {
    await assertAccess(ctx.session.user.id, input.strategyId);
    const { linkMobileApp } = await import("@/server/services/anubis/mobile-app-connect");
    await linkMobileApp({
      strategyId: input.strategyId,
      userId: ctx.session.user.id,
      appStoreUrl: input.appStoreUrl,
      playStoreUrl: input.playStoreUrl,
    });
    return { ok: true };
  }),
});
