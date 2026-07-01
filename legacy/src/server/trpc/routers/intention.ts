/**
 * Intention — tRPC router (ADR-0106, Phase 24).
 *
 * Porte d'entrée du cycle de vie : capter une intention net-new, croiser
 * intention × ADVE → brief candidat (LLM ou manuel), valider le brief. Les
 * mutations passent toutes par `emitIntent` (governance) ; les lectures sont
 * de simples queries tenant-scopées.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { canAccessStrategy } from "@/server/services/operator-isolation";

const intentionTypeEnum = z.enum([
  "PRODUCT_LAUNCH", "REPOSITION", "MARKET_ENTRY", "CAMPAIGN", "PLATFORM", "PARTNERSHIP", "OTHER",
]);

/** Forme du brief candidat — manuel (parité ADR-0060) ou attendu du LLM. */
const manualBriefSchema = z.object({
  bigIdea: z.string().min(3),
  briefClient: z.object({
    contexte_business: z.string(),
    contexte_marque: z.string(),
    cible_principale: z.string(),
    obj_business: z.string(),
  }),
  briefCreatif: z.object({
    message_claim: z.string(),
    challenge_creatif: z.string(),
    tone_of_voice: z.string(),
    messages_cles: z.array(z.string()).default([]),
  }),
  rationale_adve: z.string(),
});

async function assertStrategyAccess(
  ctx: { session: { user: { id: string; role: string; operatorId?: string | null } } },
  strategyId: string,
) {
  const ok = await canAccessStrategy(strategyId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette stratégie." });
}

export const intentionRouter = createTRPCRouter({
  /** Liste les intentions d'une stratégie. */
  list: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      return ctx.db.intention.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Détail d'une intention. */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.intention.findUniqueOrThrow({ where: { id: input.id } });
      await assertStrategyAccess(ctx, row.strategyId);
      return row;
    }),

  /** Capture déterministe d'une intention net-new (status CAPTURED). */
  capture: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      type: intentionTypeEnum,
      title: z.string().min(1).max(300),
      description: z.string().min(1).max(8000),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        { kind: "CAPTURE_INTENTION", ...input, operatorId: ctx.session?.user?.id ?? undefined },
        { caller: "intention.capture" },
      );
      return result.output ?? { status: result.status };
    }),

  /** Croise l'intention × ADVE → brief candidat. Mode LLM ou MANUAL. */
  generateBrief: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      intentionId: z.string(),
      mode: z.enum(["LLM", "MANUAL"]),
      manualBrief: manualBriefSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        { kind: "GENERATE_BRIEF_FROM_INTENTION", ...input, operatorId: ctx.session?.user?.id ?? undefined },
        { caller: "intention.generateBrief" },
      );
      return { ...(result.output ?? { status: result.status }), warnings: result.warnings ?? [] };
    }),

  /** Valide le brief candidat (gate cohérence — override pour un brief divergent). */
  validateBrief: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      intentionId: z.string(),
      override: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        { kind: "VALIDATE_INTENTION_BRIEF", ...input, operatorId: ctx.session?.user?.id ?? undefined },
        { caller: "intention.validateBrief" },
      );
      return result.output ?? { status: result.status };
    }),
});
