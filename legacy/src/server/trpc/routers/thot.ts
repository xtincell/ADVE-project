/**
 * Thot — tRPC router for atomized composite action-costing (ADR-0093).
 *
 * `calc.*` are pure read-only computations (no Intent — ADR-0087 §2 : thot.calc.*
 * takes zoneCode). `catalog.*` / `zoneIndex.*` / `providerRate.*` reads expose the
 * cost database. Mutations traverse `mestor.emitIntent` (governance rule).
 */

/* lafusee:governed-active — toutes les mutations traversent mestor.emitIntent ; le seul import service direct est `estimateActionCostFromDb`, un accesseur read-only (calc.* sont des queries pures — ADR-0087 §2, pas de mutation). */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { estimateActionCostFromDb } from "@/server/services/financial-brain/action-costing/estimator";

const QUALITY = z.enum(["BASIC", "STANDARD", "PREMIUM"]);
const ZONE_FAMILY = z.enum([
  "COST_OF_LIVING", "FOREX", "MACRO", "TJM", "MARKETING_BUDGETS", "MOBILE_MONEY_FEES", "TAXES",
]);
const COST_DRIVER = z.enum([
  "LABOR", "EQUIPMENT_RENTAL", "LOCATION", "TRAVEL", "PER_DIEM", "CONSUMABLES", "POST_PRODUCTION",
  "LICENSE", "MEDIA_SPACE", "LOGISTICS", "AGENCY_MARGIN", "CONTINGENCY", "TAX",
]);
const COST_UNIT = z.enum([
  "HOUR", "DAY", "HALF_DAY", "UNIT", "FLAT", "PERCENT", "KM", "SQUARE_METER", "IMPRESSION",
]);

const estimateInput = z.object({
  templateKey: z.string().min(1),
  zoneCode: z.string().length(2),
  qualityTier: QUALITY.optional(),
  providerId: z.string().optional(),
  marginPct: z.number().min(0).max(2).optional(),
  contingencyPct: z.number().min(0).max(1).optional(),
  taxRatePct: z.number().min(0).max(1).optional(),
  componentOverrides: z
    .record(z.string(), z.object({ quantity: z.number().min(0).optional(), disabled: z.boolean().optional() }))
    .optional(),
});

export const thotRouter = createTRPCRouter({
  calc: createTRPCRouter({
    /** Pure deterministic estimate — does NOT persist (read-only). */
    estimateActionCost: protectedProcedure.input(estimateInput).query(async ({ input }) => {
      return estimateActionCostFromDb(input.templateKey, {
        zoneCode: input.zoneCode,
        qualityTier: input.qualityTier,
        providerId: input.providerId,
        marginPct: input.marginPct,
        contingencyPct: input.contingencyPct,
        taxRatePct: input.taxRatePct,
        componentOverrides: input.componentOverrides,
      });
    }),
  }),

  catalog: createTRPCRouter({
    listTemplates: protectedProcedure
      .input(z.object({ category: z.string().optional(), activeOnly: z.boolean().default(true) }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.db.actionCostTemplate.findMany({
          where: {
            ...(input?.category ? { category: input.category } : {}),
            ...(input?.activeOnly === false ? {} : { active: true }),
          },
          orderBy: [{ category: "asc" }, { label: "asc" }],
          include: { _count: { select: { components: true } } },
        });
      }),
    getTemplate: protectedProcedure
      .input(z.object({ actionKey: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.actionCostTemplate.findUnique({
          where: { actionKey: input.actionKey },
          include: { components: { orderBy: { sortOrder: "asc" } } },
        });
      }),
    estimateHistory: protectedProcedure
      .input(z.object({ brandActionId: z.string().optional(), strategyId: z.string().optional(), take: z.number().min(1).max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        return ctx.db.actionCostEstimate.findMany({
          where: {
            ...(input.brandActionId ? { brandActionId: input.brandActionId } : {}),
            ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          },
          orderBy: { computedAt: "desc" },
          take: input.take,
        });
      }),
  }),

  zoneIndex: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({ family: ZONE_FAMILY.optional(), zoneCode: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.db.zoneIndex.findMany({
          where: {
            ...(input?.family ? { family: input.family } : {}),
            ...(input?.zoneCode ? { zoneCode: input.zoneCode } : {}),
            OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
          },
          orderBy: [{ family: "asc" }, { zoneCode: "asc" }, { key: "asc" }, { validFrom: "desc" }],
        });
      }),
  }),

  providerRate: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({ providerId: z.string().optional(), driver: COST_DRIVER.optional() }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.db.providerCostRate.findMany({
          where: {
            active: true,
            ...(input?.providerId ? { providerId: input.providerId } : {}),
            ...(input?.driver ? { driver: input.driver } : {}),
          },
          orderBy: { validFrom: "desc" },
          take: 200,
        });
      }),
  }),

  // ── Mutations (governance — via mestor.emitIntent) ──
  estimateActionCost: operatorProcedure
    .input(estimateInput.extend({ strategyId: z.string().default("(global)"), brandActionId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "THOT_ESTIMATE_ACTION_COST",
          strategyId: input.strategyId,
          templateKey: input.templateKey,
          zoneCode: input.zoneCode,
          qualityTier: input.qualityTier,
          providerId: input.providerId,
          marginPct: input.marginPct,
          contingencyPct: input.contingencyPct,
          taxRatePct: input.taxRatePct,
          componentOverrides: input.componentOverrides,
          brandActionId: input.brandActionId,
          operatorId: ctx.session.user.id,
        },
        { caller: "thot.estimateActionCost" },
      );
    }),

  upsertZoneIndex: operatorProcedure
    .input(
      z.object({
        family: ZONE_FAMILY,
        zoneCode: z.string().length(2),
        key: z.string().min(1),
        value: z.number(),
        currency: z.string().optional(),
        unit: z.string().optional(),
        sourceRef: z.string().optional(),
        validFrom: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "THOT_UPSERT_ZONE_INDEX",
          strategyId: "(global)",
          family: input.family,
          zoneCode: input.zoneCode,
          key: input.key,
          value: input.value,
          currency: input.currency,
          unit: input.unit,
          sourceRef: input.sourceRef,
          validFrom: input.validFrom,
          operatorId: ctx.session.user.id,
        },
        { caller: "thot.upsertZoneIndex" },
      );
    }),

  upsertProviderRate: operatorProcedure
    .input(
      z.object({
        providerKind: z.enum(["TALENT", "GUILD", "EXTERNAL"]),
        providerId: z.string().min(1),
        providerLabel: z.string().optional(),
        driver: COST_DRIVER,
        roleKey: z.string().optional(),
        zoneCode: z.string().length(2).optional(),
        rate: z.number().min(0),
        unit: COST_UNIT.optional(),
        currency: z.string().optional(),
        sourceRef: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "THOT_UPSERT_PROVIDER_RATE",
          strategyId: "(global)",
          providerKind: input.providerKind,
          providerId: input.providerId,
          providerLabel: input.providerLabel,
          driver: input.driver,
          roleKey: input.roleKey,
          zoneCode: input.zoneCode,
          rate: input.rate,
          unit: input.unit,
          currency: input.currency,
          sourceRef: input.sourceRef,
          operatorId: ctx.session.user.id,
        },
        { caller: "thot.upsertProviderRate" },
      );
    }),
});
