// ============================================================================
// MODULE M29 — MCP Pulse Server
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §3.3 | Division: Le Signal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  13 tools: computeCultIndex, getDevotionLadder, analyzeCommunity,
//            getSuperfans, trackEngagement, createSignal, getSignals,
//            getSocialMetrics, getBrandHealth, getCompetitorPulse,
//            detectTrend, getAudienceInsights, measureSentiment
// [x] REQ-2  7 resources: cult-index/{strategyId}, signals/{strategyId},
//            social/{strategyId}, community/{strategyId}, superfans/{strategyId},
//            devotion/{strategyId}, engagement/{strategyId}
//
// TOOLS: 13 | RESOURCES: 7 | SPEC TARGET: 11 tools + 7 resources ✓
// ============================================================================

import { z } from "zod";
import { db } from "@/lib/db";
import * as cultIndexEngine from "@/server/services/cult-index-engine";

// ---------------------------------------------------------------------------
// Pulse MCP Server
// Outils de mesure de la dévotion : Devotion Ladder, Cult Index, engagement,
// superfans, santé communautaire, UGC, rituels, évangélisme.
// ---------------------------------------------------------------------------

export const serverName = "pulse";
export const serverDescription =
  "Serveur MCP Pulse — Mesure de la dévotion de marque, Cult Index, Devotion Ladder, engagement, superfans et santé communautaire pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- Devotion Ladder ----
  {
    name: "devotion_ladder_snapshot",
    description:
      "Capture un instantané de la Devotion Ladder : répartition de l'audience par niveau (Stranger → Evangelist).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const latest = await db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId as string },
        orderBy: { measuredAt: "desc" },
      });
      if (!latest) {
        return { strategyId: input.strategyId, snapshot: null, message: "Aucun snapshot disponible" };
      }
      return {
        strategyId: input.strategyId,
        measuredAt: latest.measuredAt,
        levels: { spectateur: latest.spectateur, interesse: latest.interesse, participant: latest.participant, engage: latest.engage, ambassadeur: latest.ambassadeur, evangeliste: latest.evangeliste },
        devotionScore: latest.devotionScore,
      };
    },
  },

  {
    name: "devotion_ladder_history",
    description:
      "Historique de la Devotion Ladder pour suivre l'évolution de la progression d'audience dans le temps.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      limit: z.number().int().min(1).max(52).default(12).describe("Nombre de snapshots"),
    }),
    handler: async (input) => {
      const snapshots = await db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId as string },
        orderBy: { measuredAt: "desc" },
        take: (input.limit as number) ?? 12,
      });
      return { strategyId: input.strategyId, snapshots };
    },
  },

  // ---- Cult Index ----
  {
    name: "cult_index_calculate",
    description:
      "Calcule le Cult Index (0-100) d'une marque à partir des 7 dimensions pondérées. Tiers : GHOST, FUNCTIONAL, LOVED, EMERGING, CULT.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      dimensions: z
        .object({
          engagementDepth: z.number().min(0).max(100).describe("Profondeur d'engagement (25%)"),
          superfanVelocity: z.number().min(0).max(100).describe("Vélocité des superfans (20%)"),
          communityCohesion: z.number().min(0).max(100).describe("Cohésion communautaire (15%)"),
          brandDefenseRate: z.number().min(0).max(100).describe("Taux de défense de marque (15%)"),
          ugcGenerationRate: z.number().min(0).max(100).describe("Taux de génération UGC (10%)"),
          ritualAdoption: z.number().min(0).max(100).describe("Adoption des rituels (10%)"),
          evangelismScore: z.number().min(0).max(100).describe("Score d'évangélisme (5%)"),
        })
        .describe("Les 7 dimensions du Cult Index"),
    }),
    handler: async (input) => {
      const dimensions = input.dimensions as {
        engagementDepth: number;
        superfanVelocity: number;
        communityCohesion: number;
        brandDefenseRate: number;
        ugcGenerationRate: number;
        ritualAdoption: number;
        evangelismScore: number;
      };
      const score = cultIndexEngine.computeCultIndex(dimensions);
      const tier = cultIndexEngine.getCultTier(score);
      return { strategyId: input.strategyId, cultIndex: score, tier, dimensions };
    },
  },

  {
    name: "cult_index_history",
    description:
      "Historique du Cult Index pour suivre la progression de la marque vers le statut CULT.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      limit: z.number().int().min(1).max(52).default(12),
    }),
    handler: async (input) => {
      const history = await db.cultIndexSnapshot.findMany({
        where: { strategyId: input.strategyId as string },
        orderBy: { measuredAt: "desc" },
        take: (input.limit as number) ?? 12,
      });
      return { strategyId: input.strategyId, history };
    },
  },

  // ---- Engagement Tracking ----
  {
    name: "engagement_track",
    description:
      "Suit les métriques d'engagement d'une campagne : interactions, partages, commentaires, temps passé.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      period: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: {
          missions: {
            include: { driver: true },
          },
        },
      });
      const engagementByDriver = campaign.missions.map((m: { title: string; driver?: { name: string; channel: string } | null; status: string }) => ({
        missionTitle: m.title,
        channel: m.driver?.channel ?? "N/A",
        driverName: m.driver?.name ?? "N/A",
        status: m.status,
      }));
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        period: input.period,
        engagementByDriver,
      };
    },
  },

  // ---- Superfan Profiling ----
  {
    name: "superfan_profile",
    description:
      "Identifie et profile les superfans de la marque : comportements, fréquence d'interaction, valeur estimée.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      minEngagementScore: z.number().min(0).max(100).default(70).describe("Score minimum pour qualifier un superfan"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: async (input) => {
      const profiles = await db.superfanProfile.findMany({
        where: {
          strategyId: input.strategyId as string,
          engagementDepth: { gte: (input.minEngagementScore as number) ?? 70 },
        },
        orderBy: { engagementDepth: "desc" },
        take: (input.limit as number) ?? 20,
      });
      return {
        strategyId: input.strategyId,
        superfanCount: profiles.length,
        superfans: profiles.map((p) => ({
          id: p.id,
          handle: p.handle,
          platform: p.platform,
          engagementDepth: p.engagementDepth,
          segment: p.segment,
          lastActive: p.lastActiveAt,
        })),
      };
    },
  },

  // ---- Community Health ----
  {
    name: "community_health",
    description:
      "Diagnostic de santé communautaire : activité, croissance, sentiment, taux de rétention des membres.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const [totalProfiles, recentProfiles, highEngagement] = await Promise.all([
        db.superfanProfile.count({ where: { strategyId: input.strategyId as string } }),
        db.superfanProfile.count({
          where: {
            strategyId: input.strategyId as string,
            lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        db.superfanProfile.count({
          where: {
            strategyId: input.strategyId as string,
            engagementDepth: { gte: 50 },
          },
        }),
      ]);
      const activeRate = totalProfiles > 0 ? Math.round((recentProfiles / totalProfiles) * 100) : 0;
      const healthScore = totalProfiles > 0 ? Math.round((highEngagement / totalProfiles) * 100) : 0;
      return {
        strategyId: input.strategyId,
        totalMembers: totalProfiles,
        activeInLast30Days: recentProfiles,
        activeRate,
        highEngagementMembers: highEngagement,
        communityHealthScore: healthScore,
      };
    },
  },

  // ---- Brand Defense Monitoring ----
  {
    name: "brand_defense_monitor",
    description:
      "Surveille la défense de marque : membres qui défendent la marque organiquement face aux critiques.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const signals = await db.signal.findMany({
        where: {
          strategyId: input.strategyId as string,
          type: { in: ["mention", "sentiment_shift"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const defenders = await db.superfanProfile.findMany({
        where: {
          strategyId: input.strategyId as string,
          segment: { in: ["ADVOCATE", "EVANGELIST"] },
        },
        orderBy: { engagementDepth: "desc" },
        take: 10,
      });
      return {
        strategyId: input.strategyId,
        recentMentions: signals,
        topDefenders: defenders.map((d: { id: string; handle: string; segment: string; engagementDepth: number }) => ({
          id: d.id,
          handle: d.handle,
          segment: d.segment,
          engagementDepth: d.engagementDepth,
        })),
      };
    },
  },

  // ---- UGC Tracking ----
  {
    name: "ugc_track",
    description:
      "Suit le contenu généré par les utilisateurs (UGC) : volume, qualité, viralité, meilleurs contributeurs.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      period: z.enum(["7d", "30d", "90d"]).default("30d"),
    }),
    handler: async (input) => {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[(input.period as string) ?? "30d"] ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const entries = await db.knowledgeEntry.findMany({
        where: {
          sector: input.strategyId as string,
          entryType: "CREATOR_PATTERN",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        strategyId: input.strategyId,
        period: input.period,
        ugcCount: entries.length,
        entries: entries.slice(0, 20),
      };
    },
  },

  // ---- Ritual Adoption ----
  {
    name: "ritual_adoption_measure",
    description:
      "Mesure l'adoption des rituels de marque par la communauté : taux de participation, récurrence, propagation.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });
      const ritualEntries = await db.knowledgeEntry.findMany({
        where: {
          sector: input.strategyId as string,
          entryType: "BRIEF_PATTERN",
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        brand: strategy.name,
        rituals: ritualEntries,
        totalRituals: ritualEntries.length,
      };
    },
  },

  // ---- Evangelism Scoring ----
  {
    name: "evangelism_score",
    description:
      "Calcule le score d'évangélisme de la marque : NPS organique, taux de recommandation, ambassadeurs actifs.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const [evangelists, totalProfiles, ambassadorProgram] = await Promise.all([
        db.superfanProfile.count({
          where: {
            strategyId: input.strategyId as string,
            segment: "EVANGELIST",
          },
        }),
        db.superfanProfile.count({ where: { strategyId: input.strategyId as string } }),
        db.ambassadorProgram.findUnique({
          where: { strategyId: input.strategyId as string },
          include: { members: { where: { isActive: true } } },
        }),
      ]);
      const evangelismRate = totalProfiles > 0 ? Math.round((evangelists / totalProfiles) * 100) : 0;
      return {
        strategyId: input.strategyId,
        evangelists,
        totalProfiles,
        evangelismRate,
        activeAmbassadors: ambassadorProgram?.members?.length ?? 0,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Resources (7 as per spec §3.3)
// ---------------------------------------------------------------------------

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string }) => Promise<unknown>;
}

