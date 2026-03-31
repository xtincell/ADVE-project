import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const interventionRouter = createTRPCRouter({
  // Create an intervention request (client-facing)
  create: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      title: z.string(),
      description: z.string(),
      urgency: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      type: z.enum(["one_off", "recurring", "emergency"]).default("one_off"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Store as a special Signal
      return ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "INTERVENTION_REQUEST",
          data: {
            title: input.title,
            description: input.description,
            urgency: input.urgency,
            requestType: input.type,
            requestedBy: ctx.session.user.id,
            requestedAt: new Date().toISOString(),
            status: "PENDING",
          } as Prisma.InputJsonValue,
        },
      });
    }),

  // List intervention requests
  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findMany({
        where: {
          type: "INTERVENTION_REQUEST",
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Convert intervention request to a Mission
  convertToMission: adminProcedure
    .input(z.object({
      signalId: z.string(),
      driverId: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).default("DISPATCH"),
    }))
    .mutation(async ({ ctx, input }) => {
      const signal = await ctx.db.signal.findUniqueOrThrow({
        where: { id: input.signalId },
        include: { strategy: true },
      });

      const data = signal.data as Record<string, unknown>;
      if (data.status !== "PENDING") {
        throw new Error("Intervention already processed");
      }

      // Create Mission from intervention
      const mission = await ctx.db.mission.create({
        data: {
          title: (data.title as string) ?? "Intervention",
          strategyId: signal.strategyId,
          driverId: input.driverId,
          mode: input.mode,
          status: "DRAFT",
          advertis_vector: signal.strategy.advertis_vector ?? undefined,
        },
      });

      // Update signal status
      await ctx.db.signal.update({
        where: { id: input.signalId },
        data: {
          data: {
            ...data,
            status: "CONVERTED",
            missionId: mission.id,
            convertedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return mission;
    }),

  // Dismiss an intervention request
  dismiss: adminProcedure
    .input(z.object({ signalId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const signal = await ctx.db.signal.findUniqueOrThrow({ where: { id: input.signalId } });
      const data = signal.data as Record<string, unknown>;

      return ctx.db.signal.update({
        where: { id: input.signalId },
        data: {
          data: {
            ...data,
            status: "DISMISSED",
            dismissReason: input.reason,
            dismissedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }),
});
