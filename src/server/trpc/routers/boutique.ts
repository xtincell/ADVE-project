/**
 * Boutique Router — Items catalog, orders
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

// Catalogue + statut de commande = gestion STAFF (audit round-6 : tout compte
// authentifié injectait des articles, réécrivait un prix → 0, ou marquait
// n'importe quelle commande payée/expédiée). `order`/`myOrders` restent
// self-scopés (commande de l'utilisateur courant).
export const boutiqueRouter = createTRPCRouter({
  listItems: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.boutiqueItem.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : { isActive: true }),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.boutiqueItem.findUniqueOrThrow({ where: { id: input.id } });
    }),

  createItem: governedProcedure({


    kind: "LEGACY_BOUTIQUE_CREATE_ITEM",
    requireOperator: true,


    inputSchema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number(),
      currency: z.string().optional(),
      imageUrl: z.string().optional(),
      category: z.string(),
      stock: z.number().optional(),
    }),


    caller: "boutique:createItem",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.boutiqueItem.create({ data: input });
    }),

  updateItem: governedProcedure({


    kind: "LEGACY_BOUTIQUE_UPDATE_ITEM",
    requireOperator: true,


    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional(),
      category: z.string().optional(),
      stock: z.number().optional(),
      isActive: z.boolean().optional(),
    }),


    caller: "boutique:updateItem",


  })
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.boutiqueItem.update({ where: { id }, data });
    }),

  order: governedProcedure({


    kind: "LEGACY_BOUTIQUE_ORDER",


    inputSchema: z.object({
      itemId: z.string(),
      quantity: z.number().min(1).optional(),
      shippingAddress: z.string().optional(),
    }),


    caller: "boutique:order",


  })
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const item = await ctx.db.boutiqueItem.findUniqueOrThrow({ where: { id: input.itemId } });
      const quantity = input.quantity ?? 1;
      return ctx.db.boutiqueOrder.create({
        data: {
          userId,
          itemId: input.itemId,
          quantity,
          amount: item.price * quantity,
          currency: item.currency,
          shippingAddress: input.shippingAddress,
        },
      });
    }),

  myOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.boutiqueOrder.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  updateOrderStatus: governedProcedure({


    kind: "LEGACY_BOUTIQUE_UPDATE_ORDER_STATUS",
    requireOperator: true,


    inputSchema: z.object({
      orderId: z.string(),
      status: z.string(),
      paidAt: z.date().optional(),
      shippedAt: z.date().optional(),
    }),


    caller: "boutique:updateOrderStatus",


  })
    .mutation(async ({ ctx, input }) => {
      const { orderId, ...data } = input;
      return ctx.db.boutiqueOrder.update({ where: { id: orderId }, data });
    }),
});
