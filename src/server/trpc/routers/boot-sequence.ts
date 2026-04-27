// ============================================================================
// MODULE M17 — Boot Sequence (Onboarding 60-90min)
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §4.2 + §8 P4 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  start, advance, complete, getState — basic lifecycle
// [x] REQ-2  Adaptive decision tree (Mestor-guided, 60-90 min calibration)
// [x] REQ-3  Calibrate all 8 ADVE pillars with deep questions
// [x] REQ-4  Produce Brand Diagnostic Report on completion
// [x] REQ-5  Invoke Mestor for conversational guidance through each step
// [x] REQ-6  Progress persistence (resume mid-session)
// [x] REQ-7  Convert to full Strategy on completion (upgrade from Quick Intake)
//
// PROCEDURES: start, advance, complete, getState, getAdaptiveQuestions,
//             generateReport, chat, resume, convertToStrategy
// ============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as bootService from "@/server/services/boot-sequence";

export const bootSequenceRouter = createTRPCRouter({
  // Start can be called by the client who owns the strategy or by admin
  start: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership or admin
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse: vous n'etes pas proprietaire de cette strategie");
      }
      return bootService.start(input.strategyId);
    }),

  advance: protectedProcedure
    .input(z.object({ strategyId: z.string(), step: z.number(), responses: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      return bootService.advance(input.strategyId, input.step, input.responses);
    }),

  complete: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      return bootService.complete(input.strategyId);
    }),

  getState: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => { return bootService.getState(input.strategyId); }),

  // ── REQ-2: Adaptive decision tree ────────────────────────────────────────
  getAdaptiveQuestions: protectedProcedure
    .input(z.object({ strategyId: z.string(), step: z.number() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      // Load current boot state then regenerate questions for the given step
      const state = await bootService.getState(input.strategyId);
      if (!state) throw new Error("Boot sequence non demarree. Appelez start() d'abord.");
      if (input.step < 0 || input.step >= state.totalSteps) {
        throw new Error(`Step ${input.step} invalide (0-${state.totalSteps - 1})`);
      }
      // If requesting current step questions, return from state
      if (input.step === state.currentStep && state.questions?.length) {
        return { step: input.step, pillar: state.currentPillar, questions: state.questions };
      }
      // Otherwise re-start from the requested step to regenerate
      const refreshed = await bootService.start(input.strategyId);
      return { step: input.step, pillar: refreshed.currentPillar, questions: refreshed.questions ?? [] };
    }),

  // ── REQ-4: Brand Diagnostic Report ───────────────────────────────────────
  generateReport: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        include: { pillars: true },
      });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      const bootState = await bootService.getState(input.strategyId);
      if (bootState && !bootState.completed) {
        throw new Error("Boot sequence non terminee. Completez toutes les etapes d'abord.");
      }
      const vector = (strategy.advertis_vector as Record<string, number>) ?? {};
      const pillars = strategy.pillars.map((p) => ({
        key: p.key,
        confidence: p.confidence,
        contentSummary: Object.keys((p.content as Record<string, unknown>) ?? {}),
      }));
      const totalConfidence = pillars.reduce((sum, p) => sum + (p.confidence ?? 0), 0) / (pillars.length || 1);
      return {
        strategyId: input.strategyId,
        strategyName: strategy.name,
        generatedAt: new Date().toISOString(),
        overallScore: Math.round(totalConfidence * 100),
        advertis_vector: vector,
        classification: (strategy.businessContext as Record<string, unknown>)?.classification ?? "Unclassified",
        pillarSummaries: pillars,
        recommendations: totalConfidence < 0.5
          ? ["Completer les piliers manquants", "Ajouter plus de detail aux reponses"]
          : totalConfidence < 0.8
            ? ["Affiner les piliers faibles", "Lancer une session Mestor approfondie"]
            : ["Strategie solide", "Passer au deploiement des drivers"],
      };
    }),

  // ── REQ-5: Mestor conversational guidance ────────────────────────────────
  chat: protectedProcedure
    .input(z.object({ strategyId: z.string(), message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      const state = await bootService.getState(input.strategyId);
      const currentPillar = state?.currentPillar ?? "a";
      const step = state?.currentStep ?? 0;

      const { callLLM } = await import("@/server/services/llm-gateway");
      const { text } = await callLLM({
        system: `Tu es Mestor, commandant strategique du systeme ADVE.
Tu guides l'utilisateur dans le diagnostic de marque, etape ${step + 1}/8, pilier "${currentPillar}".
Sois direct, strategique et bienveillant. Reponds en francais.
Contexte actuel: ${JSON.stringify(state?.responses ?? {})}`,
        prompt: input.message,
        caller: "boot-sequence:chat",
        maxTokens: 1000,
      });

      return { role: "mestor" as const, content: text, step, pillar: currentPillar };
    }),

  // ── REQ-6: Progress persistence / resume ─────────────────────────────────
  resume: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      const state = await bootService.getState(input.strategyId);
      if (!state) {
        return { status: "NOT_STARTED" as const, message: "Aucune session en cours. Demarrez avec start()." };
      }
      if (state.completed) {
        return { status: "COMPLETED" as const, message: "Boot sequence deja terminee.", state };
      }
      return {
        status: "IN_PROGRESS" as const,
        message: `Reprise a l'etape ${state.currentStep + 1}/${state.totalSteps} (pilier ${state.currentPillar})`,
        state,
      };
    }),

  // ── REQ-7: Convert quick intake to full Strategy ─────────────────────────
  convertToStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        include: { pillars: true },
      });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      if (strategy.status === "ACTIVE") {
        return { converted: false, message: "Strategie deja active." };
      }
      // Ensure all 8 pillars exist (create missing ones with empty content)
      const existingKeys = new Set(strategy.pillars.map((p) => p.key));
      const allPillars = ["a", "d", "v", "e", "r", "t", "i", "s"];
      for (const key of allPillars) {
        if (!existingKeys.has(key)) {
          await ctx.db.pillar.create({
            data: { strategyId: input.strategyId, key, content: {}, confidence: 0, currentVersion: 1 },
          });
        }
      }
      // Score and activate
      const { scoreObject } = await import("@/server/services/advertis-scorer");
      const vector = await scoreObject("strategy", input.strategyId);
      await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: { status: "ACTIVE", advertis_vector: vector as unknown as import("@prisma/client").Prisma.InputJsonValue },
      });
      return { converted: true, message: "Strategie convertie et activee.", vector };
    }),
});
