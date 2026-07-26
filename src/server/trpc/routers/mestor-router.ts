import { z } from "zod";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { generateInsights } from "@/server/services/mestor/insights";
import * as mestor from "@/server/services/mestor";
import { auditedProcedure, governedProcedure } from "@/server/governance/governed-procedure";
import { db } from "@/lib/db";
/* lafusee:governed-active */

// ── ADR-0181 — fil Assistant : clear = mutation user-owned advisory, voie
// auditée (kind LEGACY générique) ; pas une mutation métier de marque.
const auditedStrategyScoped = auditedProcedure(strategyScopedProcedure, "mestor-router");

export const mestorRouter = createTRPCRouter({
  /** Get proactive AI insights for a strategy (Artemis) */
  getInsights: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return generateInsights(input.strategyId);
    }),

  // NB : l'ancienne procédure `chat` (LEGACY_MESTOR_ROUTER_CHAT) — inerte, elle
  // renvoyait le system prompt au client sans jamais appeler de LLM, zéro
  // caller — a été DÉPOSÉE (ADR-0179). Le chat vit sur POST /api/chat
  // (streaming) ; le kind reste catalogué (historique d'émissions).

  // ── Assistant de marque — historique persisté (ADR-0181) ─────────────

  /** Historique du fil Assistant (40 derniers messages, ordre chronologique). */
  assistantHistory: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await db.assistantThread.findFirst({
        where: { strategyId: input.strategyId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!thread) return { threadId: null, messages: [] };
      const rows = await db.assistantMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, role: true, content: true, createdAt: true },
      });
      return { threadId: thread.id, messages: rows.reverse() };
    }),

  /** Nouvelle conversation : supprime le fil (cascade messages). */
  assistantClear: auditedStrategyScoped
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.assistantThread.deleteMany({
        where: { strategyId: input.strategyId, userId: ctx.session.user.id },
      });
      return { cleared: true };
    }),

  // ── Conseil de marque — délibération adversariale (ADR-0180) ─────────
  // Query (zéro écriture — advisory pur, précédent previewAmend « lecture LLM ») ;
  // opérateur only en v1 : 6 appels LLM, le coût reste une décision UPgraders.
  councilDeliberate: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        topic: z.string().min(3).max(2_000),
        draft: z.string().max(8_000).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { deliberate } = await import("@/server/services/mestor/council");
      return deliberate(input);
    }),

  /** Get context label for Mestor */
  getContextLabel: protectedProcedure
    .input(z.object({ context: z.enum(["cockpit", "creator", "console", "intake"]) }))
    .query(({ input }) => mestor.getContextLabel(input.context)),

  // ── Plan Persistence (Phase 5 NETERU) ──────────────────────────────

  /** Build an orchestration plan for a strategy */
  buildPlan: governedProcedure({
    kind: "BUILD_PLAN",
    inputSchema: z.object({ strategyId: z.string() }),
  }).mutation(async ({ input }) => {
      const { buildPlan, persistPlan } = await import("@/server/services/neteru-shared/hyperviseur");
      const plan = await buildPlan(input.strategyId);
      const planId = await persistPlan(plan);
      return { planId, plan };
    }),

  /** Load an existing plan */
  loadPlan: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const { loadPlan } = await import("@/server/services/neteru-shared/hyperviseur");
      return loadPlan(input.strategyId);
    }),

  /** Resume a persisted plan (execute pending steps) */
  resumePlan: governedProcedure({

    kind: "LEGACY_MESTOR_ROUTER_RESUME_PLAN",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "mestor-router:resumePlan",

  })
    .mutation(async ({ input }) => {
      const { resumePlan } = await import("@/server/services/neteru-shared/hyperviseur");
      return resumePlan(input.strategyId);
    }),

  /** Resolve a WAIT_HUMAN step and continue execution */
  resolveStep: governedProcedure({

    kind: "LEGACY_MESTOR_ROUTER_RESOLVE_STEP",

    inputSchema: z.object({ strategyId: z.string(), stepId: z.string() }),

    caller: "mestor-router:resolveStep",

  })
    .mutation(async ({ input }) => {
      const { loadPlan, resolveHumanStep, executePlan, persistPlan } =
        await import("@/server/services/neteru-shared/hyperviseur");
      const plan = await loadPlan(input.strategyId);
      if (!plan) throw new Error("Plan not found");
      resolveHumanStep(plan, input.stepId);
      const executed = await executePlan(plan);
      await persistPlan(executed);
      return executed;
    }),
});
