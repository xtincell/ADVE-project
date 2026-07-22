/**
 * Contract & Escrow Router — SOCLE Finance
 */

import { z } from "zod";
import type { Prisma, ContractStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { canAccessStrategy, getOperatorContext, scopeStrategies } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/**
 * Anti-IDOR (audit round-4) : les procédures contrat/escrow sont keyées sur un
 * id d'entité (contractId/escrowId/conditionId), pas `strategyId` → gardes
 * ADR-0175 inertes. On remonte `contract → strategy` et on passe
 * `canAccessStrategy`. Les actes financiers (escrow) sont EN OUTRE `requireOperator`.
 */
async function assertContractAccess(
  ctx: { session: { user: { id: string } }; db: typeof import("@/lib/db").db },
  contractId: string,
): Promise<void> {
  const c = await ctx.db.contract.findUnique({ where: { id: contractId }, select: { strategyId: true } });
  if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Contrat introuvable" });
  const opCtx = await getOperatorContext(ctx.session.user.id);
  if (!(await canAccessStrategy(c.strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à ce contrat." });
  }
}

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
      await assertContractAccess(ctx, input.id); // anti-IDOR : lecture cross-tenant sinon
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
    .mutation(async ({ ctx, input }) => {
      await assertContractAccess(ctx, input.id); // anti-IDOR : forge de statut cross-tenant sinon
      return ctx.db.contract.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  sign: governedProcedure({


    kind: "LEGACY_CONTRACT_SIGN",


    inputSchema: z.object({ id: z.string(), documentUrl: z.string().optional() }),


    caller: "contract:sign",


  })
    .mutation(async ({ ctx, input }) => {
      await assertContractAccess(ctx, input.id); // anti-IDOR : forge d'activation cross-tenant sinon
      return ctx.db.contract.update({ where: { id: input.id }, data: { status: "ACTIVE", signedAt: new Date(), documentUrl: input.documentUrl } });
    }),

  // === ESCROW (fonds sous séquestre = actes STAFF) ===
  createEscrow: governedProcedure({

    kind: "LEGACY_CONTRACT_CREATE_ESCROW",
    requireOperator: true,

    inputSchema: z.object({ contractId: z.string(), amount: z.number(), conditions: z.array(z.string()).optional() }),

    caller: "contract:createEscrow",

  })
    .mutation(async ({ ctx, input }) => {
      await assertContractAccess(ctx, input.contractId); // scope opérateur à SON contrat
      const escrow = await ctx.db.escrow.create({ data: { contractId: input.contractId, amount: input.amount } });
      if (input.conditions) {
        for (const condition of input.conditions) {
          await ctx.db.escrowCondition.create({ data: { escrowId: escrow.id, condition } });
        }
      }
      return escrow;
    }),

  // Libération des fonds sous séquestre = acte STAFF/arbitre (parité avec
  // `escrow-arbitration.release` ADMIN — était ouvert à tout authentifié ⇒
  // n'importe qui vidait n'importe quel escrow). L'ownership par-marque de
  // l'escrow (3 parents possibles : contrat/mission/commission) est tracé.
  releaseEscrow: governedProcedure({


    kind: "LEGACY_CONTRACT_RELEASE_ESCROW",
    requireOperator: true,


    inputSchema: z.object({ id: z.string(), reason: z.string().optional() }),


    caller: "contract:releaseEscrow",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrow.update({ where: { id: input.id }, data: { status: "RELEASED", releasedAt: new Date(), reason: input.reason } });
    }),

  meetEscrowCondition: governedProcedure({


    kind: "LEGACY_CONTRACT_MEET_ESCROW_CONDITION",
    requireOperator: true,


    inputSchema: z.object({ conditionId: z.string(), verifiedBy: z.string() }),


    caller: "contract:meetEscrowCondition",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrowCondition.update({ where: { id: input.conditionId }, data: { met: true, metAt: new Date(), verifiedBy: input.verifiedBy } });
    }),
});
