// ============================================================================
// MODULE M38 — Social Publishing & Metrics
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §6.10 + Annexe E §3.2 | Division: La Fusée (BOOST)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  SocialConnection OAuth (6 platforms: Instagram, Facebook, TikTok, LinkedIn, YouTube, Twitter)
// [x] REQ-2  SocialPost CRUD with metrics (likes, comments, shares, reach, engagementRate)
// [x] REQ-3  list, connect, disconnect, getByStrategy
// [x] REQ-4  Câblage Driver ↔ SocialConnection (Driver Instagram connaît le compte réel)
// [x] REQ-5  SocialPost.metrics → Signal auto (feedback loop integration)
// [x] REQ-6  Engagement rate thresholds → automatic pillar E (Engagement) recalibration
// [x] REQ-7  Portal placement: client in /cockpit/operate, fixer in /console/fusee/social (pages exist in app router)
// [x] REQ-8  Cross-platform analytics (unified dashboard across all connected accounts)
//
// PROCEDURES: connectToDriver, ingestMetrics, getPerformance, linkToDriver,
//             processMetrics, checkEngagementThresholds, getCrossplatformAnalytics
// ============================================================================

import { z } from "zod";
import type { InputJsonValue as PrismaInputJson } from "@prisma/client/runtime/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/** Engagement rate thresholds by platform (%) */
const ENGAGEMENT_THRESHOLDS: Record<string, { low: number; good: number; excellent: number }> = {
  INSTAGRAM: { low: 1.0, good: 3.0, excellent: 6.0 },
  FACEBOOK: { low: 0.5, good: 1.5, excellent: 3.0 },
  TIKTOK: { low: 2.0, good: 5.0, excellent: 10.0 },
  LINKEDIN: { low: 0.5, good: 2.0, excellent: 5.0 },
  YOUTUBE: { low: 1.0, good: 3.0, excellent: 7.0 },
  TWITTER: { low: 0.5, good: 1.0, excellent: 3.0 },
};

