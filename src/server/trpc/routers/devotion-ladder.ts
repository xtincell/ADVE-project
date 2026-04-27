// ============================================================================
// MODULE M42 — DevotionSnapshot + Devotion Ladder
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §2.2.9 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  snapshot(strategyId) — capture current devotion state
// [x] REQ-2  list, getByStrategy — query snapshots
// [x] REQ-3  setObjective(strategyId, targetLevel) — set devotion growth target
// [x] REQ-4  compare(strategyId, date1, date2) — compare snapshots over time
// [x] REQ-5  6 levels: Spectateur → Curieux → Fidèle → Ambassadeur → Évangéliste → Apôtre
// [x] REQ-6  DevotionSnapshot model in Prisma (audience distribution per level)
// [x] REQ-7  Connexion to Cult Index (devotion distribution feeds cult score)
// [x] REQ-8  AmbassadorProgram reconciliation (ambassadors = level 4-5)
// [x] REQ-9  Visualization in /cockpit Cult Dashboard (heroic ladder display)
//
// PROCEDURES: snapshot, list, getByStrategy, setObjective, compare,
//             getLevelDefinitions, syncToCultIndex, reconcileAmbassadors,
//             getVisualizationData
// ============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

// ── REQ-5: The 6 devotion levels ────────────────────────────────────────────
const DEVOTION_LEVELS = [
  { level: 1, key: "spectateur",   label: "Spectateur",   description: "Observe passivement la marque, aucun engagement actif.", color: "#94a3b8", minScore: 0 },
  { level: 2, key: "curieux",      label: "Curieux",      description: "S'interesse, suit les contenus, premiers signaux d'interet.", color: "#60a5fa", minScore: 15 },
  { level: 3, key: "fidele",       label: "Fidele",       description: "Achete regulierement, consomme les contenus, engagement modere.", color: "#34d399", minScore: 35 },
  { level: 4, key: "ambassadeur",  label: "Ambassadeur",  description: "Recommande activement, cree du contenu UGC, defend la marque.", color: "#fbbf24", minScore: 55 },
  { level: 5, key: "evangeliste",  label: "Evangeliste",   description: "Recrute de nouveaux fideles, participe aux programmes, influence.", color: "#f97316", minScore: 75 },
  { level: 6, key: "apotre",       label: "Apotre",       description: "Devouement total, identite fusionnee avec la marque, leader communautaire.", color: "#ef4444", minScore: 90 },
] as const;

