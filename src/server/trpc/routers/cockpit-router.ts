import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { checkPaidTier } from "@/server/services/glory-tools/tier-gate";
import {
  shapeCommunityDashboard,
  latestFollowerPerPlatform,
  ACTIVE_SUPERFAN_THRESHOLD,
  EVANGELISTE_THRESHOLD,
  type CommunityDashboard,
} from "@/server/services/community-dashboard";
import type { ConnectorResult, OvertonRadarSignal } from "@/domain";
/* lafusee:governed-active — router read-only (queries dashboard/overtonSignal/getCommunityDashboard uniquement) ; checkPaidTier = garde tier utilitaire, aucune mutation à gouverner */

/** Founder community dashboard result : paid-tier-denial arm (FR32) over the DTO. */
export type CommunityDashboardResult =
  | { state: "TIER_GATE_DENIED"; configureUrl: string }
  | { state: "OK"; data: CommunityDashboard };

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
        return { state: "TIER_GATE_DENIED", configureUrl: gate.configureUrl ?? "/pricing" };
      }

      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: {
          id: true,
          userId: true,
          operatorId: true,
          businessContext: true,
          // ADR-0127 — polity de la marque pour la résolution d'axe.
          marketScale: true,
          countryCode: true,
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
          // ADR-0127 — l'axe est résolu pour la POLITY de la marque (échelle ×
          // pays), avec fallback honnête vers l'axe global du secteur. Le
          // niveau de résolution est surfacé — jamais masqué.
          const { getSectorAxisForPolity } = await import("@/server/services/sector-intelligence");
          const resolved = await getSectorAxisForPolity(sectorSlug, {
            marketScale: strategy.marketScale,
            countryCode: strategy.countryCode,
          });
          const brandTags = extractBrandTags(strategy.pillars[0]?.content);
          const data: OvertonRadarSignal = {
            sectorAxis: resolved
              ? { tags: resolved.axis.tags, confidence: resolved.axis.confidence, samples: resolved.axis.samples }
              : null,
            brandTags,
            vocabularyOverlap: signal.data.vocabularyOverlap,
            embeddingDelta: signal.data.embeddingDelta,
            claimImitations: signal.data.claimImitations,
            unpaidPress: signal.data.unpaidPress,
            mocked: signal.data._mocked,
            axisPolityResolution: resolved?.resolution ?? null,
          };
          return { state: "LIVE", data, observedAt: signal.observedAt };
        }
      }
    }),

  /**
   * P5 — founder community tracking dashboard. Composes the existing (siloed)
   * community data — superfans, devotion ladder, community health, follower
   * totals — into one unified read-only DTO. Paid-tier gated (FR32, mirrors
   * `overtonSignal`) + tenant-scoped. Each section is `null` when absent →
   * honest EmptyState (no fabricated data). Zero LLM.
   */
  getCommunityDashboard: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<CommunityDashboardResult> => {
      const gate = await checkPaidTier(ctx.session.user.id);
      if (!gate.allowed) {
        return { state: "TIER_GATE_DENIED", configureUrl: gate.configureUrl ?? "/pricing" };
      }

      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, userId: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      const isPrivileged = ctx.session.user.role === "ADMIN";
      if (!isPrivileged && strategy.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
      }

      const strategyId = input.strategyId;
      const periodDays = 30;
      const since = new Date();
      since.setDate(since.getDate() - periodDays);
      const prevStart = new Date();
      prevStart.setDate(prevStart.getDate() - periodDays * 2);

      const [total, active, evangelistes, newActive, previousActive, devotionRow, communityRow, followerSnaps] =
        await Promise.all([
          ctx.db.superfanProfile.count({ where: { strategyId } }),
          ctx.db.superfanProfile.count({ where: { strategyId, engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD } } }),
          ctx.db.superfanProfile.count({ where: { strategyId, engagementDepth: { gte: EVANGELISTE_THRESHOLD } } }),
          ctx.db.superfanProfile.count({
            where: { strategyId, engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD }, createdAt: { gte: since } },
          }),
          ctx.db.superfanProfile.count({
            where: { strategyId, engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD }, createdAt: { gte: prevStart, lt: since } },
          }),
          ctx.db.devotionSnapshot.findFirst({ where: { strategyId }, orderBy: { measuredAt: "desc" } }),
          ctx.db.communitySnapshot.findFirst({ where: { strategyId }, orderBy: { measuredAt: "desc" } }),
          ctx.db.followerSnapshot.findMany({
            where: { strategyId },
            orderBy: { capturedAt: "desc" },
            take: 200,
            select: { platform: true, followerCount: true, capturedAt: true },
          }),
        ]);

      const followerRows = latestFollowerPerPlatform(
        followerSnaps.map((s) => ({
          platform: String(s.platform),
          followerCount: s.followerCount,
          capturedAt: s.capturedAt,
        })),
      );

      const data = shapeCommunityDashboard({
        superfanCounts: { total, active, evangelistes },
        velocity: { newActive, previousActive, periodDays },
        devotionRow,
        communityRow,
        followerRows,
      });

      return { state: "OK", data };
    }),

  /**
   * Intégrations (vague E) — état HONNÊTE des sources de données connectées
   * à la marque du founder : derniers relevés sociaux (FollowerSnapshot par
   * plateforme + provenance), empreinte web collectée (pilier E), fraîcheur
   * du digest marché pays×secteur. Read-only, tenant-scoped, zéro LLM —
   * chaque source absente est dite absente, jamais simulée.
   */
  getConnectedSources: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: {
          id: true,
          userId: true,
          countryCode: true,
          businessContext: true,
          pillars: { where: { key: "e" }, select: { content: true } },
        },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      const isPrivileged = ctx.session.user.role === "ADMIN";
      if (!isPrivileged && strategy.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
      }

      // Dernier relevé social par plateforme (toutes provenances confondues).
      const snaps = await ctx.db.followerSnapshot.findMany({
        where: { strategyId: strategy.id },
        orderBy: { capturedAt: "desc" },
        take: 100,
        select: { platform: true, handle: true, followerCount: true, source: true, capturedAt: true },
      });
      const latestByPlatform = new Map<string, (typeof snaps)[number]>();
      for (const s of snaps) {
        if (!latestByPlatform.has(String(s.platform))) latestByPlatform.set(String(s.platform), s);
      }

      // Empreinte web du pilier E (webPresence écrit par l'enrichissement).
      const eContent = (strategy.pillars[0]?.content ?? {}) as Record<string, unknown>;
      const webPresence = (eContent.webPresence ?? null) as {
        site?: { url?: string; reachable?: boolean } | null;
        socials?: unknown[];
        press?: unknown[];
        footprintScore?: { total: number | null };
      } | null;

      // Fraîcheur du digest marché pays×secteur (feeds vague C).
      const sector = ((strategy.businessContext ?? {}) as Record<string, unknown>).sector;
      let marketFeedAt: Date | null = null;
      if (strategy.countryCode && typeof sector === "string" && sector.length >= 3) {
        const digest = await ctx.db.knowledgeEntry.findFirst({
          where: {
            entryType: "EXTERNAL_FEED_DIGEST",
            countryCode: strategy.countryCode,
            sector: { contains: sector.trim().toLowerCase().slice(0, 40), mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        marketFeedAt = digest?.createdAt ?? null;
      }

      return {
        socials: [...latestByPlatform.values()].map((s) => ({
          platform: String(s.platform),
          handle: s.handle,
          followerCount: s.followerCount,
          source: s.source,
          capturedAt: s.capturedAt.toISOString(),
        })),
        webPresence: webPresence
          ? {
              siteUrl: webPresence.site?.url ?? null,
              siteReachable: webPresence.site?.reachable ?? null,
              socialsDetected: Array.isArray(webPresence.socials) ? webPresence.socials.length : 0,
              pressMentions: Array.isArray(webPresence.press) ? webPresence.press.length : 0,
              footprintScore: webPresence.footprintScore?.total ?? null,
            }
          : null,
        marketFeed: {
          countryCode: strategy.countryCode,
          sector: typeof sector === "string" ? sector : null,
          lastDigestAt: marketFeedAt?.toISOString() ?? null,
        },
      };
    }),
});