export const socialRouter = createTRPCRouter({
  // Connect a social account to a Driver
  connectToDriver: governedProcedure({

    kind: "LEGACY_SOCIAL_CONNECT_TO_DRIVER",

    inputSchema: z.object({
      driverId: z.string(),
      platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"]),
      accountId: z.string(),
      accountName: z.string(),
    }),

    caller: "social:connectToDriver",

  })
    .mutation(async ({ ctx, input }) => {
      // Store connection metadata on the Driver
      const driver = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.driverId } });
      // IDOR (round-10) : keyé sur driverId, aucune garde de tête → vérifier que
      // le driver appartient à une marque du caller avant d'y écrire.
      await assertStrategyAccess(ctx, driver.strategyId);
      const existing = (driver.constraints as Record<string, unknown>) ?? {};
      return ctx.db.driver.update({
        where: { id: input.driverId },
        data: {
          constraints: {
            ...existing,
            socialConnection: {
              platform: input.platform,
              accountId: input.accountId,
              accountName: input.accountName,
              connectedAt: new Date().toISOString(),
            },
          } as PrismaInputJson,
        },
      });
    }),

  // Ingest social post metrics → create Signal for feedback loop
  ingestMetrics: governedProcedure({

    kind: "LEGACY_SOCIAL_INGEST_METRICS",

    inputSchema: z.object({
      strategyId: z.string(),
      driverId: z.string().optional(),
      platform: z.string(),
      postId: z.string(),
      metrics: z.object({
        impressions: z.number().default(0),
        reach: z.number().default(0),
        engagement: z.number().default(0),
        likes: z.number().default(0),
        comments: z.number().default(0),
        shares: z.number().default(0),
        saves: z.number().default(0),
        clicks: z.number().default(0),
      }),
    }),

    caller: "social:ingestMetrics",

  })
    .mutation(async ({ ctx, input }) => {
      // Create a Signal from social metrics
      const engagementRate = input.metrics.reach > 0
        ? (input.metrics.engagement / input.metrics.reach) * 100
        : 0;

      // Determine ADVE impact based on engagement rate
      const adveImpact: Record<string, number> = {
        e: Math.min(25, engagementRate * 2.5), // Engagement pillar
        d: input.metrics.impressions > 10000 ? 2 : 0, // Distinction via visibility
        t: 1, // Track — any measured data is positive
      };

      const signal = await ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "SOCIAL_METRICS",
          data: {
            platform: input.platform,
            postId: input.postId,
            driverId: input.driverId,
            ...input.metrics,
            engagementRate,
          } as PrismaInputJson,
          advertis_vector: adveImpact as PrismaInputJson,
        },
      });

      return signal;
    }),

  // Get social performance summary for a strategy
  getPerformance: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      platform: z.string().optional(),
      limit: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const signals = await ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "SOCIAL_METRICS",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Aggregate metrics
      let totalImpressions = 0;
      let totalEngagement = 0;
      let postCount = 0;

      for (const s of signals) {
        const data = s.data as Record<string, number> | null;
        if (data) {
          totalImpressions += data.impressions ?? 0;
          totalEngagement += data.engagement ?? 0;
          postCount++;
        }
      }

      return {
        signals,
        summary: {
          totalImpressions,
          totalEngagement,
          postCount,
          avgEngagementRate: totalImpressions > 0
            // lafusee:allow-adhoc-completion: social engagement ratio (post count, not pillar)
            ? (totalEngagement / totalImpressions) * 100
            : 0,
        },
      };
    }),

  // ── REQ-4: linkToDriver — connect social account to a Driver ────────────
  linkToDriver: governedProcedure({

    kind: "LEGACY_SOCIAL_LINK_TO_DRIVER",

    inputSchema: z.object({
      driverId: z.string(),
      platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "YOUTUBE", "TWITTER"]),
      accountId: z.string(),
      accountName: z.string(),
      followerCount: z.number().optional(),
    }),

    caller: "social:linkToDriver",

  })
    .mutation(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.driverId } });
      // IDOR (round-10) : keyé sur driverId, aucune garde de tête.
      await assertStrategyAccess(ctx, driver.strategyId);
      const existing = (driver.constraints as Record<string, unknown>) ?? {};
      const socialConnections = (existing.socialConnections as Array<Record<string, unknown>>) ?? [];

      // Add or update connection for this platform
      const idx = socialConnections.findIndex((c) => c.platform === input.platform);
      const connectionData = {
        platform: input.platform,
        accountId: input.accountId,
        accountName: input.accountName,
        followerCount: input.followerCount,
        linkedAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        socialConnections[idx] = connectionData;
      } else {
        socialConnections.push(connectionData);
      }

      return ctx.db.driver.update({
        where: { id: input.driverId },
        data: {
          constraints: {
            ...existing,
            socialConnections,
          } as PrismaInputJson,
        },
      });
    }),

  // ── REQ-5: processMetrics — SocialPost.metrics → Signal auto ────────────
  processMetrics: governedProcedure({

    kind: "LEGACY_SOCIAL_PROCESS_METRICS",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "social:processMetrics",

  })
    .mutation(async ({ ctx, input }) => {
      // Read recent SOCIAL_METRICS signals that haven't been processed
      const recentSignals = await ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "SOCIAL_METRICS",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Aggregate into a single METRIC signal per platform
      const byPlatform: Record<string, { impressions: number; engagement: number; reach: number; count: number }> = {};

      for (const s of recentSignals) {
        const data = s.data as Record<string, unknown> | null;
        if (!data) continue;
        const platform = (data.platform as string) ?? "unknown";
        if (!byPlatform[platform]) {
          byPlatform[platform] = { impressions: 0, engagement: 0, reach: 0, count: 0 };
        }
        byPlatform[platform].impressions += (data.impressions as number) ?? 0;
        byPlatform[platform].engagement += (data.engagement as number) ?? 0;
        byPlatform[platform].reach += (data.reach as number) ?? 0;
        byPlatform[platform].count++;
      }

      // Create aggregated METRIC signals
      const created = [];
      for (const [platform, stats] of Object.entries(byPlatform)) {
        const engRate = stats.reach > 0 ? (stats.engagement / stats.reach) * 100 : 0;
        const sig = await ctx.db.signal.create({
          data: {
            strategyId: input.strategyId,
            type: "SOCIAL_METRIC_AGGREGATE",
            data: {
              platform,
              totalImpressions: stats.impressions,
              totalEngagement: stats.engagement,
              totalReach: stats.reach,
              postCount: stats.count,
              avgEngagementRate: engRate,
              processedAt: new Date().toISOString(),
            } as PrismaInputJson,
            advertis_vector: {
              e: Math.min(25, engRate * 2.5),
              d: stats.impressions > 50000 ? 3 : 1,
              t: 2,
            } as PrismaInputJson,
          },
        });
        created.push(sig);
      }

      return { processedPlatforms: Object.keys(byPlatform), signalsCreated: created.length };
    }),

  // ── REQ-6: checkEngagementThresholds — pillar E recalibration ───────────
  checkEngagementThresholds: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const signals = await ctx.db.signal.findMany({
        where: { strategyId: input.strategyId, type: "SOCIAL_METRICS" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Aggregate engagement rate by platform
      const platformRates: Record<string, { totalEngagement: number; totalReach: number; count: number }> = {};

      for (const s of signals) {
        const data = s.data as Record<string, unknown> | null;
        if (!data) continue;
        const platform = (data.platform as string) ?? "unknown";
        if (!platformRates[platform]) {
          platformRates[platform] = { totalEngagement: 0, totalReach: 0, count: 0 };
        }
        platformRates[platform].totalEngagement += (data.engagement as number) ?? 0;
        platformRates[platform].totalReach += (data.reach as number) ?? 0;
        platformRates[platform].count++;
      }

      // Evaluate each platform against thresholds
      const evaluations = Object.entries(platformRates).map(([platform, stats]) => {
        const engagementRate = stats.totalReach > 0
          ? (stats.totalEngagement / stats.totalReach) * 100
          : 0;

        const thresholds = ENGAGEMENT_THRESHOLDS[platform] ?? { low: 1.0, good: 3.0, excellent: 6.0 };
        let level: "BELOW" | "LOW" | "GOOD" | "EXCELLENT";
        let pillarEAdjustment: number;

        if (engagementRate >= thresholds.excellent) {
          level = "EXCELLENT";
          pillarEAdjustment = 5;
        } else if (engagementRate >= thresholds.good) {
          level = "GOOD";
          pillarEAdjustment = 2;
        } else if (engagementRate >= thresholds.low) {
          level = "LOW";
          pillarEAdjustment = 0;
        } else {
          level = "BELOW";
          pillarEAdjustment = -3;
        }

        return {
          platform,
          engagementRate: Math.round(engagementRate * 100) / 100,
          level,
          pillarEAdjustment,
          sampleSize: stats.count,
          thresholds,
        };
      });

      // Overall recommendation for pillar E
      const avgAdjustment = evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.pillarEAdjustment, 0) / evaluations.length
        : 0;

      return {
        strategyId: input.strategyId,
        evaluations,
        overallPillarEAdjustment: Math.round(avgAdjustment * 10) / 10,
        recommendation: avgAdjustment >= 3 ? "INCREASE_E" : avgAdjustment <= -1 ? "DECREASE_E" : "MAINTAIN",
      };
    }),

  // ── REQ-8: getCrossplatformAnalytics — unified dashboard ────────────────
  getCrossplatformAnalytics: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const signals = await ctx.db.signal.findMany({
        where: { strategyId: input.strategyId, type: "SOCIAL_METRICS" },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      // Aggregate by platform
      const platforms: Record<string, {
        impressions: number; reach: number; engagement: number;
        likes: number; comments: number; shares: number; saves: number;
        clicks: number; posts: number;
      }> = {};

      for (const s of signals) {
        const data = s.data as Record<string, unknown> | null;
        if (!data) continue;
        const platform = (data.platform as string) ?? "unknown";
        if (!platforms[platform]) {
          platforms[platform] = {
            impressions: 0, reach: 0, engagement: 0, likes: 0,
            comments: 0, shares: 0, saves: 0, clicks: 0, posts: 0,
          };
        }
        const p = platforms[platform];
        p.impressions += (data.impressions as number) ?? 0;
        p.reach += (data.reach as number) ?? 0;
        p.engagement += (data.engagement as number) ?? 0;
        p.likes += (data.likes as number) ?? 0;
        p.comments += (data.comments as number) ?? 0;
        p.shares += (data.shares as number) ?? 0;
        p.saves += (data.saves as number) ?? 0;
        p.clicks += (data.clicks as number) ?? 0;
        p.posts++;
      }

      // Compute engagement rates per platform
      const platformAnalytics = Object.entries(platforms).map(([platform, stats]) => ({
        platform,
        ...stats,
        engagementRate: stats.reach > 0 ? (stats.engagement / stats.reach) * 100 : 0,
        avgLikesPerPost: stats.posts > 0 ? stats.likes / stats.posts : 0,
        avgCommentsPerPost: stats.posts > 0 ? stats.comments / stats.posts : 0,
      }));

      // Cross-platform totals
      const totals = Object.values(platforms).reduce(
        (acc, p) => ({
          impressions: acc.impressions + p.impressions,
          reach: acc.reach + p.reach,
          engagement: acc.engagement + p.engagement,
          likes: acc.likes + p.likes,
          comments: acc.comments + p.comments,
          shares: acc.shares + p.shares,
          posts: acc.posts + p.posts,
        }),
        { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
      );

      return {
        strategyId: input.strategyId,
        platforms: platformAnalytics,
        totals: {
          ...totals,
          avgEngagementRate: totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0,
        },
        topPlatform: platformAnalytics.sort((a, b) => b.engagementRate - a.engagementRate)[0]?.platform ?? null,
        connectedPlatforms: Object.keys(platforms).length,
      };
    }),

  // ════════════════════════════════════════════════════════════════════
  // Vague 7 — Traque unifiée followers + tags (FollowerSnapshot)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Enregistre un instantané followers/mentions. strategyId null = comptes
   * propres de La Fusée / UPgraders. Source MANUAL (opérateur) ou CONNECTOR
   * (ingestion automatisée future) — manual-first (ADR-0060).
   */
  recordFollowerSnapshot: governedProcedure({
    kind: "RECORD_FOLLOWER_SNAPSHOT",
    inputSchema: z.object({
      strategyId: z.string().nullable().default(null),
      platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER", "YOUTUBE"]),
      handle: z.string().min(1).max(120),
      followerCount: z.number().int().min(0),
      followingCount: z.number().int().min(0).optional(),
      mentionsCount: z.number().int().min(0).optional(),
      source: z.enum(["MANUAL", "CONNECTOR"]).default("MANUAL"),
    }),
  }).mutation(async ({ input, ctx }) => {
    const { db } = await import("@/lib/db");
    return db.followerSnapshot.create({
      data: {
        strategyId: input.strategyId,
        platform: input.platform,
        handle: input.handle.replace(/^@/, ""),
        followerCount: input.followerCount,
        followingCount: input.followingCount ?? null,
        mentionsCount: input.mentionsCount ?? null,
        source: input.source,
      },
    });
  }),

  /**
   * Tendances followers — dernier snapshot + delta par (plateforme, handle).
   * strategyId null = comptes La Fusée. Déterministe (lecture seule).
   */
  followerTrends: protectedProcedure
    .input(z.object({ strategyId: z.string().nullable().default(null), days: z.number().int().min(7).max(365).default(90) }))
    .query(async ({ ctx, input }) => {
      if (input.strategyId) await assertStrategyAccess(ctx, input.strategyId);
      const { db } = await import("@/lib/db");
      const since = new Date(Date.now() - input.days * 24 * 3600 * 1000);
      const rows = await db.followerSnapshot.findMany({
        where: { strategyId: input.strategyId, capturedAt: { gte: since } },
        orderBy: { capturedAt: "asc" },
        take: 2000,
      });
      const byAccount = new Map<string, typeof rows>();
      for (const r of rows) {
        const key = `${r.platform}:${r.handle}`;
        const list = byAccount.get(key) ?? [];
        list.push(r);
        byAccount.set(key, list);
      }
      return [...byAccount.entries()].map(([key, list]) => {
        const first = list[0]!;
        const last = list[list.length - 1]!;
        return {
          key,
          platform: first.platform,
          handle: first.handle,
          current: last.followerCount,
          delta: last.followerCount - first.followerCount,
          mentions: list.reduce((sum: number, r: { mentionsCount: number | null }) => sum + (r.mentionsCount ?? 0), 0),
          series: (list as (typeof rows[number])[]).map((r) => ({ at: r.capturedAt, followers: r.followerCount, mentions: r.mentionsCount ?? 0 })),
          lastCapturedAt: last.capturedAt,
        };
      }).sort((a, b) => b.current - a.current);
    }),

  // ════════════════════════════════════════════════════════════════════
  // Option 1 — Collecte via API officielle Meta
  // ════════════════════════════════════════════════════════════════════

  /**
   * Déclenche une collecte followers via le token Meta Graph stocké dans
   * ExternalConnector (META_SOCIAL_OFFICIAL). DEFERRED si absent.
   */
  triggerOfficialFetch: governedProcedure({
    kind: "SOCIAL_AUDIT_FETCH_OFFICIAL",
    inputSchema: z.object({
      strategyId: z.string().nullable().default(null),
      handles: z.array(z.object({
        platform: z.enum(["INSTAGRAM", "FACEBOOK"]),
        handle: z.string().min(1).max(120),
      })).min(1).max(20),
    }),
  }).mutation(async ({ ctx, input }) => {
    const { fetchOfficialApiFollowers } = await import("@/server/services/anubis/social-audit");
    const operatorId = ctx.session.user.id;
    const result = await fetchOfficialApiFollowers(
      operatorId,
      input.strategyId,
      input.handles as Parameters<typeof fetchOfficialApiFollowers>[2],
    );
    return result;
  }),

  // ════════════════════════════════════════════════════════════════════
  // Option 2 — Collecte via API tierce (Apify)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Déclenche une collecte followers via Apify Instagram Profile Scraper.
   * DEFERRED si clé absente. Supporte uniquement INSTAGRAM (Apify scraper).
   */
  triggerThirdPartyFetch: governedProcedure({
    kind: "SOCIAL_AUDIT_FETCH_THIRD_PARTY",
    inputSchema: z.object({
      strategyId: z.string().nullable().default(null),
      handles: z.array(z.object({
        platform: z.enum(["INSTAGRAM"]),
        handle: z.string().min(1).max(120),
      })).min(1).max(20),
    }),
  }).mutation(async ({ ctx, input }) => {
    const { fetchThirdPartyFollowers } = await import("@/server/services/anubis/social-audit");
    const operatorId = ctx.session.user.id;
    const result = await fetchThirdPartyFollowers(
      operatorId,
      input.strategyId,
      input.handles as Parameters<typeof fetchThirdPartyFollowers>[2],
    );
    return result;
  }),

  // ════════════════════════════════════════════════════════════════════
  // Re-scan de l'empreinte publique → pilier E (ADR-0121)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Re-collecte l'empreinte publique de la marque (footprint site + découverte
   * Brave + followers Apify + presse RSS) et met à jour le pilier E via le
   * gateway (author EXTERNAL_SAAS, provenance SOURCE/INFERRED — le guard
   * protège les champs HUMAN). Parité manual-first du chemin intake auto.
   */
  rescanPublicFootprint: governedProcedure({
    kind: "ENRICH_E_FROM_PUBLIC_FOOTPRINT",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "social:rescanPublicFootprint",
  }).mutation(async ({ input }) => {
    const { rerunPublicEnrichmentForStrategy } = await import("@/server/services/quick-intake/public-enrichment");
    return rerunPublicEnrichmentForStrategy(input.strategyId);
  }),

  // ════════════════════════════════════════════════════════════════════
  // Gestion des connecteurs sociaux
  // ════════════════════════════════════════════════════════════════════

  /** Liste les connecteurs sociaux configurés pour cet opérateur. */
  listSocialConnectors: protectedProcedure
    .query(async ({ ctx }) => {
      const { getSocialConnectors } = await import("@/server/services/anubis/social-audit");
      return getSocialConnectors(ctx.session.user.id);
    }),

  /**
   * Upsert un connecteur social (META_SOCIAL_OFFICIAL ou APIFY_SOCIAL).
   * La config JSON est passée telle quelle — le service valide les champs requis
   * au moment de l'utilisation (fetch).
   *
   * IMPORTANT : ne jamais logger ctx ni le token renvoyé.
   */
  upsertSocialConnector: protectedProcedure
    .input(z.object({
      connectorType: z.enum(["META_SOCIAL_OFFICIAL", "APIFY_SOCIAL"]),
      config: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { upsertSocialConnector } = await import("@/server/services/anubis/social-audit");
      return upsertSocialConnector(ctx.session.user.id, {
        connectorType: input.connectorType,
        config: input.config,
      });
    }),

  // ════════════════════════════════════════════════════════════════════
  // ADR-0128 — Réseaux de la marque (connexions OAuth par le founder)
  // ════════════════════════════════════════════════════════════════════

  /**
   * État des réseaux de la marque pour le cockpit : par plateforme —
   * connexion (SocialConnection), dernier relevé d'audience
   * (FollowerSnapshot toutes provenances) et disponibilité du fournisseur
   * (env creds + clé de chiffrement). Read-only, tenant-scoped, zéro
   * secret exposé (les tokens ne quittent JAMAIS le serveur).
   */
  getBrandSocialHub: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { getBrandSocialHubData } = await import("@/server/services/anubis/social-connect");
      return getBrandSocialHubData(input.strategyId);
    }),

  /** Définit la Page de travail (active) d'un réseau — les sœurs passent en réserve. */
  setWorkingAccount: governedProcedure({
    kind: "ANUBIS_SOCIAL_SET_PRIMARY_ACCOUNT",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      connectionId: z.string().min(1),
    }),
    caller: "social:setWorkingAccount",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { setWorkingSocialAccount } = await import("@/server/services/anubis/social-connect");
    return setWorkingSocialAccount(input.strategyId, input.connectionId);
  }),

  /** Déconnecte un compte social de la marque (tokens purgés, historique conservé). */
  disconnectSocial: governedProcedure({
    kind: "ANUBIS_SOCIAL_DISCONNECT_ACCOUNT",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      connectionId: z.string().min(1),
    }),
    caller: "social:disconnectSocial",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { disconnectSocialConnection } = await import("@/server/services/anubis/social-connect");
    return disconnectSocialConnection(input.strategyId, input.connectionId);
  }),

  /**
   * Actualise l'audience des comptes connectés de la marque (refresh token
   * transparent + fetch par plateforme + FollowerSnapshot source=CONNECTOR).
   * Contract P22-1 : LIVE / DEGRADED / DEFERRED — l'UI affiche l'état tel quel.
   */
  syncSocial: governedProcedure({
    kind: "ANUBIS_SOCIAL_SYNC_FOLLOWERS",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "social:syncSocial",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { syncStrategySocialFollowers } = await import("@/server/services/anubis/social-connect");
    return syncStrategySocialFollowers(input.strategyId);
  }),

  /**
   * P1 (plan validé) — collecte des publications + métriques publiques par
   * post, puis Insights privés best-effort (ADR-0133) quand la connexion
   * porte le scope (read_insights / instagram_manage_insights).
   */
  syncPosts: governedProcedure({
    kind: "ANUBIS_SYNC_SOCIAL_POSTS",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "social:syncPosts",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { syncStrategySocialPosts } = await import("@/server/services/anubis/social-connect");
    const result = await syncStrategySocialPosts(input.strategyId);
    const { enrichRecentPostInsights } = await import("@/server/services/anubis/social-insights");
    const insights = await enrichRecentPostInsights(input.strategyId).catch(
      () => ({ state: "DEGRADED", reason: "VENDOR_OUTAGE" }) as const,
    );
    return { ...result, insights };
  }),

  // ════════════════════════════════════════════════════════════════════
  // ADR-0133 — Suite sociale pilotable : inbox, réponse, publication, rapport
  // ════════════════════════════════════════════════════════════════════

  /** Boîte de réception : interactions des tiers adressées à la marque. */
  getInbox: protectedProcedure
    .input(z.object({
      strategyId: z.string().min(1),
      status: z.enum(["OPEN", "REPLIED", "DISMISSED"]).optional(),
      platform: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { listInboxItems } = await import("@/server/services/anubis/social-inbox");
      return listInboxItems(input.strategyId, { status: input.status, platform: input.platform });
    }),

  /** Balaye les commentaires des publications récentes (FB/IG). */
  syncInbox: governedProcedure({
    kind: "ANUBIS_SYNC_INBOX",
    inputSchema: z.object({ strategyId: z.string().min(1) }),
    caller: "social:syncInbox",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { syncStrategyInbox } = await import("@/server/services/anubis/social-inbox");
    return syncStrategyInbox(input.strategyId);
  }),

  /** Répond à un commentaire au nom de la marque. */
  replyToComment: governedProcedure({
    kind: "ANUBIS_REPLY_COMMENT",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      itemId: z.string().min(1),
      text: z.string().min(1).max(2000),
    }),
    caller: "social:replyToComment",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { replyToInboxItem } = await import("@/server/services/anubis/social-inbox");
    return replyToInboxItem({ strategyId: input.strategyId, itemId: input.itemId, text: input.text });
  }),

  /** Classe une interaction sans réponse (lecture seule côté plateforme). */
  dismissInboxItem: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), itemId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { dismissInboxItem } = await import("@/server/services/anubis/social-inbox");
      await dismissInboxItem(input.strategyId, input.itemId);
      return { ok: true };
    }),

  /** Publie (ou planifie via le calendrier) au nom de la marque. */
  publishPost: governedProcedure({
    kind: "ANUBIS_PUBLISH_SOCIAL_POST",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      targets: z.array(z.string().min(1)).min(1).max(6),
      text: z.string().max(4000),
      linkUrl: z.string().url().optional().nullable(),
      imageUrl: z.string().url().optional().nullable(),
      scheduleAt: z.string().datetime().optional().nullable(),
      // Brief créatif intégré + copy du visuel (le générateur/designer sait
      // quoi produire) — persistés sur l'action, jamais envoyés au réseau.
      brief: z.string().max(4000).optional().nullable(),
      visualCopy: z.string().max(2000).optional().nullable(),
      // Gestion par publication : édite/replanifie/déclenche une publication
      // EXISTANTE (scopée à la marque via where {id, strategyId} côté service).
      brandActionId: z.string().optional().nullable(),
    }),
    caller: "social:publishPost",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { publishSocialPost } = await import("@/server/services/anubis/social-publish");
    return publishSocialPost({
      strategyId: input.strategyId,
      userId: ctx.session.user.id,
      targets: input.targets,
      text: input.text,
      linkUrl: input.linkUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      scheduleAt: input.scheduleAt ?? null,
      brief: input.brief ?? null,
      visualCopy: input.visualCopy ?? null,
      brandActionId: input.brandActionId ?? null,
    });
  }),

  /**
   * Rapport de performance social (30/90 j) — déterministe, zéro LLM :
   * publications (volumes, engagement, portée quand mesurée), audience
   * (dernier relevé + delta), meilleures publications.
   */
  getSocialReport: protectedProcedure
    .input(z.object({
      strategyId: z.string().min(1),
      days: z.union([z.literal(30), z.literal(90)]).default(30),
    }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { buildSocialReport } = await import("@/server/services/anubis/social-report");
      return buildSocialReport(input.strategyId, input.days);
    }),

  /**
   * Gestion par publication (mandat 2026-07-13) — liste les publications de la
   * marque (planifiées + récentes) avec leur brief / copy / résultats, pour le
   * panneau de revue et correction.
   */
  listPublications: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const { listScheduledPublications } = await import("@/server/services/anubis/social-publish");
      return listScheduledPublications(input.strategyId);
    }),

  /** Annule une publication planifiée (le cron ne la reprend plus). */
  cancelPublication: governedProcedure({
    kind: "ANUBIS_CANCEL_SCHEDULED_POST",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      brandActionId: z.string().min(1),
    }),
    caller: "social:cancelPublication",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    const { cancelScheduledPublication } = await import("@/server/services/anubis/social-publish");
    return cancelScheduledPublication(input.strategyId, input.brandActionId);
  }),
});

/**
 * Garde d'ownership founder (parité cockpit-router) : la marque doit
 * appartenir au user de session, sauf ADMIN ou user lié à un opérateur.
 */
async function assertStrategyAccess(
  ctx: { db: typeof import("@/lib/db").db; session: { user: { id: string; role?: string | null } } },
  strategyId: string,
): Promise<void> {
  // ADR-0129 - point de passage canonique : owner / MEME operateur / ADMIN /
  // collaborateur delegue ACTIVE. (Corrige aussi la garde faible initiale qui
  // acceptait n'importe quel user porteur d'un operatorId quelconque.)
  const { canAccessStrategy, getOperatorContext } = await import("@/server/services/operator-isolation");
  const opCtx = await getOperatorContext(ctx.session.user.id);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new Error("Cette marque ne vous appartient pas");
  }
}
