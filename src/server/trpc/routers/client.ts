// ============================================================================
// MODULE M05b — Client Router (Multi-tenant entity management)
// Spec: Plan Phase 3.1 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS:
// [x] REQ-1  create — creates a Client linked to an Operator
// [x] REQ-2  update — updates client info (name, contact, sector, etc.)
// [x] REQ-3  get — single client with its brands (strategies)
// [x] REQ-4  list — list clients scoped by operator, with search/filter
// [x] REQ-5  delete — soft-delete (ARCHIVED)
// [x] REQ-6  addBrand — creates a Strategy linked to the Client
//
// PROCEDURES: create, update, get, list, delete, addBrand
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { scopeClients, canAccessClient } from "@/server/services/operator-isolation";
import * as auditTrail from "@/server/services/audit-trail";

export const clientRouter = createTRPCRouter({
  create: operatorProcedure
    .input(z.object({
      name: z.string().min(1),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      operatorId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const operatorId = ctx.session.user.role === "ADMIN" && input.operatorId
        ? input.operatorId
        : userOperatorId;

      if (!operatorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun opérateur associé" });
      }

      const client = await ctx.db.client.create({
        data: {
          name: input.name,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          sector: input.sector,
          country: input.country,
          notes: input.notes,
          operatorId,
        },
      });

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Client",
        entityId: client.id,
        newValue: { name: input.name, sector: input.sector },
      }).catch((err) => { console.warn("[audit-trail] client create log failed:", err instanceof Error ? err.message : err); });

      return client;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["ACTIVE", "PROSPECT", "ARCHIVED"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.id, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const { id, ...data } = input;
      const previous = await ctx.db.client.findUniqueOrThrow({ where: { id } });
      const updated = await ctx.db.client.update({ where: { id }, data });

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Client",
        entityId: id,
        oldValue: { name: previous.name, status: previous.status },
        newValue: data,
      }).catch((err) => { console.warn("[audit-trail] client update log failed:", err instanceof Error ? err.message : err); });

      return updated;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.id, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      return ctx.db.client.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          strategies: {
            include: { pillars: true },
            orderBy: { updatedAt: "desc" },
          },
          operator: { select: { id: true, name: true } },
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      operatorId: z.string().optional(),
      status: z.enum(["ACTIVE", "PROSPECT", "ARCHIVED"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role ?? "USER";
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const operatorScope = scopeClients({ operatorId: userOperatorId, userId: ctx.session.user.id, role: userRole });

      const where: Prisma.ClientWhereInput = {
        ...operatorScope,
        ...(input.operatorId && userRole === "ADMIN" ? { operatorId: input.operatorId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.search ? { name: { contains: input.search, mode: "insensitive" as const } } : {}),
      };

      const items = await ctx.db.client.findMany({
        where,
        include: {
          strategies: {
            select: {
              id: true,
              name: true,
              status: true,
              advertis_vector: true,
              updatedAt: true,
            },
          },
          operator: { select: { id: true, name: true } },
          _count: { select: { strategies: true } },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.id, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const result = await ctx.db.client.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "DELETE",
        entityType: "Client",
        entityId: input.id,
        newValue: { status: "ARCHIVED" },
      }).catch((err) => { console.warn("[audit-trail] client delete log failed:", err instanceof Error ? err.message : err); });

      return result;
    }),

  addBrand: operatorProcedure
    .input(z.object({
      clientId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.clientId, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const client = await ctx.db.client.findUniqueOrThrow({ where: { id: input.clientId } });

      const strategy = await ctx.db.strategy.create({
        data: {
          name: input.name,
          description: input.description,
          userId: ctx.session.user.id,
          operatorId: client.operatorId,
          clientId: client.id,
        },
      });

      // Auto-create 8 empty pillars
      for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
        await ctx.db.pillar.create({
          data: { strategyId: strategy.id, key, content: {}, confidence: 0 },
        });
      }

      // Auto-create VariableStoreConfig
      await ctx.db.variableStoreConfig.create({
        data: { strategyId: strategy.id, stalenessThresholdDays: 30, autoRecalculate: true },
      }).catch((err) => { console.warn("[client.addBrand] variable-store config creation failed:", err instanceof Error ? err.message : err); });

      // Auto-create BrandOSConfig
      await ctx.db.brandOSConfig.create({
        data: { strategyId: strategy.id, config: { currency: "XAF", language: "fr" } },
      }).catch((err) => { console.warn("[client.addBrand] brandOS config creation failed:", err instanceof Error ? err.message : err); });

      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Strategy",
        entityId: strategy.id,
        newValue: { name: input.name, clientId: input.clientId },
      }).catch((err) => { console.warn("[audit-trail] addBrand log failed:", err instanceof Error ? err.message : err); });

      return strategy;
    }),

  // Chantier 8 — P&L par client
  getPnL: operatorProcedure
    .input(z.object({
      clientId: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { getClientPnL } = await import("@/server/services/financial-reconciliation");
      const from = input.from ? new Date(input.from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const to = input.to ? new Date(input.to) : new Date();
      return getClientPnL(input.clientId, from, to);
    }),
});
