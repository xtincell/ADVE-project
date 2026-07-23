/**
 * CRM Router — Deals, funnel tracking, intake conversion, notes, activities,
 * revenue forecasting, conversion metrics.
 *
 * CdC: Annexe E §4.2 — Pipeline commercial (Quick Intake -> Deal -> Brand Instance)
 * Phase 0: Quick Intake complete -> Deal auto, pipeline visible, revenue forecasting
 *
 * Anti-IDOR (audit adversarial 2026-07-22) : le CRM d'agence est réservé aux
 * OPÉRATEURS/ADMIN (`operatorProcedure`) — auparavant `protectedProcedure`, tout
 * compte authentifié (founder/creator/guilde) lisait+écrivait TOUT le pipeline
 * (contacts, emails, valeurs). Les lectures agrégées sont scopées à l'opérateur
 * appelant (DB-résolu) ; ADMIN voit tout. `convertToStrategy` n'accepte plus un
 * `operatorId` client (escalade : créer une Strategy sous un opérateur arbitraire)
 * → l'opérateur est dérivé du serveur.
 * Reste tracé (RESIDUAL-DEBT §IDOR round-2) : ownership deal↔opérateur par-deal
 * sur les ops keyées `dealId` (cross-opérateur, théorique en mono-opérateur ;
 * exige des signatures crm-engine par-deal) + scope `getConversionMetrics`.
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";
import * as crm from "@/server/services/crm-engine";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { getOperatorContext } from "@/server/services/operator-isolation";
/* lafusee:governed-active */

/** Opérateur de l'appelant pour le scope des lectures (null = ADMIN → global). */
async function callerOperatorScope(ctx: {
  session: { user: { id: string; role?: string | null } };
}): Promise<string | null> {
  if (ctx.session.user.role === "ADMIN") return null;
  const opCtx = await getOperatorContext(ctx.session.user.id);
  // operatorProcedure garantit ADMIN OU operatorId ; sentinelle si absent.
  return opCtx.operatorId ?? "__no_operator__";
}

// ============================================================================
// DEAL LIFECYCLE (opérateur/ADMIN uniquement)
// ============================================================================

export const crmRouter = createTRPCRouter({
  createDealFromIntake: governedProcedure({
    kind: "LEGACY_CRM_CREATE_DEAL_FROM_INTAKE",
    requireOperator: true,
    inputSchema: z.object({ intakeId: z.string() }),
    caller: "crm:createDealFromIntake",
  }).mutation(({ input }) => crm.createDealFromIntake(input.intakeId)),

  createDeal: governedProcedure({
    kind: "LEGACY_CRM_CREATE_DEAL",
    requireOperator: true,
    inputSchema: z.object({
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      companyName: z.string().min(1),
      value: z.number().optional(),
      currency: z.string().default("XAF"),
      source: z.string().optional(),
      notes: z.string().optional(),
    }),
    caller: "crm:createDeal",
  }).mutation(({ input }) => crm.createDeal(input)),

  updateDeal: governedProcedure({
    kind: "LEGACY_CRM_UPDATE_DEAL",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      companyName: z.string().optional(),
      value: z.number().optional(),
      notes: z.string().optional(),
    }),
    caller: "crm:updateDeal",
  }).mutation(({ input }) => {
    const { dealId, ...data } = input;
    return crm.updateDeal(dealId, data);
  }),

  advanceDeal: governedProcedure({
    kind: "LEGACY_CRM_ADVANCE_DEAL",
    requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), notes: z.string().optional() }),
    caller: "crm:advanceDeal",
  }).mutation(({ input }) => crm.advanceDeal(input.dealId, input.notes)),

  moveDealToStage: governedProcedure({
    kind: "LEGACY_CRM_MOVE_DEAL_TO_STAGE",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
      notes: z.string().optional(),
    }),
    caller: "crm:moveDealToStage",
  }).mutation(({ input }) => crm.moveDealToStage(input.dealId, input.stage, input.notes)),

  loseDeal: governedProcedure({
    kind: "LEGACY_CRM_LOSE_DEAL",
    requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), reason: z.string() }),
    caller: "crm:loseDeal",
  }).mutation(({ input }) => crm.loseDeal(input.dealId, input.reason)),

  /**
   * Convert a WON deal into a Strategy (Brand Instance). L'`operatorId` est
   * DÉRIVÉ de l'appelant (jamais du client) — sinon un opérateur créait une
   * Strategy sous un opérateur arbitraire.
   */
  convertToStrategy: governedProcedure({
    kind: "LEGACY_CRM_CONVERT_TO_STRATEGY",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      userId: z.string(),
    }),
    caller: "crm:convertToStrategy",
  }).mutation(async ({ ctx, input }) => {
    const operatorId = (await callerOperatorScope(ctx)) ?? undefined;
    return crm.convertDealToStrategy(input.dealId, input.userId, operatorId);
  }),

  // ============================================================================
  // NOTES & ACTIVITIES
  // ============================================================================

  addNote: governedProcedure({
    kind: "LEGACY_CRM_ADD_NOTE",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      content: z.string().min(1),
      noteType: z.enum(["GENERAL", "CALL", "MEETING", "EMAIL", "FOLLOWUP"]).default("GENERAL"),
    }),
    caller: "crm:addNote",
  }).mutation(({ ctx, input }) =>
    crm.addNote(input.dealId, ctx.session.user.id, input.content, input.noteType),
  ),

  listNotes: operatorProcedure
    .input(z.object({ dealId: z.string() }))
    .query(({ input }) => crm.listNotes(input.dealId)),

  addActivity: governedProcedure({
    kind: "LEGACY_CRM_ADD_ACTIVITY",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      activityType: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "FOLLOWUP", "DEMO", "OTHER"]),
      description: z.string().min(1),
    }),
    caller: "crm:addActivity",
  }).mutation(({ ctx, input }) =>
    crm.addActivity(input.dealId, input.activityType, input.description, ctx.session.user.id),
  ),

  listActivities: operatorProcedure
    .input(z.object({ dealId: z.string() }))
    .query(({ input }) => crm.listActivities(input.dealId)),

  // ============================================================================
  // QUERIES (opérateur/ADMIN uniquement, scopées opérateur)
  // ============================================================================

  getDealDetails: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => crm.getDealDetails(input.id)),

  getDeal: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deal.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          strategy: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  listDeals: operatorProcedure
    .input(z.object({
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
      limit: z.number().min(1).max(500).default(200),
    }))
    .query(async ({ ctx, input }) =>
      crm.listDeals({ stage: input.stage, limit: input.limit, operatorId: await callerOperatorScope(ctx) }),
    ),

  getPipeline: operatorProcedure.query(async ({ ctx }) =>
    crm.getPipelineOverview(await callerOperatorScope(ctx)),
  ),

  // ============================================================================
  // FORECASTING & METRICS
  // ============================================================================

  getRevenueForecast: operatorProcedure.query(async ({ ctx }) =>
    crm.getRevenueForecast(await callerOperatorScope(ctx)),
  ),

  getConversionMetrics: operatorProcedure.query(() => crm.getConversionMetrics()),
});
