import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as auditTrail from "@/server/services/audit-trail";
import { canAccessCampaign, canAccessStrategy, getOperatorContext, scopeCampaigns } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const campaignRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_CAMPAIGN_CREATE",

    inputSchema: z.object({
      name: z.string().min(1),
      strategyId: z.string(),
      description: z.string().optional(),
      advertis_vector: z.record(z.string(), z.number()).optional(),
      devotionObjective: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "campaign:create",

  })
    .mutation(async ({ ctx, input }) => {
      const { advertis_vector, devotionObjective, description, ...rest } = input;
      const campaign = await ctx.db.campaign.create({
        data: {
          ...rest,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
          devotionObjective: devotionObjective as Prisma.InputJsonValue,
          objectives: description ? { description } as Prisma.InputJsonValue : undefined,
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Campaign",
        entityId: campaign.id,
        newValue: { name: input.name, strategyId: input.strategyId },
      }).catch((err) => { console.warn("[audit-trail] campaign create log failed:", err instanceof Error ? err.message : err); });

      return campaign;
    }),

  update: governedProcedure({


    kind: "LEGACY_CAMPAIGN_UPDATE",


    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      advertis_vector: z.record(z.string(), z.number()).optional(),
      devotionObjective: z.record(z.string(), z.unknown()).optional(),
    }),


    caller: "campaign:update",


  })
    .mutation(async ({ ctx, input }) => {
      // anti-IDOR (audit round-4) : `get` était gardé (2026-07-16), pas
      // `update`/`delete` → mutation cross-tenant de campagne. Chokepoint ADR-0129.
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessCampaign(input.id, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne" });
      }
      const { id, advertis_vector, devotionObjective, ...data } = input;
      const previous = await ctx.db.campaign.findUniqueOrThrow({ where: { id } });
      const updated = await ctx.db.campaign.update({
        where: { id },
        data: {
          ...data,
          ...(advertis_vector ? { advertis_vector: advertis_vector as Prisma.InputJsonValue } : {}),
          ...(devotionObjective ? { devotionObjective: devotionObjective as Prisma.InputJsonValue } : {}),
        },
      });

      // Audit trail for state transitions (non-blocking)
      if (input.status && input.status !== previous.status) {
        auditTrail.log({
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "Campaign",
          entityId: id,
          oldValue: { status: previous.status },
          newValue: { status: input.status },
        }).catch((err) => { console.warn("[audit-trail] campaign update log failed:", err instanceof Error ? err.message : err); });
      }

      return updated;
    }),

  // Audit 2026-07-16 `legacy-read-procedures-cross-tenant` : les LECTURES
  // legacy étaient en protectedProcedure nu — tout compte authentifié lisait
  // les campagnes (budgets inclus) de n'importe quelle marque. Chokepoint
  // ADR-0129 appliqué (canAccessCampaign / scopeCampaigns).
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessCampaign(input.id, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne" });
      }
      return ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.id },
        include: { missions: true, strategy: true },
      });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (input.strategyId && !(await canAccessStrategy(input.strategyId, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" });
      }
      return ctx.db.campaign.findMany({
        where: {
          // strategyId fourni → canAccessStrategy a déjà tranché la tenancy
          // (scopeCampaigns est plus étroit — cf. régression missions 2026-07-16).
          ...(input.strategyId ? {} : scopeCampaigns(opCtx)),
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          missions: {
            select: { id: true, title: true, status: true, priority: true, slaDeadline: true, mode: true, budget: true, description: true },
            orderBy: { priority: "asc" as const },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * ADR-0119 — campagnes canon d'une stratégie (canonType non-null), avec leurs
   * actions rattachées (`brandActions`). Triées par route puis ordre canon.
   */
  canonByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessStrategy(input.strategyId, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque" });
      }
      const campaigns = await ctx.db.campaign.findMany({
        where: { strategyId: input.strategyId, canonType: { not: null } },
        select: {
          id: true, name: true, canonType: true, routeKey: true, aarrrPrimary: true, aarrrSecondary: true,
          recommendedBudget: true, isAlwaysOn: true, budget: true, budgetCurrency: true, startDate: true, endDate: true, state: true,
          brandActions: {
            select: { id: true, title: true, description: true, budgetMin: true, budgetMax: true, touchpoint: true, priority: true },
            orderBy: { priority: "asc" },
          },
        },
        orderBy: [{ routeKey: "asc" }, { canonType: "asc" }],
      });
      return campaigns;
    }),

  delete: governedProcedure({


    kind: "LEGACY_CAMPAIGN_DELETE",


    inputSchema: z.object({ id: z.string() }),


    caller: "campaign:delete",


  })
    .mutation(async ({ ctx, input }) => {
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessCampaign(input.id, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne" });
      }
      return ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),
});
