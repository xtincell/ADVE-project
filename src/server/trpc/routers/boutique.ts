/**
 * Boutique Router — Items catalog, orders
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

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

  createItem: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number(),
      currency: z.string().optional(),
      imageUrl: z.string().optional(),
      category: z.string(),
      stock: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.boutiqueItem.create({ data: input });
    }),

  updateItem: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional(),
      category: z.string().optional(),
      stock: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.boutiqueItem.update({ where: { id }, data });
    }),

  order: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      quantity: z.number().min(1).optional(),
      shippingAddress: z.string().optional(),
    }))
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

  updateOrderStatus: adminProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.string(),
      paidAt: z.date().optional(),
      shippedAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { orderId, ...data } = input;
      return ctx.db.boutiqueOrder.update({ where: { id: orderId }, data });
    }),
});
