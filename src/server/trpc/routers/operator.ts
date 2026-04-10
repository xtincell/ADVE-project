import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const operatorRouter = createTRPCRouter({
  getOwn: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      include: { operator: true },
    });
    return user.operator;
  }),

  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.operator.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, strategies: true, clients: true } },
        parent: { select: { id: true, name: true } },
      },
    });
  }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.operator.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          _count: { select: { users: true, strategies: true, clients: true } },
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true, agencyType: true, status: true } },
          clientAllocations: {
            include: { client: { select: { id: true, name: true } } },
          },
        },
      });
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
      licenseType: z.enum(["OWNER", "LICENSED", "TRIAL"]),
      agencyType: z.enum(["HOLDING", "COMMUNICATION", "RELATIONS_PUBLIQUES", "MEDIA_BUYING", "DIGITAL", "EVENEMENTIEL", "PRODUCTION", "CUSTOM"]).optional(),
      specializations: z.array(z.string()).optional(),
      parentId: z.string().optional(),
      maxBrands: z.number().min(1).optional(),
      commissionRate: z.number().min(0).max(1).optional(),
      licenseDurationDays: z.number().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const expiryDays = input.licenseDurationDays ?? (input.licenseType === "TRIAL" ? 30 : 365);
      const expiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

      return ctx.db.operator.create({
        data: {
          name: input.name,
          slug: input.slug,
          status: "ACTIVE",
          licenseType: input.licenseType,
          licensedAt: now,
          licenseExpiry: expiry,
          agencyType: input.agencyType ?? "COMMUNICATION",
          specializations: input.specializations ?? [],
          parentId: input.parentId ?? null,
          maxBrands: input.maxBrands ?? 50,
          commissionRate: input.commissionRate ?? 0.10,
        },
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      maxBrands: z.number().optional(),
      commissionRate: z.number().min(0).max(1).optional(),
      branding: z.record(z.unknown()).optional(),
      agencyType: z.enum(["HOLDING", "COMMUNICATION", "RELATIONS_PUBLIQUES", "MEDIA_BUYING", "DIGITAL", "EVENEMENTIEL", "PRODUCTION", "CUSTOM"]).optional(),
      specializations: z.array(z.string()).optional(),
      status: z.enum(["ACTIVE", "SUSPENDED", "CHURNED"]).optional(),
      parentId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) data[k] = k === "branding" ? (v as Prisma.InputJsonValue) : v;
      }
      return ctx.db.operator.update({ where: { id }, data });
    }),

  suspend: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.operator.update({ where: { id: input.id }, data: { status: "SUSPENDED" } });
    }),

  reactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.operator.update({ where: { id: input.id }, data: { status: "ACTIVE" } });
    }),

  getStats: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [userCount, strategyCount, clientCount, allocationCount] = await Promise.all([
        ctx.db.user.count({ where: { operatorId: input.id } }),
        ctx.db.strategy.count({ where: { operatorId: input.id } }),
        ctx.db.client.count({ where: { operatorId: input.id } }),
        ctx.db.clientAllocation.count({ where: { operatorId: input.id } }),
      ]);
      return { userCount, strategyCount, clientCount, allocationCount };
    }),

  // Allocate a client to an operator (multi-agency)
  allocateClient: adminProcedure
    .input(z.object({
      clientId: z.string(),
      operatorId: z.string(),
      role: z.enum(["LEAD", "SUPPORT", "SPECIALIST"]).optional(),
      scope: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientAllocation.upsert({
        where: { clientId_operatorId: { clientId: input.clientId, operatorId: input.operatorId } },
        update: { role: input.role ?? "SUPPORT", scope: input.scope ?? [] },
        create: {
          clientId: input.clientId,
          operatorId: input.operatorId,
          role: input.role ?? "LEAD",
          scope: input.scope ?? [],
        },
      });
    }),

  deallocateClient: adminProcedure
    .input(z.object({ clientId: z.string(), operatorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientAllocation.delete({
        where: { clientId_operatorId: { clientId: input.clientId, operatorId: input.operatorId } },
      });
    }),
});
