import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { checkPaidTier } from "@/server/services/glory-tools/tier-gate";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
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
        // ADR-0129 - operateur de la marque ou collaborateur delegue ACTIVE.
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
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
        // ADR-0129 - operateur de la marque ou collaborateur delegue ACTIVE.
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
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
        // ADR-0129 - operateur de la marque ou collaborateur delegue ACTIVE.
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
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

  /**
   * ADR-0128 — Veille marché du founder (à la Feedly). Lit le DERNIER digest
   * `EXTERNAL_FEED_DIGEST` du couple (pays × secteur) de la marque et en
   * expose les articles réels + signaux. Read-only, tenant-scoped, zéro LLM.
   * Pas de digest → `articles: []` + `lastDigestAt: null` (EmptyState honnête,
   * jamais de flux fabriqué).
   */
  getMarketFeed: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, userId: true, countryCode: true, businessContext: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      const isPrivileged = ctx.session.user.role === "ADMIN";
      if (!isPrivileged && strategy.userId !== ctx.session.user.id) {
        // ADR-0129 - operateur de la marque ou collaborateur delegue ACTIVE.
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
      }

      const sector = extractSectorSlug(strategy.businessContext);
      const empty = {
        countryCode: strategy.countryCode,
        sector,
        lastDigestAt: null as string | null,
        articles: [] as Array<{ title: string; link: string; source: string | null; publishedAt: string | null }>,
        themes: [] as string[],
        configured: Boolean(strategy.countryCode && sector),
      };
      if (!strategy.countryCode || !sector || sector.length < 3) return empty;

      const digest = await ctx.db.knowledgeEntry.findFirst({
        where: {
          entryType: "EXTERNAL_FEED_DIGEST",
          countryCode: strategy.countryCode,
          sector: { contains: sector.trim().toLowerCase().slice(0, 40), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, data: true },
      });
      if (!digest) return empty;

      const data = (digest.data ?? {}) as {
        items?: Array<{ title?: string; link?: string; source?: string; publishedAt?: string }>;
        macroSignals?: Array<{ trend?: string }>;
      };
      return {
        ...empty,
        lastDigestAt: digest.createdAt.toISOString(),
        articles: (Array.isArray(data.items) ? data.items : [])
          .filter((it) => typeof it.title === "string" && it.title.length > 0)
          .slice(0, 12)
          .map((it) => ({
            title: it.title as string,
            link: typeof it.link === "string" ? it.link : "",
            source: typeof it.source === "string" ? it.source : null,
            publishedAt: typeof it.publishedAt === "string" ? it.publishedAt : null,
          })),
        themes: (Array.isArray(data.macroSignals) ? data.macroSignals : [])
          .map((s) => (typeof s.trend === "string" ? s.trend : ""))
          .filter((t) => t.length > 0)
          .slice(0, 5),
      };
    }),

  /**
   * ADR-0128 — Identité visuelle de la marque pour le dashboard : logo actif
   * (BrandAsset kind LOGO_FINAL, fallback LOGO_IDEA), inventaire des actifs
   * d'identité (typographies, palettes) et total du coffre. Chaque absence
   * est dite absente — le dashboard affiche alors le CTA d'upload, jamais un
   * placeholder déguisé en logo.
   */
  getBrandIdentity: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, userId: true, name: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      const isPrivileged = ctx.session.user.role === "ADMIN";
      if (!isPrivileged && strategy.userId !== ctx.session.user.id) {
        // ADR-0129 - operateur de la marque ou collaborateur delegue ACTIVE.
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
      }

      const [logos, typographyCount, chromatics, vaultTotal] = await Promise.all([
        ctx.db.brandAsset.findMany({
          where: {
            strategyId: strategy.id,
            kind: { in: ["LOGO_FINAL", "LOGO_IDEA"] },
            fileUrl: { not: null },
            state: { notIn: ["ARCHIVED", "REJECTED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, kind: true, name: true, fileUrl: true, state: true },
        }),
        ctx.db.brandAsset.count({
          where: { strategyId: strategy.id, kind: "TYPOGRAPHY_SYSTEM", state: { notIn: ["ARCHIVED", "REJECTED"] } },
        }),
        ctx.db.brandAsset.findMany({
          where: { strategyId: strategy.id, kind: "CHROMATIC_STRATEGY", state: { notIn: ["ARCHIVED", "REJECTED"] } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { content: true, state: true },
        }),
        ctx.db.brandAsset.count({ where: { strategyId: strategy.id } }),
      ]);

      // Logo actif : LOGO_FINAL ACTIVE > LOGO_FINAL récent > LOGO_IDEA récent.
      const finals = logos.filter((l) => l.kind === "LOGO_FINAL");
      const logo =
        finals.find((l) => l.state === "ACTIVE") ?? finals[0] ?? logos[0] ?? null;

      // ADR-0130 — palette de la marque (actif CHROMATIC_STRATEGY structuré).
      // Hex STRICTEMENT validés avant de sortir (ils finissent en CSS custom
      // properties côté client — jamais de chaîne libre injectée).
      const HEX = /^#[0-9a-fA-F]{6}$/;
      const chromaticContent = (chromatics.find((c) => c.state === "ACTIVE") ?? chromatics[0])?.content as
        | { accent?: unknown; primary?: unknown }
        | null
        | undefined;
      const accent = typeof chromaticContent?.accent === "string" && HEX.test(chromaticContent.accent) ? chromaticContent.accent : null;
      const primary = typeof chromaticContent?.primary === "string" && HEX.test(chromaticContent.primary) ? chromaticContent.primary : null;

      return {
        brandName: strategy.name,
        logo: logo ? { url: logo.fileUrl as string, name: logo.name, state: String(logo.state) } : null,
        // null = pas de palette déclarée → le cockpit garde le thème par défaut.
        palette: accent || primary ? { accent: accent ?? primary, primary: primary ?? accent } : null,
        assetCounts: {
          logos: finals.length,
          typographies: typographyCount,
          palettes: chromatics.length,
          total: vaultTotal,
        },
      };
    }),

  /**
   * Vague 4 (mandat « plus vivant ») — vitrine visuelle du dashboard :
   * campagne courante (la plus avancée hors ARCHIVED/CANCELLED) + visuels
   * récents réels (AssetVersion images de la forge, actifs du coffre avec
   * fichier — hors identité déjà affichée). Aucun visuel inventé : pas de
   * campagne → null, pas de visuel → tableau vide (EmptyState honnête).
   */
  getCampaignShowcase: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, userId: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      if (ctx.session.user.role !== "ADMIN" && strategy.userId !== ctx.session.user.id) {
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
      }

      const [campaigns, versions, vaultVisuals] = await Promise.all([
        ctx.db.campaign.findMany({
          where: { strategyId: strategy.id, state: { notIn: ["ARCHIVED", "CANCELLED"] } },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          take: 5,
          select: {
            id: true, name: true, state: true, healthSignal: true,
            startDate: true, endDate: true, budget: true, budgetCurrency: true,
          },
        }),
        ctx.db.assetVersion.findMany({
          where: { strategyId: strategy.id, kind: "image" },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, url: true, cdnUrl: true, createdAt: true, metadata: true },
        }),
        ctx.db.brandAsset.findMany({
          where: {
            strategyId: strategy.id,
            fileUrl: { not: null },
            kind: { notIn: ["LOGO_FINAL", "LOGO_IDEA", "TYPOGRAPHY_SYSTEM", "CHROMATIC_STRATEGY"] },
            state: { notIn: ["ARCHIVED", "REJECTED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, name: true, kind: true, fileUrl: true, createdAt: true },
        }),
      ]);

      // La campagne « du moment » : la plus avancée dans le pipeline.
      const STATE_RANK: Record<string, number> = {
        LIVE: 10, READY_TO_LAUNCH: 9, APPROVAL: 8, PRODUCTION: 7, PRE_PRODUCTION: 6,
        CREATIVE_DEV: 5, PLANNING: 4, BRIEF_VALIDATED: 3, BRIEF_DRAFT: 2, POST_CAMPAIGN: 1,
      };
      const campaign = [...campaigns].sort(
        (a, b) => (STATE_RANK[String(b.state)] ?? 0) - (STATE_RANK[String(a.state)] ?? 0),
      )[0] ?? null;

      // Visuels : URLs http(s) uniquement (elles partent dans des <img>).
      const httpOnly = (u: string | null | undefined): u is string =>
        typeof u === "string" && /^https?:\/\//.test(u);
      const seen = new Set<string>();
      const visuals: Array<{ url: string; label: string; source: "forge" | "vault"; at: string }> = [];
      for (const v of versions) {
        const url = v.cdnUrl ?? v.url;
        if (!httpOnly(url) || seen.has(url)) continue;
        seen.add(url);
        const meta = v.metadata as Record<string, unknown> | null;
        visuals.push({
          url,
          label: (typeof meta?.label === "string" && meta.label) || "Création studio",
          source: "forge",
          at: v.createdAt.toISOString(),
        });
      }
      for (const a of vaultVisuals) {
        if (!httpOnly(a.fileUrl) || seen.has(a.fileUrl)) continue;
        seen.add(a.fileUrl);
        visuals.push({ url: a.fileUrl, label: a.name, source: "vault", at: a.createdAt.toISOString() });
      }
      visuals.sort((x, y) => y.at.localeCompare(x.at));

      return {
        campaign: campaign
          ? {
              id: campaign.id,
              name: campaign.name,
              state: String(campaign.state),
              healthSignal: campaign.healthSignal,
              startDate: campaign.startDate?.toISOString() ?? null,
              endDate: campaign.endDate?.toISOString() ?? null,
            }
          : null,
        activeCount: campaigns.filter((c) => String(c.state) === "LIVE").length,
        visuals: visuals.slice(0, 10),
      };
    }),

  /**
   * Dashboard OPÉRATIONNEL (« ce qui se passe aujourd'hui ») — agrégat réel :
   * communauté (FollowerSnapshot : total, Δ, répartition, historique),
   * actions du calendrier éditorial (à venir / récentes), missions ouvertes.
   * Ce qui n'a pas de source branchée (portée/engagement par post, ventes)
   * n'est PAS retourné — les cartes correspondantes affichent leur état
   * honnête côté client (connexion des réseaux requise / canal non branché).
   */
  getOperationsSnapshot: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, userId: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      if (ctx.session.user.role !== "ADMIN" && strategy.userId !== ctx.session.user.id) {
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (!(await canAccessStrategy(input.strategyId, opCtx))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
        }
      }

      const now = new Date();
      const in14d = new Date(now.getTime() + 14 * 86_400_000);
      const past90d = new Date(now.getTime() - 90 * 86_400_000);
      const past7d = new Date(now.getTime() - 7 * 86_400_000);

      const [snapshots, upcomingActions, recentActions, openMissions, topPosts] = await Promise.all([
        ctx.db.followerSnapshot.findMany({
          where: { strategyId: strategy.id, capturedAt: { gte: past90d } },
          orderBy: { capturedAt: "asc" },
          select: { platform: true, handle: true, followerCount: true, capturedAt: true, source: true },
        }),
        ctx.db.brandAction.findMany({
          where: {
            strategyId: strategy.id,
            status: { in: ["ACCEPTED", "SCHEDULED"] },
            timingStart: { gte: now, lte: in14d },
          },
          orderBy: { timingStart: "asc" },
          take: 6,
          select: { id: true, title: true, status: true, touchpoint: true, timingStart: true },
        }),
        ctx.db.brandAction.findMany({
          where: {
            strategyId: strategy.id,
            status: "EXECUTED",
            timingEnd: { gte: past7d },
          },
          orderBy: { timingEnd: "desc" },
          take: 6,
          select: { id: true, title: true, status: true, touchpoint: true, timingEnd: true },
        }),
        ctx.db.mission.count({
          where: { strategyId: strategy.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
        // P1 — publications réelles collectées (SocialPost, sync connectors).
        ctx.db.socialPost.findMany({
          where: { strategyId: strategy.id },
          orderBy: [{ publishedAt: "desc" }],
          take: 20,
          select: {
            id: true, content: true, publishedAt: true,
            likes: true, comments: true, shares: true, reach: true,
            connection: { select: { platform: true } },
          },
        }),
      ]);

      // Dernier + précédent relevé par plateforme → total, Δ et répartition.
      const byPlatform = new Map<string, { latest: number; previous: number | null; handle: string; at: string; source: string }>();
      for (const s of snapshots) {
        const key = String(s.platform);
        const cur = byPlatform.get(key);
        byPlatform.set(key, {
          latest: s.followerCount,
          previous: cur ? cur.latest : null,
          handle: s.handle,
          at: s.capturedAt.toISOString(),
          source: s.source,
        });
      }
      const platforms = [...byPlatform.entries()].map(([platform, v]) => ({
        platform,
        handle: v.handle,
        followers: v.latest,
        delta: v.previous != null ? v.latest - v.previous : null,
        capturedAt: v.at,
        source: v.source,
      })).sort((a, b) => b.followers - a.followers);
      const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
      const totalDelta = platforms.some((p) => p.delta != null)
        ? platforms.reduce((sum, p) => sum + (p.delta ?? 0), 0)
        : null;

      // Série pour la courbe (points datés par plateforme — le client trace).
      const series = snapshots.map((s) => ({
        platform: String(s.platform),
        followers: s.followerCount,
        at: s.capturedAt.toISOString(),
      }));

      // Top posts par engagement (réels — vide tant que rien n'est collecté).
      const posts = topPosts.map((p) => ({
        id: p.id,
        platform: String(p.connection.platform),
        content: p.content ? p.content.slice(0, 120) : null,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        likes: p.likes, comments: p.comments, shares: p.shares, reach: p.reach,
        engagement: p.likes + p.comments + p.shares,
      }));
      const totalReach = posts.reduce((n, p) => n + p.reach, 0);
      const totalEngagement = posts.reduce((n, p) => n + p.engagement, 0);

      return {
        posts: {
          top: [...posts].sort((a, b) => b.engagement - a.engagement).slice(0, 5),
          count: posts.length,
          totalReach,
          totalEngagement,
        },
        community: {
          totalFollowers,
          totalDelta,
          platforms,
          series,
          // 1 seul relevé par plateforme → la courbe n'a pas d'histoire à
          // montrer ; le client affiche « l'historique se construit ».
          hasHistory: series.length > platforms.length,
        },
        calendar: {
          upcoming: upcomingActions.map((a) => ({
            id: a.id, title: a.title, status: a.status, touchpoint: a.touchpoint,
            at: a.timingStart?.toISOString() ?? null,
          })),
          recent: recentActions.map((a) => ({
            id: a.id, title: a.title, status: a.status, touchpoint: a.touchpoint,
            at: a.timingEnd?.toISOString() ?? null,
          })),
        },
        openMissions,
      };
    }),
});
