import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const deliverableTrackingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      deliverableId: z.string(),
      expectedSignals: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deliverableTracking.create({
        data: {
          deliverableId: input.deliverableId,
          expectedSignals: (input.expectedSignals ?? {}) as Prisma.InputJsonValue,
          status: "AWAITING_SIGNALS",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }),

  addSignal: protectedProcedure
    .input(z.object({
      trackingId: z.string(),
      signal: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const tracking = await ctx.db.deliverableTracking.findUniqueOrThrow({
        where: { id: input.trackingId },
      });
      const receivedSignals = Array.isArray(tracking.receivedSignals) ? tracking.receivedSignals : [];
      receivedSignals.push(input.signal as unknown as Prisma.JsonValue);
      return ctx.db.deliverableTracking.update({
        where: { id: input.trackingId },
        data: { receivedSignals: receivedSignals as Prisma.InputJsonValue, status: "PARTIAL" },
      });
    }),

  getByDeliverable: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deliverableTracking.findMany({
        where: { deliverableId: input.deliverableId },
      });
    }),

  getImpact: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const trackings = await ctx.db.deliverableTracking.findMany({
        where: { deliverableId: input.deliverableId },
      });
      const totalSignals = trackings.reduce((sum, t) => {
        const received = Array.isArray(t.receivedSignals) ? t.receivedSignals : [];
        return sum + received.length;
      }, 0);
      return {
        deliverableId: input.deliverableId,
        trackingCount: trackings.length,
        totalSignals,
      };
    }),

  expire: adminProcedure
    .input(z.object({ trackingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deliverableTracking.update({
        where: { id: input.trackingId },
        data: { status: "EXPIRED" },
      });
    }),
});
