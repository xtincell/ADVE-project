import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import * as quickIntakeService from "@/server/services/quick-intake";

export const quickIntakeRouter = createTRPCRouter({
  start: publicProcedure
    .input(z.object({
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      companyName: z.string().min(1),
      sector: z.string().optional(),
      country: z.string().optional(),
      businessModel: z.string().optional(),
      economicModel: z.string().optional(),
      positioning: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return quickIntakeService.start(input);
    }),

  advance: publicProcedure
    .input(z.object({
      token: z.string(),
      responses: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      return quickIntakeService.advance(input);
    }),

  complete: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      return quickIntakeService.complete(input.token);
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
    }),

  convert: adminProcedure
    .input(z.object({ intakeId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUniqueOrThrow({
        where: { id: input.intakeId },
      });
      if (intake.status !== "COMPLETED") {
        throw new Error("Intake must be completed before conversion");
      }

      // Retrieve businessContext from the temporary strategy if it exists
      let businessContext = undefined;
      if (intake.convertedToId) {
        const tempStrategy = await ctx.db.strategy.findUnique({
          where: { id: intake.convertedToId },
          select: { businessContext: true },
        });
        businessContext = tempStrategy?.businessContext ?? undefined;
      }

      // Create Strategy (Brand Instance) from intake data
      const strategy = await ctx.db.strategy.create({
        data: {
          name: intake.companyName,
          description: `Converti depuis Quick Intake le ${new Date().toLocaleDateString("fr-FR")}`,
          userId: input.userId,
          operatorId: (await ctx.db.user.findUniqueOrThrow({ where: { id: input.userId } })).operatorId,
          status: "ACTIVE",
          advertis_vector: intake.advertis_vector ?? undefined,
          businessContext: businessContext ?? undefined,
        },
      });

      // Create pillars from intake responses if available
      if (intake.advertis_vector) {
        const vector = intake.advertis_vector as Record<string, number>;

        // Get content from temporary strategy pillars or from responses
        const tempStrategyId = intake.convertedToId;
        let pillarContents: Record<string, unknown> = {};

        if (tempStrategyId) {
          const tempPillars = await ctx.db.pillar.findMany({
            where: { strategyId: tempStrategyId },
          });
          for (const p of tempPillars) {
            pillarContents[p.key] = p.content;
          }
        }

        // Fall back to responses if no temp pillars
        const responses = intake.responses as Record<string, unknown> | null;

        for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
          const content = pillarContents[key] ?? responses?.[key] ?? {};
          await ctx.db.pillar.create({
            data: {
              strategyId: strategy.id,
              key,
              content: content as Prisma.InputJsonValue,
              confidence: (vector.confidence ?? 0.4) * 0.8, // Lower confidence from Quick Intake
            },
          });
        }
      }

      // Update intake with conversion reference
      await ctx.db.quickIntake.update({
        where: { id: input.intakeId },
        data: {
          status: "CONVERTED",
          convertedToId: strategy.id,
        },
      });

      // Capture knowledge event
      await ctx.db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          sector: intake.sector,
          market: intake.country,
          data: {
            type: "quick_intake_conversion",
            intakeId: intake.id,
            strategyId: strategy.id,
            classification: intake.classification,
          } as Prisma.InputJsonValue,
          sourceHash: `intake-${intake.id}`,
        },
      });

      return strategy;
    }),

  listAll: adminProcedure
    .input(z.object({
      status: z.enum(["IN_PROGRESS", "COMPLETED", "CONVERTED", "EXPIRED"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.quickIntake.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),
});
