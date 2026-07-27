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
  // Query (zéro écriture — advisory pur, précédent previewAmend « lecture LLM »).
  /**
   * Analyse approfondie — convoque RÉELLEMENT les quatre experts contradictoires
   * (draft du coordinateur → 4 critiques en parallèle → synthèse avec dissensus).
   *
   * Était `operatorProcedure` : les experts existaient donc sans qu'aucun
   * fondateur ne puisse les atteindre, et le coordinateur du chat les niait
   * quand on l'interrogeait. Ouverte au fondateur de SA marque
   * (`strategyScopedProcedure` = garde d'appartenance) sous condition
   * d'abonnement ET d'un budget dédié — **5 appels LLM** quand une position est
   * fournie (4 critiques + 1 synthèse), **6** sinon (+ 1 position rédigée par le
   * coordinateur). Le panneau cockpit fournit toujours la position : le chemin
   * fondateur coûte donc 5.
   *
   * Le rate-limit est SÉPARÉ de celui du chat : celui-ci autorise 20 messages à
   * 1 appel, il aurait autorisé 20 délibérations à 5 — une centaine d'appels sur
   * le budget de la marque.
   *
   * `strategyScopedProcedure` admet aussi les **collaborateurs délégués**
   * (ADR-0129) : un community manager peut donc déclencher une délibération sur
   * le budget de la marque. C'est cohérent avec le reste du cockpit (il opère
   * déjà le calendrier), et c'est ce budget qui en borne le coût.
   *
   * Reste une LECTURE : advisory pur, zéro écriture pilier, zéro Intent
   * (ADR-0180).
   */
  councilDeliberate: strategyScopedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        topic: z.string().min(3).max(2_000),
        draft: z.string().max(8_000).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { checkPaidTier } = await import("@/server/services/glory-tools/tier-gate");
      const gate = await checkPaidTier(ctx.session.user.id, undefined, input.strategyId);
      if (!gate.allowed) {
        return {
          status: "TIER_GATE_DENIED" as const,
          reason: gate.reason ?? "Abonnement payant requis pour l'analyse approfondie.",
          configureUrl: gate.configureUrl ?? "/pricing",
        };
      }
      // Disponibilité AVANT budget. Dans l'ordre inverse, fournisseurs à terre
      // = quatre clics et le fondateur était bloqué dix minutes sans qu'une
      // seule analyse ait été tentée — avec un message (« trop d'analyses en
      // peu de temps ») qui était faux.
      const { isTextLLMAvailable } = await import("@/server/services/llm-gateway");
      if (!isTextLLMAvailable()) {
        return {
          status: "UNAVAILABLE" as const,
          reason: "Aucun fournisseur d'intelligence disponible — réessayez plus tard.",
        };
      }
      const { consumeDeliberationBudget } = await import(
        "@/server/services/mestor/council/rate-limit"
      );
      if (!(await consumeDeliberationBudget(ctx.session.user.id))) {
        return {
          status: "RATE_LIMITED" as const,
          reason:
            "Trop d'analyses approfondies en peu de temps — chacune mobilise le conseil au complet. Réessayez dans quelques minutes.",
        };
      }
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
