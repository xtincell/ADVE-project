


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

import { ClientStatus, organizationFields } from "@/domain/client-organization";
import { writeClientOrganization } from "@/server/services/client-organization";
import { MarketScaleSchema } from "@/domain";
import { resolveSessionUserId } from "../resolve-session-user";
import { seedStrategy } from "@/server/services/strategy-bootstrap";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { classifyCanonicalSector } from "@/domain/sector-taxonomy";
import { scopeClients, canAccessClient } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { found } from "../entity-access";
/* lafusee:governed-active */

/** IN1 : un client inconnu reçoit 404 typé, jamais P2025 ni un message Prisma. */
const CLIENT_NOT_FOUND = "Client introuvable.";

export const clientRouter = createTRPCRouter({
  create: governedProcedure({
    kind: "LEGACY_CLIENT_CREATE", requireOperator: true, caller: "client:create",
    inputSchema: z.object({
      name: z.string().min(1),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      operatorId: z.string().optional(),
      status: ClientStatus.optional(),
      ...organizationFields,
    }),
  })
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const operatorId = ctx.session.user.role === "ADMIN" && input.operatorId
        ? input.operatorId
        : userOperatorId;

      if (!operatorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun opérateur associé" });
      }

      const {operatorId: _requestedOperator, ...fields} = input;
      return writeClientOrganization(ctx.db, ctx.session.user, {operatorId,data:{
        ...fields,...(input.sector ? {sector:classifyCanonicalSector(input.sector).code} : {}),
      }});
    }),

  update: governedProcedure({


    kind: "LEGACY_CLIENT_UPDATE",


    inputSchema: z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      status: ClientStatus.optional(),
      expectedUpdatedAt: z.string().datetime().optional(),
      ...organizationFields,
    }),


    caller: "client:update",


  })
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.id, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const {id,expectedUpdatedAt,...data}=input;
      if (data.sector) data.sector=classifyCanonicalSector(data.sector).code;
      const client=found(await ctx.db.client.findUnique({where:{id},select:{operatorId:true}}),CLIENT_NOT_FOUND);
      return writeClientOrganization(ctx.db,ctx.session.user,{operatorId:client.operatorId,id,expectedUpdatedAt,data});
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

      return found(await ctx.db.client.findUnique({
        where: { id: input.id },
        include: {
          parentClient: { select: { id:true,name:true,organizationKind:true } },
          strategies: {
            include: { pillars: true },
            orderBy: { updatedAt: "desc" },
          },
          operator: { select: { id: true, name: true } },
        },
      }), CLIENT_NOT_FOUND);
    }),

  list: protectedProcedure
    .input(z.object({
      operatorId: z.string().optional(),
      status: ClientStatus.optional(),
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

      const isTeamMember = userRole === "ADMIN" || Boolean(userOperatorId);
      const visibleStrategies = isTeamMember ? {} : {userId: ctx.session.user.id};
      const items = await ctx.db.client.findMany({
        where,
        include: {
          strategies: {
            where: visibleStrategies,
            select: {
              id: true,
              name: true,
              status: true,
              advertis_vector: true,
              updatedAt: true,
            },
          },
          operator: { select: { id: true, name: true } },
          _count: { select: { strategies: {where:visibleStrategies} } },
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

      return { items: isTeamMember ? items : items.map(client=>({
        ...client, parentClientId:null,organizationKey:null,organizationSourceRefs:null,
        contactName:null,contactEmail:null,contactPhone:null,notes:null,billingInfo:null,
      })), nextCursor };
    }),

  delete: governedProcedure({


    kind: "LEGACY_CLIENT_DELETE",


    inputSchema: z.object({ id: z.string(), expectedUpdatedAt:z.string().datetime().optional() }),


    caller: "client:delete",


  })
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.id, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const client=found(await ctx.db.client.findUnique({where:{id:input.id},select:{operatorId:true}}),CLIENT_NOT_FOUND);
      return writeClientOrganization(ctx.db,ctx.session.user,{operatorId:client.operatorId,id:input.id,
        expectedUpdatedAt:input.expectedUpdatedAt,data:{status:"ARCHIVED"}});
    }),

  addBrand: governedProcedure({
    kind: "LEGACY_CLIENT_ADD_BRAND", requireOperator: true, caller: "client:addBrand",
    inputSchema: z.object({
      clientId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      marketScale: MarketScaleSchema.optional(),
      businessContext: z.record(z.string(), z.unknown()).optional(),
    }),
  })
    .mutation(async ({ ctx, input }) => {
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const hasAccess = await canAccessClient(input.clientId, {
        operatorId: userOperatorId,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const client = found(await ctx.db.client.findUnique({ where: { id: input.clientId } }), CLIENT_NOT_FOUND);

      if (client.status === "ARCHIVED") throw new TRPCError({ code: "BAD_REQUEST", message: "Client archivé." });
      const actor = { ...ctx.session.user, id: await resolveSessionUserId(ctx) };
      // Le siège du client n'est pas le marché de cette marque.
      return ctx.db.$transaction(tx => seedStrategy(tx, {
        ...input, operatorId: client.operatorId, sector: input.sector ?? client.sector ?? undefined
      }, actor));
    }),

  // Chantier 8 — P&L par client
  getPnL: operatorProcedure
    .input(z.object({
      clientId: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!await canAccessClient(input.clientId,{operatorId:ctx.session.user.operatorId ?? null,role:ctx.session.user.role ?? "USER",userId:ctx.session.user.id})) throw new TRPCError({code:"FORBIDDEN"});
      const { getClientPnL } = await import("@/server/services/financial-reconciliation");
      const from = input.from ? new Date(input.from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const to = input.to ? new Date(input.to) : new Date();
      return getClientPnL(input.clientId, from, to);
    }),
});
