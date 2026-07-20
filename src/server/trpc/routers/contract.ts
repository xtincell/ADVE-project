/**
 * Contract & Escrow Router — SOCLE Finance
 */

import { z } from "zod";
import type { Prisma, ContractStatus } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { getOperatorContext, scopeStrategies } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const contractRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_CONTRACT_CREATE",

    inputSchema: z.object({
      strategyId: z.string(),
      title: z.string(),
      contractType: z.string(),
      startDate: z.date(),
      endDate: z.date().optional(),
      value: z.number().optional(),
      terms: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "contract:create",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.create({ data: { ...input, terms: input.terms as Prisma.InputJsonValue } });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contract.findUniqueOrThrow({ where: { id: input.id }, include: { escrows: { include: { conditions: true } } } });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // ADR-0166 — scope ownership : jamais de liste cross-marques.
      const opCtx = await getOperatorContext(ctx.session.user.id);
      return ctx.db.contract.findMany({
        where: {
          strategy: scopeStrategies(opCtx),
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.status ? { status: input.status as ContractStatus } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateStatus: governedProcedure({


    kind: "LEGACY_CONTRACT_UPDATE_STATUS",


    inputSchema: z.object({ id: z.string(), status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "TERMINATED", "DISPUTED"]) }),


    caller: "contract:updateStatus",


  })
    .mutation(async ({ ctx, input }) => ctx.db.contract.update({ where: { id: input.id }, data: { status: input.status } })),

  sign: governedProcedure({


    kind: "LEGACY_CONTRACT_SIGN",


    inputSchema: z.object({ id: z.string(), documentUrl: z.string().optional() }),


    caller: "contract:sign",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.update({ where: { id: input.id }, data: { status: "ACTIVE", signedAt: new Date(), documentUrl: input.documentUrl } });
    }),

  // === ESCROW ===
  createEscrow: governedProcedure({

    kind: "LEGACY_CONTRACT_CREATE_ESCROW",

    inputSchema: z.object({ contractId: z.string(), amount: z.number(), conditions: z.array(z.string()).optional() }),

    caller: "contract:createEscrow",

  })
    .mutation(async ({ ctx, input }) => {
      const escrow = await ctx.db.escrow.create({ data: { contractId: input.contractId, amount: input.amount } });
      if (input.conditions) {
        for (const condition of input.conditions) {
          await ctx.db.escrowCondition.create({ data: { escrowId: escrow.id, condition } });
        }
      }
      return escrow;
    }),

  releaseEscrow: governedProcedure({


    kind: "LEGACY_CONTRACT_RELEASE_ESCROW",


    inputSchema: z.object({ id: z.string(), reason: z.string().optional() }),


    caller: "contract:releaseEscrow",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrow.update({ where: { id: input.id }, data: { status: "RELEASED", releasedAt: new Date(), reason: input.reason } });
    }),

  meetEscrowCondition: governedProcedure({


    kind: "LEGACY_CONTRACT_MEET_ESCROW_CONDITION",


    inputSchema: z.object({ conditionId: z.string(), verifiedBy: z.string() }),


    caller: "contract:meetEscrowCondition",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrowCondition.update({ where: { id: input.conditionId }, data: { met: true, metAt: new Date(), verifiedBy: input.verifiedBy } });
    }),
});
