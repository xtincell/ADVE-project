/**
 * Events Router — Event CRUD, registration, attendance
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const eventRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      eventType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.event.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.eventType ? { eventType: input.eventType } : {}),
        },
        include: { registrations: { select: { id: true, status: true } } },
        orderBy: { startDate: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.event.findUniqueOrThrow({
        where: { id: input.id },
        include: { registrations: true },
      });
    }),

  create: governedProcedure({


    kind: "LEGACY_EVENT_CREATE",


    inputSchema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      eventType: z.string(),
      location: z.string().optional(),
      isOnline: z.boolean().optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
      capacity: z.number().optional(),
      imageUrl: z.string().optional(),
    }),


    caller: "event:create",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.event.create({ data: input });
    }),

  register: governedProcedure({


    kind: "LEGACY_EVENT_REGISTER",


    inputSchema: z.object({ eventId: z.string() }),


    caller: "event:register",


  })
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.eventRegistration.create({
        data: { eventId: input.eventId, userId },
      });
    }),

  unregister: governedProcedure({


    kind: "LEGACY_EVENT_UNREGISTER",


    inputSchema: z.object({ eventId: z.string() }),


    caller: "event:unregister",


  })
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.eventRegistration.updateMany({
        where: { eventId: input.eventId, userId },
        data: { status: "CANCELLED" },
      });
    }),

  markAttended: governedProcedure({


    kind: "LEGACY_EVENT_MARK_ATTENDED",


    inputSchema: z.object({ registrationId: z.string() }),


    caller: "event:markAttended",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.eventRegistration.update({
        where: { id: input.registrationId },
        data: { attendedAt: new Date() },
      });
    }),
});
