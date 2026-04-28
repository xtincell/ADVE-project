import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "messaging");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

const CHANNELS = ["INTERNAL", "INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "DISCORD"] as const;

export const messagingRouter = createTRPCRouter({
  // ── Get current user info ─────────────────────────────────────────────
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.session.user.id,
    name: ctx.session.user.name ?? ctx.session.user.email ?? "Unknown",
    role: ctx.session.user.role,
  })),

  // ── List conversations with optional filters ──────────────────────────
  listConversations: protectedProcedure
    .input(
      z.object({
        channel: z.enum(CHANNELS).optional(),
        strategyId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.ConversationWhereInput = {
        status: input?.status ?? "ACTIVE",
      };
      if (input?.channel) where.channel = input.channel;
      if (input?.strategyId) where.strategyId = input.strategyId;

      return ctx.db.conversation.findMany({
        where,
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        include: {
          _count: { select: { messages: true } },
        },
      });
    }),

  // ── Get conversation with last 50 messages ────────────────────────────
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findUniqueOrThrow({
        where: { id: input.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
          },
        },
      });
      return conversation;
    }),

  // ── Send a message ────────────────────────────────────────────────────
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const message = await ctx.db.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: user.id,
          senderName: user.name ?? user.email ?? "Unknown",
          content: input.content,
          channel: "INTERNAL",
        },
      });

      // Update conversation metadata
      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: {
          lastMessage: input.content.length > 120
            ? input.content.slice(0, 120) + "..."
            : input.content,
          lastMessageAt: new Date(),
        },
      });

      return message;
    }),

  // ── Mark all messages read in a conversation ──────────────────────────
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.message.updateMany({
        where: {
          conversationId: input.conversationId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { unreadCount: 0 },
      });

      return { success: true };
    }),

  // ── Create a new conversation ─────────────────────────────────────────
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        participants: z.array(
          z.object({
            userId: z.string(),
            name: z.string(),
            role: z.string().optional(),
          }),
        ),
        channel: z.enum(CHANNELS).optional(),
        strategyId: z.string().optional(),
        missionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.conversation.create({
        data: {
          title: input.title,
          channel: input.channel ?? "INTERNAL",
          strategyId: input.strategyId,
          missionId: input.missionId,
          participants: input.participants as Prisma.InputJsonValue,
          status: "ACTIVE",
        },
      });
    }),

  // ── Get total unread count ────────────────────────────────────────────
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.conversation.aggregate({
      _sum: { unreadCount: true },
      where: { status: "ACTIVE" },
    });
    return result._sum.unreadCount ?? 0;
  }),

  // ── Seed demo data (idempotent) ───────────────────────────────────────
  seedDemo: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if demo data already exists
    const existing = await ctx.db.conversation.findFirst({
      where: { title: "Equipe Creative - CIMENCAM" },
    });
    if (existing) return { seeded: false, message: "Demo data already exists" };

    const now = new Date();
    const userId = ctx.session.user.id;
    const userName = ctx.session.user.name ?? "Vous";

    // Conversation 1: Internal team chat
    const conv1 = await ctx.db.conversation.create({
      data: {
        title: "Equipe Creative - CIMENCAM",
        channel: "INTERNAL",
        participants: [
          { userId, name: userName, role: "Client" },
          { userId: "demo-fixer-1", name: "Amina B.", role: "Fixer principal" },
          { userId: "demo-creator-1", name: "Paul E.", role: "Createur" },
        ] as unknown as Prisma.InputJsonValue,
        lastMessage: "Les maquettes sont pretes pour validation.",
        lastMessageAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        unreadCount: 2,
        status: "ACTIVE",
      },
    });

    await ctx.db.message.createMany({
      data: [
        {
          conversationId: conv1.id,
          senderId: "demo-fixer-1",
          senderName: "Amina B.",
          content: "Bonjour ! Les maquettes de la campagne social media sont en cours de finalisation.",
          channel: "INTERNAL",
          createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        },
        {
          conversationId: conv1.id,
          senderId: userId,
          senderName: userName,
          content: "Super, quand est-ce que nous pourrons les voir ?",
          channel: "INTERNAL",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 4.5 * 60 * 60 * 1000),
        },
        {
          conversationId: conv1.id,
          senderId: "demo-creator-1",
          senderName: "Paul E.",
          content: "Je finalise les derniers visuels ce matin. Tout sera pret avant midi.",
          channel: "INTERNAL",
          createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        },
        {
          conversationId: conv1.id,
          senderId: "demo-fixer-1",
          senderName: "Amina B.",
          content: "Les maquettes sont pretes pour validation. Je vous envoie le lien vers le dossier partage.",
          channel: "INTERNAL",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        {
          conversationId: conv1.id,
          senderId: "demo-fixer-1",
          senderName: "Amina B.",
          content: "N'hesitez pas a laisser vos commentaires directement sur les fichiers.",
          channel: "INTERNAL",
          createdAt: new Date(now.getTime() - 1.9 * 60 * 60 * 1000),
        },
      ],
    });

    // Conversation 2: Instagram DMs
    const conv2 = await ctx.db.conversation.create({
      data: {
        title: "DM Instagram - @marie_lifestyle",
        channel: "INSTAGRAM",
        participants: [
          { userId: "demo-ig-user-1", name: "Marie Lifestyle", role: "Influenceuse" },
        ] as unknown as Prisma.InputJsonValue,
        lastMessage: "Je serai ravie de collaborer ! Envoyez-moi le brief.",
        lastMessageAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        unreadCount: 1,
        status: "ACTIVE",
      },
    });

    await ctx.db.message.createMany({
      data: [
        {
          conversationId: conv2.id,
          senderId: userId,
          senderName: userName,
          content: "Bonjour Marie ! Nous aimerions collaborer avec vous pour notre campagne CIMENCAM.",
          channel: "INSTAGRAM",
          externalId: "ig_msg_001",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          conversationId: conv2.id,
          senderId: "demo-ig-user-1",
          senderName: "Marie Lifestyle",
          senderAvatar: "https://i.pravatar.cc/40?u=marie",
          content: "Bonjour ! Merci pour votre message. De quoi s'agit-il exactement ?",
          channel: "INSTAGRAM",
          externalId: "ig_msg_002",
          createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        },
        {
          conversationId: conv2.id,
          senderId: userId,
          senderName: userName,
          content: "Nous preparons une serie de contenus lifestyle autour du ciment decoratif. Budget interessant et creative freedom totale.",
          channel: "INSTAGRAM",
          externalId: "ig_msg_003",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        },
        {
          conversationId: conv2.id,
          senderId: "demo-ig-user-1",
          senderName: "Marie Lifestyle",
          senderAvatar: "https://i.pravatar.cc/40?u=marie",
          content: "Je serai ravie de collaborer ! Envoyez-moi le brief.",
          channel: "INSTAGRAM",
          externalId: "ig_msg_004",
          createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        },
      ],
    });

    // Conversation 3: WhatsApp group
    const conv3 = await ctx.db.conversation.create({
      data: {
        title: "WhatsApp - Equipe Terrain Douala",
        channel: "WHATSAPP",
        participants: [
          { userId: "demo-wa-1", name: "Roger K.", role: "Coordinateur" },
          { userId: "demo-wa-2", name: "Sandra T.", role: "Photographe" },
          { userId: "demo-wa-3", name: "Yves M.", role: "Logistique" },
        ] as unknown as Prisma.InputJsonValue,
        lastMessage: "Tout est pret pour le shooting de demain a Akwa.",
        lastMessageAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        unreadCount: 0,
        status: "ACTIVE",
      },
    });

    await ctx.db.message.createMany({
      data: [
        {
          conversationId: conv3.id,
          senderId: "demo-wa-1",
          senderName: "Roger K.",
          content: "Salut tout le monde ! Confirmation pour le shooting de demain a Akwa ?",
          channel: "WHATSAPP",
          externalId: "wa_msg_001",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 16 * 60 * 60 * 1000),
        },
        {
          conversationId: conv3.id,
          senderId: "demo-wa-2",
          senderName: "Sandra T.",
          content: "Confirme ! J'apporte le materiel photo + eclairage studio.",
          channel: "WHATSAPP",
          externalId: "wa_msg_002",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 15 * 60 * 60 * 1000),
        },
        {
          conversationId: conv3.id,
          senderId: "demo-wa-3",
          senderName: "Yves M.",
          content: "Le transport est organise. Pick-up a 7h30 devant le bureau.",
          channel: "WHATSAPP",
          externalId: "wa_msg_003",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 14 * 60 * 60 * 1000),
        },
        {
          conversationId: conv3.id,
          senderId: "demo-wa-1",
          senderName: "Roger K.",
          content: "Parfait. Le client sera la a 9h. N'oubliez pas les echantillons produit.",
          channel: "WHATSAPP",
          externalId: "wa_msg_004",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 13 * 60 * 60 * 1000),
        },
        {
          conversationId: conv3.id,
          senderId: "demo-wa-1",
          senderName: "Roger K.",
          content: "Tout est pret pour le shooting de demain a Akwa.",
          channel: "WHATSAPP",
          externalId: "wa_msg_005",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        },
      ],
    });

    // Conversation 4: Facebook Messenger
    const conv4 = await ctx.db.conversation.create({
      data: {
        title: "FB - Page CIMENCAM Officielle",
        channel: "FACEBOOK",
        participants: [
          { userId: "demo-fb-user-1", name: "Client Facebook", role: "Prospect" },
        ] as unknown as Prisma.InputJsonValue,
        lastMessage: "Merci pour l'info ! Je vais visiter votre showroom samedi.",
        lastMessageAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        unreadCount: 0,
        status: "ACTIVE",
      },
    });

    await ctx.db.message.createMany({
      data: [
        {
          conversationId: conv4.id,
          senderId: "demo-fb-user-1",
          senderName: "Client Facebook",
          content: "Bonjour, est-ce que vous avez du ciment decoratif en stock ?",
          channel: "FACEBOOK",
          externalId: "fb_msg_001",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
        },
        {
          conversationId: conv4.id,
          senderId: userId,
          senderName: userName,
          content: "Bonjour ! Oui, nous avons toute la gamme disponible. Vous pouvez visiter notre showroom a Bonapriso.",
          channel: "FACEBOOK",
          externalId: "fb_msg_002",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 49 * 60 * 60 * 1000),
        },
        {
          conversationId: conv4.id,
          senderId: "demo-fb-user-1",
          senderName: "Client Facebook",
          content: "Merci pour l'info ! Je vais visiter votre showroom samedi.",
          channel: "FACEBOOK",
          externalId: "fb_msg_003",
          readAt: new Date(),
          createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        },
      ],
    });

    return { seeded: true, message: "4 demo conversations created" };
  }),
});