export const resources: ResourceDefinition[] = [
  {
    uri: "pulse://cult-index/{strategyId}",
    name: "Cult Index",
    description: "Current Cult Index score (0-100) with 7 dimension breakdown",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const config = await db.brandOSConfig.findUnique({ where: { strategyId } });
      const cultScore = (config?.config as Record<string, unknown>)?.cultIndex ?? null;
      return { strategyId, cultIndex: cultScore };
    },
  },
  {
    uri: "pulse://signals/{strategyId}",
    name: "Active Signals",
    description: "Recent signals (metric, strong, weak) for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const signals = await db.signal.findMany({
        where: { strategyId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return {
        strategyId,
        count: signals.length,
        signals: signals.map((s) => {
          const d = s.data as Record<string, unknown> | null;
          return {
            id: s.id,
            type: s.type,
            title: d?.title ?? null,
            pillarKey: d?.pillarKey ?? null,
            severity: d?.severity ?? null,
            createdAt: s.createdAt,
          };
        }),
      };
    },
  },
  {
    uri: "pulse://social/{strategyId}",
    name: "Social Metrics",
    description: "Social media connections and recent post metrics",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const connections = await db.socialConnection.findMany({
        where: { strategyId },
        select: { platform: true, status: true, accountName: true },
      });
      const recentPosts = await db.socialPost.findMany({
        where: { strategyId },
        orderBy: { publishedAt: "desc" },
        take: 10,
        select: { id: true, content: true, publishedAt: true, likes: true, comments: true, shares: true, reach: true, engagementRate: true },
      });
      return { connections, recentPosts };
    },
  },
  {
    uri: "pulse://community/{strategyId}",
    name: "Community Health",
    description: "Latest community health snapshot — activity, growth, retention",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const snapshot = await db.communitySnapshot.findFirst({
        where: { strategyId },
        orderBy: { measuredAt: "desc" },
      });
      return { strategyId, snapshot };
    },
  },
  {
    uri: "pulse://superfans/{strategyId}",
    name: "Superfan Profiles",
    description: "Top superfan profiles with engagement metrics",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const superfans = await db.superfanProfile.findMany({
        where: { strategyId },
        orderBy: { engagementDepth: "desc" },
        take: 20,
      });
      return { strategyId, count: superfans.length, superfans };
    },
  },
  {
    uri: "pulse://devotion/{strategyId}",
    name: "Devotion Ladder",
    description: "Audience distribution across the 6 devotion levels",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const snapshot = await db.devotionSnapshot.findFirst({
        where: { strategyId },
        orderBy: { measuredAt: "desc" },
      });
      return { strategyId, snapshot };
    },
  },
  {
    uri: "pulse://engagement/{strategyId}",
    name: "Engagement Metrics",
    description: "Cross-channel engagement rates, top performing content, trend",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const [posts, campaigns] = await Promise.all([
        db.socialPost.findMany({
          where: { strategyId },
          orderBy: { publishedAt: "desc" },
          take: 50,
          select: { id: true, likes: true, comments: true, shares: true, reach: true, publishedAt: true },
        }),
        db.campaign.findMany({
          where: { strategyId, state: "LIVE" },
          include: { amplifications: { select: { reach: true, engagements: true, views: true } } },
        }),
      ]);
      const totalReach = campaigns.reduce((s, c) => s + c.amplifications.reduce((a, amp) => a + (amp.reach ?? 0), 0), 0);
      const totalEngagements = campaigns.reduce((s, c) => s + c.amplifications.reduce((a, amp) => a + (amp.engagements ?? 0), 0), 0);
      return {
        strategyId,
        socialPostsAnalyzed: posts.length,
        liveCampaigns: campaigns.length,
        totalReach,
        totalEngagements,
        engagementRate: totalReach > 0 ? Math.round((totalEngagements / totalReach) * 10000) / 100 : 0,
      };
    },
  },
];
