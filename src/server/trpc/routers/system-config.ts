import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import type { Prisma } from "@prisma/client";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { TRPCError } from "@trpc/server";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { deliverySettingsInputSchema } from "@/domain/delivery-settings";
import { DELIVERY_SETTINGS_KEY, getDeliverySettings, saveDeliverySettings } from "@/server/services/anubis/delivery-settings";
/* lafusee:governed-active */

/**
 * System Config Router — CRUD for McpServerConfig records used as
 * general-purpose key/value config storage (system-config, matching-config, etc.).
 */
export const systemConfigRouter = createTRPCRouter({
  /**
   * Get a config by serverName key. `protectedProcedure` (tout compte
   * authentifié) : ces `config` sont des RÉGLAGES SYSTÈME non-secrets (les
   * réglages de livraison chiffrés sont exclus par clé), pas des données de marque — et le
   * portail créateur `/creator/earnings/qc` en lit légitimement le taux de
   * compensation QC (`qcCompensationPerReview`). Round-4 avait gaté à
   * `operatorProcedure` par excès → régression (403 sur la page créateur).
   * Gating fin par-clé si une clé s'avère sensible = refinement tracé.
   */
  get: protectedProcedure
    .input(z.object({ key: z.string().refine(key => key !== DELIVERY_SETTINGS_KEY, "Utiliser la configuration de livraison administrateur.") }))
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

    inputSchema: z.object({ key: z.string().refine(key => key !== DELIVERY_SETTINGS_KEY, "Utiliser la configuration de livraison administrateur."), config: z.record(z.string(), z.unknown()) }),

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

  getDeliverySettings: adminProcedure.query(({ ctx }) => getDeliverySettings(ctx.db)),

  // Manual spine, as accounts.resetPassword: the secret-bearing input never
  // reaches governedProcedure's automatic input/result serialization.
  saveDeliverySettings: adminProcedure.input(deliverySettingsInputSchema).mutation(async ({ ctx, input }) => {
    const actor = ctx.session.user;
    if (actor.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
    const intentId = await openEmission({ kind: "LEGACY_SYSTEM_CONFIG_UPSERT", caller: "system-config:saveDeliverySettings",
      payload: { key: DELIVERY_SETTINGS_KEY, actor: actor.id, sections: Object.keys(input),
        operations: { email: input.email?.apiKey?.action ?? "KEEP", cinetpayKey: input.cinetpay?.apiKey?.action ?? "KEEP", cinetpayCredential: input.cinetpay?.apiPassword?.action ?? "KEEP" } } });
    try {
      const result = await saveDeliverySettings(input, ctx.db);
      await closeEmission({ intentId, status: "OK", result: { saved: true, emailStatus: result.email.status, paymentStatus: result.cinetpay.status } });
      return result;
    } catch {
      // Driver/upstream errors can echo arguments. Never serialize their text.
      await closeEmission({ intentId, status: "FAILED", result: { code: "DELIVERY_SETTINGS_SAVE_FAILED" } }).catch(() => undefined);
      // A failed audit acknowledgement can follow a committed configuration.
      // Do not claim rollback or echo the driver's possibly sensitive error.
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’enregistrement n’a pas pu être confirmé. Rechargez les paramètres pour vérifier leur état. Si nécessaire, vérifiez le fournisseur choisi et la disponibilité du coffre de chiffrement." });
    }
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
