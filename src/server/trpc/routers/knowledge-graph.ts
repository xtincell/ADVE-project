import { z } from "zod";
import crypto from "crypto";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const knowledgeGraphRouter = createTRPCRouter({
  query: protectedProcedure
    .input(z.object({
      queryText: z.string().min(1),
      filters: z.record(z.unknown()).optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Search across strategies, pillars, and brand assets using text matching
      const strategies = await ctx.db.strategy.findMany({
        where: { name: { contains: input.queryText, mode: "insensitive" } },
        take: input.limit,
        select: { id: true, name: true, status: true, advertis_vector: true },
      });
      return strategies.map((s) => ({ type: "strategy" as const, ...s }));
    }),

  getBenchmarks: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Aggregate strategy scores as sector benchmarks
      const strategies = await ctx.db.strategy.findMany({
        where: { status: "ACTIVE" },
        select: { advertis_vector: true },
      });
      const vectors = strategies
        .map((s) => s.advertis_vector as Record<string, number> | null)
        .filter(Boolean) as Record<string, number>[];

      if (vectors.length === 0) return { count: 0, avgComposite: 0, benchmarks: {} };

      const avgComposite = vectors.reduce((sum, v) => sum + (v.composite ?? 0), 0) / vectors.length;
      return { count: vectors.length, avgComposite, benchmarks: {} };
    }),

  getFrameworkRanking: protectedProcedure
    .input(z.object({ frameworkId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const strategies = await ctx.db.strategy.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, advertis_vector: true },
        orderBy: { createdAt: "desc" },
      });
      return strategies
        .map((s) => {
          const vec = s.advertis_vector as Record<string, number> | null;
          return { strategyId: s.id, name: s.name, composite: vec?.composite ?? 0 };
        })
        .sort((a, b) => b.composite - a.composite);
    }),

  getCreatorPatterns: adminProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.creatorId },
        include: { portfolioItems: true },
      });
      return {
        tier: profile.tier,
        totalMissions: profile.totalMissions,
        firstPassRate: profile.firstPassRate,
        avgScore: profile.avgScore,
        specialties: profile.driverSpecialties,
        portfolioCount: profile.portfolioItems.length,
      };
    }),

  getBriefPatterns: adminProcedure
    .input(z.object({
      briefId: z.string().optional(),
      sector: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const missions = await ctx.db.mission.findMany({
        where: { status: "COMPLETED" },
        select: { id: true, title: true, status: true, advertis_vector: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      });
      return missions.map((m) => ({
        missionId: m.id,
        title: m.title,
        vector: m.advertis_vector,
      }));
    }),

  ingest: adminProcedure
    .input(z.object({
      source: z.string(),
      data: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const sourceHash = crypto
        .createHash("sha256")
        .update(JSON.stringify({ source: input.source, data: input.data }))
        .digest("hex");

      // Avoid duplicate ingestion by checking sourceHash
      const existing = await ctx.db.knowledgeEntry.findFirst({
        where: { sourceHash },
      });
      if (existing) {
        return { success: true, source: input.source, nodesCreated: 0, duplicateOf: existing.id };
      }

      const entry = await ctx.db.knowledgeEntry.create({
        data: {
          entryType: "DIAGNOSTIC_RESULT",
          data: input.data as object,
          sourceHash,
          sector: typeof input.data.sector === "string" ? input.data.sector : null,
          market: typeof input.data.market === "string" ? input.data.market : null,
          channel: typeof input.data.channel === "string" ? input.data.channel : null,
          sampleSize: 1,
        },
      });

      return { success: true, source: input.source, nodesCreated: 1, entryId: entry.id };
    }),
});