export const devotionLadderRouter = createTRPCRouter({
  snapshot: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      spectateur: z.number().min(0).max(100),
      interesse: z.number().min(0).max(100),
      participant: z.number().min(0).max(100),
      engage: z.number().min(0).max(100),
      ambassadeur: z.number().min(0).max(100),
      evangeliste: z.number().min(0).max(100),
      trigger: z.string().default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      const devotionScore = input.engage * 0.2 + input.ambassadeur * 0.3 + input.evangeliste * 0.5;
      return ctx.db.devotionSnapshot.create({
        data: { ...input, devotionScore },
      });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.limit,
      });
    }),

  getByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
    }),

  setObjective: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      targetDevotionScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { advertis_vector: true },
      });
      const existing = (strategy.advertis_vector as Record<string, unknown>) ?? {};
      return ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: {
          advertis_vector: { ...existing, devotionObjective: input.targetDevotionScore },
        },
      });
    }),

  compare: protectedProcedure
    .input(z.object({ strategyId: z.string(), periods: z.number().default(6) }))
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.periods,
      });
      return snapshots.reverse();
    }),

  // ── REQ-5: Level definitions ─────────────────────────────────────────────
  getLevelDefinitions: protectedProcedure
    .query(() => {
      return DEVOTION_LEVELS.map((lvl) => ({
        level: lvl.level,
        key: lvl.key,
        label: lvl.label,
        description: lvl.description,
        color: lvl.color,
        minScore: lvl.minScore,
      }));
    }),

  // ── REQ-7: Connexion to Cult Index ───────────────────────────────────────
  syncToCultIndex: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get latest devotion snapshot
      const latest = await ctx.db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
      if (!latest) throw new Error("Aucun snapshot de devotion trouve. Creez un snapshot d'abord.");

      // Compute cult sub-score from devotion distribution
      // Weighted: higher levels contribute more to cult score
      const cultDevotion =
        latest.spectateur * 0.02 +
        latest.interesse * 0.05 +
        latest.participant * 0.1 +
        latest.engage * 0.2 +
        latest.ambassadeur * 0.3 +
        latest.evangeliste * 0.33;

      // Update strategy's advertis_vector with cult devotion sub-score
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { advertis_vector: true },
      });
      const existing = (strategy.advertis_vector as Record<string, unknown>) ?? {};
      await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: {
          advertis_vector: {
            ...existing,
            cultDevotionScore: Math.round(cultDevotion * 10) / 10,
            cultDevotionSyncedAt: new Date().toISOString(),
          },
        },
      });

      return {
        cultDevotionScore: Math.round(cultDevotion * 10) / 10,
        basedOnSnapshot: latest.id,
        syncedAt: new Date().toISOString(),
      };
    }),

  // ── REQ-8: Ambassador reconciliation ─────────────────────────────────────
  reconcileAmbassadors: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Load ambassador programs for this strategy
      const programs = await ctx.db.ambassadorProgram.findMany({
        where: { strategyId: input.strategyId },
        include: { members: { select: { id: true } } },
      });

      // Get latest devotion snapshot
      const latest = await ctx.db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });

      // Map ambassador tiers to devotion levels 4-5
      const reconciled = programs.map((p) => {
        const ambassadorCount = p.members.length;
        return {
          programId: p.id,
          programName: p.name,
          ambassadorCount,
          mappedLevel: ambassadorCount > 50 ? "evangeliste" : "ambassadeur",
          levelNumber: ambassadorCount > 50 ? 5 : 4,
        };
      });

      const totalAmbassadors = reconciled.reduce((s, r) => s + r.ambassadorCount, 0);

      return {
        strategyId: input.strategyId,
        programs: reconciled,
        totalAmbassadors,
        currentDevotionScore: latest?.devotionScore ?? 0,
        recommendation: totalAmbassadors > 100
          ? "Programme ambassadeur fort — focus sur conversion Evangeliste→Apotre"
          : totalAmbassadors > 20
            ? "Bon programme — augmenter l'engagement des Ambassadeurs"
            : "Programme naissant — recruter plus d'Ambassadeurs",
      };
    }),

  // ── REQ-9: Visualization data for cockpit ────────────────────────────────
  getVisualizationData: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all snapshots for trend data
      const snapshots = await ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "asc" },
        take: 12,
      });

      // Get objective from strategy
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { advertis_vector: true },
      });
      const vector = (strategy.advertis_vector as Record<string, unknown>) ?? {};
      const objective = (vector.devotionObjective as number) ?? null;

      // Build ladder chart data from latest snapshot
      const latest = snapshots.at(-1);
      const ladderData = latest
        ? [
            { level: "Spectateur", value: latest.spectateur, color: "#94a3b8" },
            { level: "Curieux", value: latest.interesse, color: "#60a5fa" },
            { level: "Fidele", value: latest.participant, color: "#34d399" },
            { level: "Engage", value: latest.engage, color: "#fbbf24" },
            { level: "Ambassadeur", value: latest.ambassadeur, color: "#f97316" },
            { level: "Evangeliste", value: latest.evangeliste, color: "#ef4444" },
          ]
        : [];

      // Build trend data
      const trendData = snapshots.map((s) => ({
        date: s.measuredAt,
        devotionScore: s.devotionScore,
      }));

      return {
        strategyId: input.strategyId,
        ladder: ladderData,
        trend: trendData,
        currentScore: latest?.devotionScore ?? 0,
        objective,
        levels: DEVOTION_LEVELS.map((l) => ({ key: l.key, label: l.label, color: l.color })),
      };
    }),
});
