import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import type { Prisma } from "@prisma/client";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/**
 * System Config Router — CRUD for McpServerConfig records used as
 * general-purpose key/value config storage (system-config, matching-config, etc.).
 */
export const systemConfigRouter = createTRPCRouter({
  /**
   * Get a config by serverName key. `protectedProcedure` (tout compte
   * authentifié) : ces `config` sont des RÉGLAGES SYSTÈME non-secrets (les
   * secrets vivent en env vars, ADR-0075), pas des données de marque — et le
   * portail créateur `/creator/earnings/qc` en lit légitimement le taux de
   * compensation QC (`qcCompensationPerReview`). Round-4 avait gaté à
   * `operatorProcedure` par excès → régression (403 sur la page créateur).
   * Gating fin par-clé si une clé s'avère sensible = refinement tracé.
   */
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.mcpServerConfig.findUnique({
        where: { serverName: input.key },
      });
      return record?.config ?? null;
    }),

  /** Upsert a config by serverName key */
  upsert: governedProcedure({

    kind: "LEGACY_SYSTEM_CONFIG_UPSERT",
    requireOperator: true,

    inputSchema: z.object({ key: z.string(), config: z.record(z.string(), z.unknown()) }),

    caller: "system-config:upsert",

  })
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.mcpServerConfig.upsert({
        where: { serverName: input.key },
        create: {
          serverName: input.key,
          description: `Auto-created config for ${input.key}`,
          config: input.config as Prisma.InputJsonValue,
        },
        update: {
          config: input.config as Prisma.InputJsonValue,
        },
      });
      return record;
    }),

  /** Get system health metrics */
  health: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [auditCount, dbCheck] = await Promise.all([
      ctx.db.auditLog.count({
        where: { createdAt: { gte: monthStart } },
      }),
      ctx.db.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
    ]);

    return {
      dbHealthy: dbCheck,
      auditEventsThisMonth: auditCount,
    };
  }),

  /** Get recent audit trail — ADMIN only : journal d'audit GLOBAL (actions +
   * nom/email de TOUS les users) → divulgation cross-tenant sinon (audit round-4). */
  recentAudit: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.auditLog.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),
});
