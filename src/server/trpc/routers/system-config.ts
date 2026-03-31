import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import type { Prisma } from "@prisma/client";

/**
 * System Config Router — CRUD for McpServerConfig records used as
 * general-purpose key/value config storage (system-config, matching-config, etc.).
 */
export const systemConfigRouter = createTRPCRouter({
  /** Get a config by serverName key */
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.mcpServerConfig.findUnique({
        where: { serverName: input.key },
      });
      return record?.config ?? null;
    }),

  /** Upsert a config by serverName key */
  upsert: adminProcedure
    .input(z.object({ key: z.string(), config: z.record(z.unknown()) }))
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

  /** Get recent audit trail */
  recentAudit: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.auditLog.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),
});
