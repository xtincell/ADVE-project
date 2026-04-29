/**
 * Events Router — Event CRUD, registration, attendance
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "event");
const auditedAdmin = auditedProcedure(adminProcedure, "event");
/* lafusee:strangler-active */

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

  create: auditedAdmin
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      eventType: z.string(),
      location: z.string().optional(),
      isOnline: z.boolean().optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
      capacity: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.event.create({ data: input });
    }),

  register: auditedProtected
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.eventRegistration.create({
        data: { eventId: input.eventId, userId },
      });
    }),

  unregister: auditedProtected
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.eventRegistration.updateMany({
        where: { eventId: input.eventId, userId },
        data: { status: "CANCELLED" },
      });
    }),

  markAttended: auditedAdmin
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.eventRegistration.update({
        where: { id: input.registrationId },
        data: { attendedAt: new Date() },
      });
    }),
});
