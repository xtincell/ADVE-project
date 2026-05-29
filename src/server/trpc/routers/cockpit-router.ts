import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { checkPaidTier } from "@/server/services/glory-tools/tier-gate";
import type { ConnectorResult, OvertonRadarSignal } from "@/domain";

/**
 * Founder Overton-signal result : a paid-tier-denial arm (FR32) layered over the
 * canonical `ConnectorResult<OvertonRadarSignal>`. The radar prop type stays pure
 * `ConnectorResult<…>` — `<OvertonPanel>` strips the `TIER_GATE_DENIED` arm and
 * renders the upgrade CTA before handing the connector result to the radar.
 */
export type OvertonSignalResult =
  | { state: "TIER_GATE_DENIED"; configureUrl: string }
  | ConnectorResult<OvertonRadarSignal>;

/**
 * Read the canonical sector slug for a Strategy from `businessContext.sector`
 * (mirrors `campaign-tracker/signals-culture.extractSectorSlugFromStrategy`).
 * Returns null → caller surfaces an honest INSUFFICIENT_DATA branch rather
 * than defaulting to a sector (no-magic-fallback, ADR-0046).
 */
function extractSectorSlug(businessContext: unknown): string | null {
  if (businessContext && typeof businessContext === "object" && !Array.isArray(businessContext)) {
    const ctx = businessContext as Record<string, unknown>;
    if (typeof ctx.sector === "string" && ctx.sector.length > 0) return ctx.sector;
  }
  return null;
}

/**
 * Extract a brand orientation vector (tag → strength in [0,1]) from pillar D
 * (positioning) content. Tries an `axe` / `tags` object. Absent → `{}` (the
 * radar renders a centred brand polygon — honest "no positioning vector yet",
 * never a fabricated orientation).
 */
function extractBrandTags(pillarDContent: unknown): Record<string, number> {
  if (!pillarDContent || typeof pillarDContent !== "object" || Array.isArray(pillarDContent)) return {};
  const content = pillarDContent as Record<string, unknown>;
  const source = (content.axe ?? content.tags) as unknown;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const tags: Record<string, number> = {};
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    if (typeof v === "number") tags[k] = Math.max(0, Math.min(1, v));
  }
  return tags;
}

