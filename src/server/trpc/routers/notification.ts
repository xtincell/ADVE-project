/**
 * Notification Router — User notifications, preferences
 */

import { z } from "zod";
import { NotificationChannel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ isRead: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.isRead !== undefined ? { isRead: input.isRead } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.notification.updateMany({
      where: { userId: ctx.session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notificationPreference.findUnique({
      where: { userId: ctx.session.user.id },
    });
  }),

  updatePreferences: protectedProcedure
    .input(z.object({
      channels: z.record(z.boolean()),
      quiet: z.record(z.unknown()).optional(),
      digestFrequency: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.notificationPreference.upsert({
        where: { userId },
        create: {
          userId,
          channels: input.channels as Prisma.InputJsonValue,
          quiet: input.quiet as Prisma.InputJsonValue,
          digestFrequency: input.digestFrequency ?? "INSTANT",
        },
        update: {
          channels: input.channels as Prisma.InputJsonValue,
          ...(input.quiet ? { quiet: input.quiet as Prisma.InputJsonValue } : {}),
          ...(input.digestFrequency ? { digestFrequency: input.digestFrequency } : {}),
        },
      });
    }),

  create: adminProcedure
    .input(z.object({
      userId: z.string(),
      channel: z.nativeEnum(NotificationChannel).optional(),
      title: z.string(),
      body: z.string(),
      link: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.create({ data: input });
    }),
});
