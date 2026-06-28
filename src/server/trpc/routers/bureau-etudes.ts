/**
 * Bureau d'étude — tRPC router (ADR-0110, Phase 24).
 *
 * Time-spine `ResearchWave` + comparaison inter-vagues déterministe + catalogue
 * de méthodes seedé. Lectures tenant-scopées par la stratégie de l'étude ;
 * mutations gouvernées (`emitIntent`). Zéro LLM.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import * as be from "@/server/services/bureau-etudes";
/* lafusee:governed-active */

interface AccessCtx {
  session: { user: { id: string; role: string; operatorId?: string | null } };
  db: { marketStudy: { findUniqueOrThrow: (args: { where: { id: string }; select: { strategyId: true } }) => Promise<{ strategyId: string }> } };
}

async function assertStudyAccess(ctx: AccessCtx, studyId: string) {
  const study = await ctx.db.marketStudy.findUniqueOrThrow({ where: { id: studyId }, select: { strategyId: true } });
  const ok = await canAccessStrategy(study.strategyId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role ?? "USER",
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette étude." });
}

export const bureauEtudesRouter = createTRPCRouter({
  /** Catalogue de méthodes seedé (familles, normes n→MoE, T2B). */
  methodologies: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.methodologyReference.findMany({ orderBy: [{ family: "asc" }, { label: "asc" }] });
  }),

  /** Vagues d'une étude, annotées de leur marge d'erreur déterministe. */
  waves: protectedProcedure
    .input(z.object({ studyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStudyAccess(ctx, input.studyId);
      return be.listWaves(input.studyId);
    }),

  /** Significativité inter-vagues (z-test deux proportions). */
  compareWaves: protectedProcedure
    .input(z.object({
      studyId: z.string(),
      waveIdA: z.string(),
      waveIdB: z.string(),
      p1: z.number().min(0).max(1),
      p2: z.number().min(0).max(1),
      confidenceLevel: z.number().min(0.5).max(0.999).optional(),
    }))
    .query(async ({ ctx, input }) => {
      await assertStudyAccess(ctx, input.studyId);
      return be.compareWaves(input);
    }),

  /** Crée une vague d'étude (time-spine). */
  createWave: governedProcedure({
    kind: "LEGACY_RESEARCH_WAVE_CREATE",
    inputSchema: z.object({
      studyId: z.string(),
      waveLabel: z.string().min(1).max(60),
      periodLabel: z.string().min(1).max(60),
      fieldStart: z.date().optional(),
      fieldEnd: z.date().optional(),
      cadence: z.enum(["ONE_SHOT", "MONTHLY", "QUARTERLY", "ROLLING"]).optional(),
      targetN: z.number().int().positive().optional(),
      isRolling: z.boolean().optional(),
    }),
    caller: "bureau-etudes:createWave",
  }).mutation(async ({ ctx, input }) => {
    await assertStudyAccess(ctx, input.studyId);
    return be.createResearchWave(input);
  }),

  /** Enregistre l'échantillon atteint d'une vague. */
  recordAchieved: governedProcedure({
    kind: "LEGACY_RESEARCH_WAVE_RECORD",
    inputSchema: z.object({ waveId: z.string(), achievedN: z.number().int().nonnegative() }),
    caller: "bureau-etudes:recordAchieved",
  }).mutation(async ({ ctx, input }) => {
    const wave = await ctx.db.researchWave.findUniqueOrThrow({ where: { id: input.waveId }, select: { studyId: true } });
    await assertStudyAccess(ctx, wave.studyId);
    return be.recordWaveAchieved(input);
  }),
});
