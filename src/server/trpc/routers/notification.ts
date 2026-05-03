/**
 * Notification Router — User notifications, preferences, push subscriptions.
 *
 * Étendu Phase 16 (ADR-0025) avec :
 *   - registerPush / unregisterPush (Web Push subscriptions)
 *   - testPush (envoie une notif test au user courant via Anubis)
 *   - vapidPublicKey (expose la clé VAPID public à la UI pour Subscribe API)
 *
 * Note real-time : la subscription tRPC SSE est servie via /api/notifications/stream
 * (route Next.js) qui se branche directement sur le NSP broker. Pas exposé en
 * `protectedProcedure.subscription` ici pour éviter le requirement WebSocket
 * link tRPC (httpSubscriptionLink suffirait mais reste à brancher dans le
 * client tRPC ; le canal HTTP/SSE direct est plus simple).
 */

import { z } from "zod";
import { NotificationChannel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";
import * as anubis from "@/server/services/anubis";
const auditedProtected = auditedProcedure(protectedProcedure, "notification");
const auditedAdmin = auditedProcedure(adminProcedure, "notification");
/* lafusee:strangler-active */

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

  markRead: auditedProtected
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  markAllRead: auditedProtected.mutation(async ({ ctx }) => {
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

  updatePreferences: auditedProtected
    .input(z.object({
      channels: z.record(z.string(), z.boolean()),
      quiet: z.record(z.string(), z.unknown()).optional(),
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

  create: auditedAdmin
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

  // ── Real-time + push extension (ADR-0025) ───────────────────────

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { userId: ctx.session.user.id, isRead: false },
    });
    return { count };
  }),

  registerPush: auditedProtected
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return anubis.registerPushSubscription({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  unregisterPush: auditedProtected
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.pushSubscription.findUnique({
        where: { endpoint: input.endpoint },
      });
      if (!sub || sub.userId !== ctx.session.user.id) {
        return { unregistered: false };
      }
      await ctx.db.pushSubscription.update({
        where: { endpoint: input.endpoint },
        data: { isActive: false },
      });
      return { unregistered: true };
    }),

  listPushSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.pushSubscription.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  testPush: auditedProtected.mutation(async ({ ctx }) => {
    return anubis.pushNotification({
      userId: ctx.session.user.id,
      type: "SYSTEM",
      priority: "NORMAL",
      title: "Test notification La Fusée",
      body: "Si tu vois ce message, le système temps-réel fonctionne.",
      channels: ["IN_APP", "PUSH"],
    });
  }),
});
