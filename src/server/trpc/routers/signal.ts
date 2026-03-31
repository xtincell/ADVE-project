import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { processSignal, detectStrategyDrift } from "@/server/services/feedback-loop";

export const signalRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      type: z.string(),
      data: z.record(z.unknown()).optional(),
      advertis_vector: z.record(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, advertis_vector, ...rest } = input;
      const signal = await ctx.db.signal.create({
        data: {
          ...rest,
          data: data as Prisma.InputJsonValue,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
        },
      });

      // Process through feedback loop to detect drift and trigger diagnostics
      let feedbackAlerts: Awaited<ReturnType<typeof processSignal>> = [];
      try {
        feedbackAlerts = await processSignal(signal.id);
      } catch {
        // Feedback loop errors should not block signal creation
      }

      return { signal, feedbackAlerts };
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      type: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findUniqueOrThrow({
        where: { id: input.id },
        include: { strategy: true },
      });
    }),

  // Check drift status for a specific pillar on a strategy
  checkDrift: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.enum(["a", "d", "v", "e", "r", "t", "i", "s"]),
    }))
    .query(async ({ input }) => {
      try {
        return await detectStrategyDrift(input.strategyId, input.pillarKey);
      } catch (error) {
        throw new Error(
          `Failed to detect drift for pillar ${input.pillarKey}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Replay a signal through the feedback loop (re-process)
  reprocess: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const alerts = await processSignal(input.signalId);
        return { signalId: input.signalId, alerts };
      } catch (error) {
        throw new Error(
          `Failed to reprocess signal ${input.signalId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),
});