export const cockpitRouter = createTRPCRouter({
  /** Dashboard summary for the client portal */
  dashboard: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        include: {
          pillars: { select: { key: true, content: true, confidence: true, validationStatus: true } },
          missions: { where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } }, select: { id: true, status: true } },
          campaigns: { where: { status: { not: "ARCHIVED" } }, select: { id: true, status: true } },
        },
      });
      const vector = strategy.advertis_vector as Record<string, number> | null;

      // Extract RTIS key metrics from pillar content for dashboard visibility
      // Content is loaded server-side only for metric extraction, not sent to client
      const pillarContents: Record<string, Record<string, unknown>> = {};
      for (const p of strategy.pillars) {
        const content = (p as unknown as { content: Record<string, unknown> | null }).content;
        if (content) pillarContents[p.key] = content;
      }
      const rContent = pillarContents.r ?? {};
      const tContent = pillarContents.t ?? {};
      const iContent = pillarContents.i ?? {};
      const sContent = pillarContents.s ?? {};

      return {
        name: strategy.name,
        composite: vector?.composite ?? 0,
        pillars: strategy.pillars.map((p) => ({ key: p.key, confidence: p.confidence, validationStatus: p.validationStatus })),
        activeMissions: strategy.missions.filter((m) => m.status === "IN_PROGRESS").length,
        completedMissions: strategy.missions.filter((m) => m.status === "COMPLETED").length,
        activeCampaigns: strategy.campaigns.length,

        // RTIS visibility — key metrics from each derived pillar
        rtis: {
          riskScore: rContent.riskScore ?? null,
          brandMarketFitScore: tContent.brandMarketFitScore ?? null,
          totalActions: iContent.totalActions ?? null,
          globalBudget: (iContent.globalBudget ?? sContent.globalBudget) ?? null,
          syntheseExecutive: sContent.syntheseExecutive ?? null,
          roadmapPhases: Array.isArray(sContent.roadmap) ? (sContent.roadmap as unknown[]).length : 0,
          sprint90Count: Array.isArray(sContent.sprint90Days) ? (sContent.sprint90Days as unknown[]).length : 0,
        },
      };
    }),

  /**
   * Phase 23 Epic 7 Story 7.4 — founder's brand Overton signal as a typed
   * `ConnectorResult<OvertonRadarSignal>`, consumed by `<OvertonPanel>` →
   * `<OvertonRadar instance="full" />`.
   *
   * Read-only + tenant-scoped (FR32) : the strategy must belong to the calling
   * founder (or an ADMIN). `protectedProcedure` — NOT `operatorProcedure`, which
   * is reserved for UPgraders operators/admins and would reject founders.
   *
   * Composition (the single founder-side Tarsis seam, P22-1 exhaustive) :
   *   1. Resolve sector slug from `businessContext.sector` ; absent → DEGRADED
   *      INSUFFICIENT_DATA (honest, no default sector).
   *   2. Resolve operator for credential lookup ; absent → DEFERRED (cannot
   *      check connector credentials → ship-without-keys honest state).
   *   3. `fetchSectorSignal(operatorId, sectorSlug)` → switch on the 3 states.
   *      LIVE → compose the view-model (real sector axis + pillar-D brand tags +
   *      Tarsis evidence). DEFERRED / DEGRADED → pass through so the radar
   *      renders its honest state (Story 7.3). Never fabricate a LIVE.
   */
  overtonSignal: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<OvertonSignalResult> => {
      // Paid-tier gate (FR32) — mirrors `campaignTracker.getFounderAttributionLineage`.
      const gate = await checkPaidTier(ctx.session.user.id);
      if (!gate.allowed) {
        return { state: "TIER_GATE_DENIED", configureUrl: gate.configureUrl ?? "/cockpit/subscription" };
      }

      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: {
          id: true,
          userId: true,
          operatorId: true,
          businessContext: true,
          pillars: { where: { key: "d" }, select: { content: true } },
        },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });

      // Tenant scope (FR32) — founder owns the strategy, or an operator/admin.
      const isPrivileged = ctx.session.user.role === "ADMIN";
      if (!isPrivileged && strategy.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
      }

      const sectorSlug = extractSectorSlug(strategy.businessContext);
      if (!sectorSlug) {
        return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
      }
      if (!strategy.operatorId) {
        // No operator → no credentials reachable → ship-without-keys honest state.
        return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "tarsis-monitoring" };
      }

      const { fetchSectorSignal } = await import("@/server/services/seshat/tarsis/connector");
      const signal = await fetchSectorSignal(strategy.operatorId, sectorSlug);

      // P22-1 invariant 1 : exhaustive — no default/else.
      switch (signal.state) {
        case "DEFERRED_AWAITING_CREDENTIALS":
          return signal;
        case "DEGRADED":
          return signal;
        case "LIVE": {
          const { getSectorAxis } = await import("@/server/services/sector-intelligence");
          const axis = await getSectorAxis(sectorSlug);
          const brandTags = extractBrandTags(strategy.pillars[0]?.content);
          const data: OvertonRadarSignal = {
            sectorAxis: axis ? { tags: axis.tags, confidence: axis.confidence, samples: axis.samples } : null,
            brandTags,
            vocabularyOverlap: signal.data.vocabularyOverlap,
            embeddingDelta: signal.data.embeddingDelta,
            claimImitations: signal.data.claimImitations,
            unpaidPress: signal.data.unpaidPress,
            mocked: signal.data._mocked,
          };
          return { state: "LIVE", data, observedAt: signal.observedAt };
        }
      }
    }),
});
