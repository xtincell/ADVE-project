// ============================================================================
// MODULE M18 — Commission Engine
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §2.2.8 + §4.2 | Division: La Fusée (SOCLE)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  calculate(missionId) → commission amount based on tier + Driver type
// [x] REQ-2  list, getByMission, getByCreator, markPaid
// [x] REQ-3  generatePaymentOrder → creates PaymentOrder for Serenite
// [x] REQ-4  tierAtTime(creatorId, date) → historical tier for retroactive calc
// [x] REQ-5  getOperatorFees(operatorId) → operator commission percentage
// [x] REQ-6  Auto-calcul on mission completion (trigger from mission state machine)
// [x] REQ-7  Membership integration (tier membership fees affect commission rates)
// [x] REQ-8  COMMISSION_RATES configurable by SystemConfig
//
// PROCEDURES: calculate, list, getByMission, getByCreator, markPaid,
//             generatePaymentOrder, tierAtTime, getOperatorFees,
//             calculateOnComplete, getAdjustedRate, getConfigurableRates
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import {
  calculate as engineCalculate,
  generatePaymentOrder as engineGeneratePaymentOrder,
  TIER_RATES as DEFAULT_COMMISSION_RATES,
  MEMBERSHIP_DISCOUNT,
  effectiveTalentRate,
} from "@/server/services/commission-engine";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/**
 * Périmètre du caller pour les lectures commission (fix fuite P1) :
 *   - ADMIN → tout ;
 *   - user rattaché à un Operator (portail Agency) → commissions des missions
 *     dont la Strategy appartient à SON operator ;
 *   - sinon (talent/founder) → ses propres commissions uniquement.
 * Les montants/talentIds de la plateforme entière ne sont plus lisibles par
 * n'importe quel compte connecté.
 */
async function commissionScope(ctx: {
  session: { user: { id: string; role?: string | null } };
  db: { user: { findUnique: (args: { where: { id: string }; select: { operatorId: true } }) => Promise<{ operatorId: string | null } | null> } };
}): Promise<{ isAdmin: boolean; operatorId: string | null; userId: string }> {
  const userId = ctx.session.user.id;
  if (ctx.session.user.role === "ADMIN") return { isAdmin: true, operatorId: null, userId };
  const user = await ctx.db.user.findUnique({ where: { id: userId }, select: { operatorId: true } });
  return { isAdmin: false, operatorId: user?.operatorId ?? null, userId };
}

// Taux de commission + remise d'adhésion : SOURCE UNIQUE = commission-engine
// (importés ci-dessus). Round-11 : les doublons locaux ont été supprimés pour
// que l'affichage (getAdjustedRate) et le chemin argent (engineCalculate) ne
// puissent plus diverger.

