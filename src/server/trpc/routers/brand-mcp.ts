/**
 * Brand MCP — surface COCKPIT (founder) des clés MCP scopées à SA marque.
 *
 * Réutilise le mécanisme de clés MCP (ADR-0145, modèle `mcpApiKey`, `scopeKind:
 * "BRAND"`) déjà exploité côté console par l'opérateur — ici scopé à la marque
 * courante, pour que le fondateur récupère son endpoint `/api/mcp` + génère une
 * clé à coller dans Claude. La clé en clair n'est montrée qu'À la création (seul
 * le hash est persisté). Toute opération est gardée par `canAccessStrategy`.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { createApiKey } from "@/server/services/anubis/mcp-billing";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
/* lafusee:governed-active — router d'infra clés MCP scopées marque (ADR-0145) ; émission/révocation de credentials d'accès, pas une mutation d'entité de marque gouvernée par mestor (parité cockpit du router mcp-billing console). */

async function assertAccess(userId: string, strategyId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
  }
}

/** Endpoint MCP public de l'app (base résolue serveur). */
function mcpEndpoint(): string {
  const base = (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://powerupgraders.com"
  ).replace(/\/$/, "");
  return `${base}/api/mcp`;
}

export const brandMcpRouter = createTRPCRouter({
  /** Endpoint + clés existantes (masquées) de la marque. */
  info: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertAccess(ctx.session.user.id, input.strategyId);
      const keys = await db.mcpApiKey.findMany({
        where: { scopeKind: "BRAND", scopeStrategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, isActive: true, lastUsedAt: true, createdAt: true, expiresAt: true },
      });
      return { endpoint: mcpEndpoint(), keys };
    }),

  /**
   * Génère une clé MCP scopée à la marque. `plaintextKey` retournée UNE fois.
   * Server "*" (tous les outils MCP de l'OS pour cette marque).
   */
  createKey: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), name: z.string().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(ctx.session.user.id, input.strategyId);
      const created = await createApiKey({
        name: input.name,
        server: "*",
        scopeKind: "BRAND",
        scopeStrategyId: input.strategyId,
      });
      return created; // { id, plaintextKey }
    }),

  /** Révoque (désactive) une clé de la marque. */
  revokeKey: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), keyId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(ctx.session.user.id, input.strategyId);
      const updated = await db.mcpApiKey.updateMany({
        where: { id: input.keyId, scopeKind: "BRAND", scopeStrategyId: input.strategyId },
        data: { isActive: false },
      });
      if (updated.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Clé introuvable pour cette marque" });
      return { revoked: updated.count };
    }),
});
