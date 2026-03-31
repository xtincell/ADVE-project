import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const marketStudyRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      title: z.string(),
      sector: z.string().optional(),
      market: z.string().optional(),
      findings: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { findings, ...rest } = input;

      // Store study as a BrandAsset
      const asset = await ctx.db.brandAsset.create({
        data: {
          strategyId: input.strategyId,
          name: `Market Study: ${input.title}`,
          pillarTags: {
            type: "market_study",
            ...rest,
            findings,
          } as Prisma.InputJsonValue,
        },
      });

      // On completion → create KnowledgeEntry (SECTOR_BENCHMARK)
      await ctx.db.knowledgeEntry.create({
        data: {
          entryType: "SECTOR_BENCHMARK",
          sector: input.sector,
          market: input.market,
          data: {
            studyTitle: input.title,
            strategyId: input.strategyId,
            findings,
            completedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          sourceHash: `study-${asset.id}`,
        },
      });

      return asset;
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      sector: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.knowledgeEntry.findMany({
        where: {
          entryType: "SECTOR_BENCHMARK",
          ...(input.sector ? { sector: input.sector } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }),

  getBenchmarks: protectedProcedure
    .input(z.object({ sector: z.string(), market: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.knowledgeEntry.findMany({
        where: {
          entryType: "SECTOR_BENCHMARK",
          sector: input.sector,
          ...(input.market ? { market: input.market } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
