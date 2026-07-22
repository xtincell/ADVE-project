/**
 * Campaign Deliverable Router — Phase 18 (ADR-0059) matrice 6D.
 *
 * 4 mutations governées par MESTOR + 3 read queries (par campagne, par operator,
 * agrégation Africa).
 *
 * Manual-first parity (ADR-0060) : routes consommables depuis
 * `<CampaignDeliverableForm />` UI standalone. Le wizard d'import RAMADAN.xlsx
 * (J5) appelle ces mêmes endpoints en boucle pour matérialiser 193 deliverables.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { canAccessCampaign, getOperatorContext } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {

/* lafusee:governed-active — Phase 18/19 router. Toutes les mutations utilisent governedProcedure (ADR-0004 strict cible atteinte) ; tag corrigé 2026-05-06 strangler→governed (faux positif initial — le router a toujours utilisé governedProcedure depuis sa création). */
  createCampaignDeliverable,
  updateCampaignDeliverable,
  deleteCampaignDeliverable,
  overrideRag,
  listDeliverablesForCampaign,
  listDeliverablesForOperator,
} from "@/server/services/campaign-deliverable";

const StringId = z.string().min(1);

export const campaignDeliverableRouter = createTRPCRouter({
  // ── Mutations governées ──────────────────────────────────────────────
  create: governedProcedure({
    kind: "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId, // pivot via Campaign.strategyId
      operatorId: StringId,
      campaignId: StringId,
      targetNodeId: StringId,
      countryCode: z.string().length(2).nullable().optional(),
      clusterTag: z.string().nullable().optional(),
      deliverableType: z.string().min(1).max(60),
      language: z.enum(["FR", "EN", "FR_EN"]).default("FR"),
      promoTag: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const deliverable = await createCampaignDeliverable({
        campaignId: input.campaignId,
        targetNodeId: input.targetNodeId,
        countryCode: input.countryCode ?? null,
        clusterTag: input.clusterTag ?? null,
        deliverableType: input.deliverableType,
        language: input.language,
        promoTag: input.promoTag ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        notes: input.notes ?? null,
      });
      return { ok: true as const, deliverable };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "createCampaignDeliverable failed",
      });
    }
  }),

  update: governedProcedure({
    kind: "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      deliverableId: StringId,
      patches: z.object({
        status: z.enum(["TODO", "IN_PROGRESS", "DELIVERED", "VALIDATED"]).optional(),
        dueDate: z.string().nullable().optional(),
        deliveredAt: z.string().nullable().optional(),
        validatedAt: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        brandAssetId: StringId.nullable().optional(),
        delegatedToOperatorId: StringId.nullable().optional(),
      }).passthrough(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const deliverable = await updateCampaignDeliverable(input.deliverableId, input.patches);
      return { ok: true as const, deliverable };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "updateCampaignDeliverable failed",
      });
    }
  }),

  delete: governedProcedure({
    kind: "OPERATOR_DELETE_CAMPAIGN_DELIVERABLE",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      deliverableId: StringId,
    }),
  }).mutation(async ({ input }) => {
    try {
      await deleteCampaignDeliverable(input.deliverableId);
      return { ok: true as const, id: input.deliverableId };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "deleteCampaignDeliverable failed",
      });
    }
  }),

  overrideRag: governedProcedure({
    kind: "OPERATOR_OVERRIDE_RAG",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      campaignId: StringId.nullable().optional(),
      deliverableId: StringId.nullable().optional(),
      ragOverride: z.enum(["GREEN", "AMBER", "RED"]).nullable(),
      reason: z.string().min(1).max(500),
    }),
  }).mutation(async ({ input }) => {
    try {
      const result = await overrideRag({
        kind: "OPERATOR_OVERRIDE_RAG",
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        campaignId: input.campaignId ?? null,
        deliverableId: input.deliverableId ?? null,
        ragOverride: input.ragOverride,
        reason: input.reason,
      });
      return { ok: true as const, result };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "overrideRag failed",
      });
    }
  }),

  // ── Read queries ─────────────────────────────────────────────────────
  listForCampaign: protectedProcedure
    .input(z.object({ campaignId: StringId }))
    .query(async ({ ctx, input }) => {
      // anti-IDOR (audit round-4) : livrables d'une campagne d'autrui sinon.
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessCampaign(input.campaignId, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne." });
      }
      return listDeliverablesForCampaign(input.campaignId);
    }),

  listForOperator: protectedProcedure
    .input(
      z.object({
        operatorId: StringId,
        countryCodes: z.array(z.string().length(2)).optional(),
        clusterTags: z.array(z.string()).optional(),
        status: z.array(z.string()).optional(),
        rag: z.array(z.enum(["GREEN", "AMBER", "RED"])).optional(),
      }),
    )
    .query(async ({ input }) => {
      return listDeliverablesForOperator({
        operatorId: input.operatorId,
        countryCodes: input.countryCodes,
        clusterTags: input.clusterTags,
        status: input.status,
        rag: input.rag,
      });
    }),

  /**
   * Stats agrégées par RAG / status pour le KPI header dashboard agence.
   */
  statsForOperator: protectedProcedure
    .input(z.object({ operatorId: StringId }))
    .query(async ({ input, ctx }) => {
      const all = await ctx.db.campaignDeliverable.findMany({
        where: { campaign: { strategy: { operatorId: input.operatorId } } },
        select: { status: true, rag: true },
      });
      const byStatus = { TODO: 0, IN_PROGRESS: 0, DELIVERED: 0, VALIDATED: 0 } as Record<string, number>;
      const byRag = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
      for (const row of all) {
        byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
        byRag[row.rag] = (byRag[row.rag] ?? 0) + 1;
      }
      return { total: all.length, byStatus, byRag };
    }),
});