export const commissionRouter = createTRPCRouter({
  // Calcul/écriture de commission = acte STAFF (déclenché par la machine à états
  // de mission ou l'opérateur). requireOperator (audit round-4) : un créateur ne
  // peut plus se fabriquer une Commission PENDING pour amorcer un payout.
  calculate: governedProcedure({

    kind: "LEGACY_COMMISSION_CALCULATE",
    requireOperator: true,

    inputSchema: z.object({ missionId: z.string() }),

    caller: "commission:calculate",

  })
    .mutation(async ({ ctx, input }) => {
      try {
        // Idempotence (audit adversarial 2026-07-22) : sans ce garde, chaque appel
        // créait une NOUVELLE Commission PENDING pour la même mission → deux lignes
        // indépendamment payables = double-payout. Miroir de `calculateOnComplete`.
        const existing = await ctx.db.commission.findFirst({
          where: { missionId: input.missionId },
        });
        if (existing) {
          return { commissionId: existing.id, alreadyExists: true as const };
        }

        const result = await engineCalculate(input.missionId);

        // Persist the commission record
        const commission = await ctx.db.commission.create({
          data: {
            missionId: input.missionId,
            talentId: result.userId,
            grossAmount: result.grossAmount,
            commissionRate: result.commissionRate,
            commissionAmount: result.commissionAmount,
            netAmount: result.netAmount,
            tierAtTime: result.tierAtTime,
            operatorFee: result.operatorFee,
            currency: "XAF",
            status: "PENDING",
          },
        });

        return { commissionId: commission.id, ...result };
      } catch (error) {
        throw new Error(
          `Failed to calculate commission for mission ${input.missionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const scope = await commissionScope(ctx);
      const items = await ctx.db.commission.findMany({
        where: scope.isAdmin
          ? {}
          : scope.operatorId
            ? { mission: { strategy: { operatorId: scope.operatorId } } }
            : { talentId: scope.userId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) { nextCursor = items.pop()?.id; }
      return { items, nextCursor };
    }),

  getByMission: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scope = await commissionScope(ctx);
      return ctx.db.commission.findMany({
        where: {
          missionId: input.missionId,
          ...(scope.isAdmin
            ? {}
            : scope.operatorId
              ? { mission: { strategy: { operatorId: scope.operatorId } } }
              : { talentId: scope.userId }),
        },
      });
    }),

  getByCreator: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Un compte non-ADMIN ne lit QUE ses propres commissions — l'input
      // userId d'autrui est refusé, pas silencieusement remplacé.
      const scope = await commissionScope(ctx);
      const target = input.userId ?? scope.userId;
      if (!scope.isAdmin && target !== scope.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lecture des commissions d'un autre compte réservée aux administrateurs" });
      }
      return ctx.db.commission.findMany({
        where: { talentId: target },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Flag PAID = acte financier STAFF (les payouts sautent les commissions PAID —
  // un tiers pouvait supprimer un payout légitime ou falsifier l'état).
  markPaid: governedProcedure({


    kind: "LEGACY_COMMISSION_MARK_PAID",
    requireOperator: true,


    inputSchema: z.object({ id: z.string() }),


    caller: "commission:markPaid",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.commission.update({
        where: { id: input.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }),

  // Injecte un PaymentOrder payable dans la file de décaissement : STAFF only.
  generatePaymentOrder: governedProcedure({


    kind: "LEGACY_COMMISSION_GENERATE_PAYMENT_ORDER",
    requireOperator: true,


    inputSchema: z.object({ commissionId: z.string() }),


    caller: "commission:generatePaymentOrder",


  })
    .mutation(async ({ input }) => {
      try {
        const paymentOrder = await engineGeneratePaymentOrder(input.commissionId);
        return { commissionId: input.commissionId, paymentOrder };
      } catch (error) {
        throw new Error(
          `Failed to generate payment order for commission ${input.commissionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ── REQ-4: tierAtTime — find creator tier at a specific date ─────────────
  // Historique tier/commissions d'un creator arbitraire : réservé au calcul
  // rétroactif opérateur/console (fix fuite P1 — était protectedProcedure).
  tierAtTime: operatorProcedure
    .input(z.object({ creatorId: z.string(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);

      // 1. Check commission records around that date for historical tier
      const nearestCommission = await ctx.db.commission.findFirst({
        where: {
          talentId: input.creatorId,
          createdAt: { lte: targetDate },
          tierAtTime: { not: null },
        },
        orderBy: { createdAt: "desc" },
      });

      if (nearestCommission?.tierAtTime) {
        return {
          creatorId: input.creatorId,
          date: input.date,
          tier: nearestCommission.tierAtTime,
          source: "commission_history",
        };
      }

      // 2. Check membership history for active membership at that date
      const membership = await ctx.db.membership.findFirst({
        where: {
          talentProfile: { userId: input.creatorId },
          currentPeriodStart: { lte: targetDate },
          currentPeriodEnd: { gte: targetDate },
        },
        orderBy: { currentPeriodStart: "desc" },
      });

      if (membership) {
        return {
          creatorId: input.creatorId,
          date: input.date,
          tier: membership.tier,
          source: "membership_history",
        };
      }

      // 3. Fallback to current TalentProfile tier
      const profile = await ctx.db.talentProfile.findUnique({
        where: { userId: input.creatorId },
      });

      return {
        creatorId: input.creatorId,
        date: input.date,
        tier: profile?.tier ?? "APPRENTI",
        source: "current_profile",
      };
    }),

  // ── REQ-5: getOperatorFees — query Operator model for commission % ───────
  getOperatorFees: adminProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operator = await ctx.db.operator.findUniqueOrThrow({
        where: { id: input.operatorId },
      });

      // Sum all commission operator fees for this operator's strategies
      const strategies = await ctx.db.strategy.findMany({
        where: { operatorId: input.operatorId },
        select: { id: true },
      });
      const strategyIds = strategies.map((s) => s.id);

      const commissions = await ctx.db.commission.findMany({
        where: {
          mission: { strategyId: { in: strategyIds } },
          operatorFee: { not: null },
        },
      });

      const totalFees = commissions.reduce((sum, c) => sum + (c.operatorFee ?? 0), 0);

      return {
        operatorId: input.operatorId,
        operatorName: operator.name,
        commissionRate: operator.commissionRate,
        licenseType: operator.licenseType,
        totalFeesCollected: totalFees,
        commissionCount: commissions.length,
      };
    }),

  // ── REQ-6: calculateOnComplete — auto-calc on mission completion ─────────
  calculateOnComplete: governedProcedure({

    kind: "LEGACY_COMMISSION_CALCULATE_ON_COMPLETE",
    requireOperator: true,

    inputSchema: z.object({ missionId: z.string() }),

    caller: "commission:calculateOnComplete",

  })
    .mutation(async ({ ctx, input }) => {
      const mission = await ctx.db.mission.findUniqueOrThrow({
        where: { id: input.missionId },
      });

      // Only process completed missions
      if (mission.status !== "COMPLETED" && mission.status !== "DELIVERED") {
        throw new Error(`Mission ${input.missionId} is not completed (status: ${mission.status})`);
      }

      // Check if commission already exists
      const existing = await ctx.db.commission.findFirst({
        where: { missionId: input.missionId },
      });
      if (existing) {
        return { commissionId: existing.id, alreadyExists: true };
      }

      // Calculate using engine
      const result = await engineCalculate(input.missionId);

      const commission = await ctx.db.commission.create({
        data: {
          missionId: input.missionId,
          talentId: result.userId,
          grossAmount: result.grossAmount,
          commissionRate: result.commissionRate,
          commissionAmount: result.commissionAmount,
          netAmount: result.netAmount,
          tierAtTime: result.tierAtTime,
          operatorFee: result.operatorFee,
          currency: "XAF",
          status: "PENDING",
        },
      });

      return { commissionId: commission.id, alreadyExists: false, ...result };
    }),

  // ── REQ-7: getAdjustedRate — membership fees affect commission rates ─────
  getAdjustedRate: protectedProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Taux/membership d'un creator : soi-même, ou ADMIN/opérateur (agences
      // travaillent avec les talents) — jamais un talent tiers arbitraire.
      const scope = await commissionScope(ctx);
      if (!scope.isAdmin && !scope.operatorId && input.creatorId !== scope.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lecture du taux d'un autre talent réservée aux opérateurs" });
      }
      const profile = await ctx.db.talentProfile.findUnique({
        where: { userId: input.creatorId },
        include: { memberships: { where: { status: "ACTIVE" }, take: 1 } },
      });

      const tier = profile?.tier ?? "APPRENTI";
      const baseRate = DEFAULT_COMMISSION_RATES[tier as keyof typeof DEFAULT_COMMISSION_RATES] ?? 0.60;
      const hasActiveMembership = (profile?.memberships?.length ?? 0) > 0;

      // Active membership grants a discount on platform commission. adjustedRate
      // = MÊME helper que le chemin argent (engineCalculate) → jamais de divergence.
      const discount = hasActiveMembership ? (MEMBERSHIP_DISCOUNT[tier as keyof typeof MEMBERSHIP_DISCOUNT] ?? 0) : 0;
      const adjustedRate = effectiveTalentRate(tier, hasActiveMembership);

      return {
        creatorId: input.creatorId,
        tier,
        baseRate,
        hasActiveMembership,
        membershipDiscount: discount,
        adjustedRate,
        platformCommission: 1 - adjustedRate,
      };
    }),

  // ── REQ-8: getConfigurableRates — COMMISSION_RATES from BrandOSConfig ────
  getConfigurableRates: adminProcedure
    .input(z.object({ strategyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let customRates: Record<string, number> | null = null;

      if (input.strategyId) {
        const config = await ctx.db.brandOSConfig.findUnique({
          where: { strategyId: input.strategyId },
        });
        const configData = config?.config as Record<string, unknown> | null;
        if (configData?.commissionRates) {
          customRates = configData.commissionRates as Record<string, number>;
        }
      }

      return {
        rates: customRates ?? DEFAULT_COMMISSION_RATES,
        source: customRates ? "brand_os_config" : "system_defaults",
        defaults: DEFAULT_COMMISSION_RATES,
      };
    }),
});
