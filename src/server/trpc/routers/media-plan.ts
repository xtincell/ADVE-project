/**
 * Media Plan — tRPC router (ADR-0107, Phase 24).
 *
 * Plan média ATL/BTL/TTL + PCA déterministe. Lectures = queries tenant-scopées ;
 * mutations gouvernées (`emitIntent` via governedProcedure). Les CPM viennent des
 * benchmarks seedés (`MarketCostSnapshot`) ; le PCA est calculé sans LLM.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessCampaign } from "@/server/services/operator-isolation";
import * as mp from "@/server/services/media-plan";
import * as perf from "@/server/services/media-perf";
/* lafusee:governed-active */

type Ctx = { session: { user: { id: string; role: string; operatorId?: string | null } } };

async function assertCampaignAccess(ctx: Ctx, campaignId: string) {
  const ok = await canAccessCampaign(campaignId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role ?? "USER",
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne." });
}

export const mediaPlanRouter = createTRPCRouter({
  /** Liste les plans média d'une campagne (avec lignes). */
  listByCampaign: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCampaignAccess(ctx, input.campaignId);
      return mp.listMediaPlans(input.campaignId);
    }),

  /** PCA déterministe d'un plan (prévu vs réalisé, makegood). */
  pca: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.mediaPlan.findUniqueOrThrow({ where: { id: input.planId }, select: { campaignId: true } });
      await assertCampaignAccess(ctx, plan.campaignId);
      return mp.getMediaPlanPca(input.planId);
    }),

  /** Crée un plan média (status PLANNED). */
  create: governedProcedure({
    kind: "LEGACY_MEDIA_PLAN_CREATE",
    inputSchema: z.object({
      campaignId: z.string(),
      name: z.string().min(1).max(200),
      objective: z.string().max(2000).optional(),
      countryCode: z.string().length(2).optional(),
      currency: z.string().max(8).optional(),
      flightStart: z.date().optional(),
      flightEnd: z.date().optional(),
    }),
    caller: "media-plan:create",
  }).mutation(async ({ ctx, input }) => {
    await assertCampaignAccess(ctx, input.campaignId);
    return mp.createMediaPlan(input);
  }),

  /** Ajoute une ligne média (prévu) à un plan. */
  addLine: governedProcedure({
    kind: "LEGACY_MEDIA_PLAN_ADD_LINE",
    inputSchema: z.object({
      planId: z.string(),
      channel: z.string().min(1).max(60),
      category: z.enum(["ATL", "BTL", "TTL"]).optional(),
      vendor: z.string().max(120).optional(),
      plannedImpressions: z.number().nonnegative().optional(),
      plannedGrp: z.number().nonnegative().optional(),
      plannedReachPct: z.number().min(0).max(100).optional(),
      plannedFrequency: z.number().nonnegative().optional(),
      plannedSpend: z.number().nonnegative().optional(),
      cpm: z.number().nonnegative().optional(),
      flightStart: z.date().optional(),
      flightEnd: z.date().optional(),
    }),
    caller: "media-plan:addLine",
  }).mutation(async ({ ctx, input }) => {
    const plan = await ctx.db.mediaPlan.findUniqueOrThrow({ where: { id: input.planId }, select: { campaignId: true } });
    await assertCampaignAccess(ctx, plan.campaignId);
    return mp.addMediaPlanLine(input);
  }),

  /** Enregistre le réalisé d'une ligne (post-buy → PCA). */
  recordActuals: governedProcedure({
    kind: "LEGACY_MEDIA_PLAN_RECORD_ACTUALS",
    inputSchema: z.object({
      lineId: z.string(),
      actualImpressions: z.number().nonnegative().optional(),
      actualSpend: z.number().nonnegative().optional(),
    }),
    caller: "media-plan:recordActuals",
  }).mutation(async ({ ctx, input }) => {
    const line = await ctx.db.mediaPlanLine.findUniqueOrThrow({ where: { id: input.lineId }, select: { plan: { select: { campaignId: true } } } });
    await assertCampaignAccess(ctx, line.plan.campaignId);
    return mp.recordLineActuals(input);
  }),

  // ── Ingestion de performance (ADR-0115) ────────────────────────────────────

  /** État de l'ingestion LIVE credential-gated (ConnectorResult honnête). */
  perfLiveStatus: protectedProcedure
    .input(z.object({ campaignId: z.string(), platform: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCampaignAccess(ctx, input.campaignId);
      const operatorId =
        ((ctx.session.user as unknown as Record<string, unknown>).operatorId as string | undefined) ?? ctx.session.user.id;
      return perf.ingestLivePerformance({
        operatorId,
        campaignId: input.campaignId,
        platform: input.platform,
      });
    }),

  /** Ingestion MANUELLE de perf réelle (POS / export plateforme) → normalisée. */
  ingestManualPerf: governedProcedure({
    kind: "LEGACY_MEDIA_PERF_INGEST_MANUAL",
    inputSchema: z.object({
      campaignId: z.string(),
      platform: z.string().min(1).max(40),
      raw: z.object({
        impressions: z.number().nonnegative().optional(),
        clicks: z.number().nonnegative().optional(),
        conversions: z.number().nonnegative().optional(),
        reach: z.number().nonnegative().optional(),
        views: z.number().nonnegative().optional(),
        engagements: z.number().nonnegative().optional(),
        spend: z.number().nonnegative().optional(),
        revenue: z.number().nonnegative().optional(),
      }),
      budget: z.number().nonnegative().optional(),
      currency: z.string().max(8).optional(),
    }),
    caller: "media-perf:ingestManual",
  }).mutation(async ({ ctx, input }) => {
    await assertCampaignAccess(ctx, input.campaignId);
    return perf.ingestManualPerformance(input);
  }),
});
