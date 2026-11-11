/**
 * CRM portfolio and commercial decisions.
 * New deals belong to their selling operator from the first contact.
 * Converted legacy deals retain their strategy scope; unassigned history is
 * reserved for administration. Every keyed read and write checks the portfolio.
 * Commercial state changes use an approved mandate and a revisioned journal.
 */

import { TRPCError } from "@trpc/server";
import { salesStepSchema } from "@/server/services/crm-engine/commercial";
import { assertStrategyRead } from "./_strategy-read-guard";
import { z } from "zod";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import * as crm from "@/server/services/crm-engine";
import * as fleet from "@/server/services/crm-engine/fleet";
import { authorizeSalesPortfolio, listAuthorizedSalesPortfolios } from "@/server/services/crm-engine/portfolio";
import { authorizeSalesPortfolioInput } from "@/server/services/crm-engine/portfolio-contract";
import * as salesPayments from "@/server/services/crm-engine/payments";
import * as publicSales from "@/server/services/crm-engine/public-entry";
import { saveSalesPublicEntryInput } from "@/server/services/crm-engine/public-entry-contract";
import { prepareSalesOfferInput } from "@/server/services/crm-engine/offer-contract";
import { prepareSalesOffer } from "@/server/services/crm-engine/offers";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { accessible, entityNotFound, found, refusalAsNotFound } from "../entity-access";
/* lafusee:governed-active */

/** IN1 : un id inconnu et une entité hors portefeuille reçoivent le même 404. */
const DEAL_NOT_FOUND = "Affaire introuvable.";
const REPRESENTATIVE_NOT_FOUND = "Vendeur introuvable.";
const SALES_RUN_NOT_FOUND = "Tâche de vente introuvable.";

/** Opérateur de l'appelant pour le scope des lectures (null = ADMIN → global). */
async function callerOperatorScope(ctx: {
  session: { user: { id: string; role?: string | null } };
}): Promise<string | null> {
  if (ctx.session.user.role === "ADMIN") return null;
  const opCtx = await getOperatorContext(ctx.session.user.id);
  // operatorProcedure garantit ADMIN OU operatorId ; sentinelle si absent.
  return opCtx.operatorId ?? "__no_operator__";
}

async function assertDealAccess(ctx: { session: { user: { id: string; role?: string | null } }; db: typeof import("@/lib/db").db }, dealId: string) {
  return accessible(ctx.db.deal.findUnique({ where: { id: dealId } }), DEAL_NOT_FOUND, async (deal) => {
    const scope = await callerOperatorScope(ctx);
    if (scope === null) return;
    if (deal.operatorId ? deal.operatorId !== scope : !deal.strategyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Affaire hors de votre portefeuille." });
    }
    if (!deal.operatorId && deal.strategyId) await assertStrategyRead(ctx.session.user.id, deal.strategyId);
    if (deal.sellerStrategyId) await assertStrategyRead(ctx.session.user.id, deal.sellerStrategyId);
  });
}
async function assertLegacyStageChange(ctx: Parameters<typeof assertDealAccess>[0], dealId: string) {
  const deal = await assertDealAccess(ctx, dealId);
  if (deal.commercial) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Utiliser les décisions du poste commercial." });
}
async function fleetActor(ctx: { session: { user: { id: string; role?: string | null } } }): Promise<fleet.FleetActor> {
  const scope = await callerOperatorScope(ctx);
  return { id: ctx.session.user.id, admin: ctx.session.user.role === "ADMIN", operatorId: scope };
}
type SalesAccessContext = Parameters<typeof assertDealAccess>[0];
/** Route-level chokepoints resolve keyed entities before delegating to the scoped service. */
async function assertSalesBrandRead(ctx: SalesAccessContext, strategyId: string): Promise<fleet.FleetActor> {
  const actor = await fleetActor(ctx);
  await fleet.assertFleetBrand(actor, strategyId);
  return actor;
}
/** Résout une entité keyée vers sa marque vendeuse ; refus de la marque = 404 de l'entité. */
async function salesActorFor(ctx: SalesAccessContext, strategyId: string, message: string): Promise<fleet.FleetActor> {
  let actor: fleet.FleetActor | undefined;
  await refusalAsNotFound(async () => { actor = await assertSalesBrandRead(ctx, strategyId); }, message);
  return actor!;
}
async function assertSalesRepresentativeAccess(ctx: SalesAccessContext, representativeId: string, strategyId?: string): Promise<fleet.FleetActor> {
  const profile = await ctx.db.salesRepresentative.findUnique({ where: { id: representativeId }, select: { strategyId: true } });
  if (!profile || (strategyId && profile.strategyId !== strategyId)) throw entityNotFound(REPRESENTATIVE_NOT_FOUND);
  return salesActorFor(ctx, profile.strategyId, REPRESENTATIVE_NOT_FOUND);
}
async function assertSalesRunAccess(ctx: SalesAccessContext, runId: string): Promise<fleet.FleetActor> {
  const run = found(await ctx.db.salesRun.findUnique({ where: { id: runId }, select: { representativeId: true } }), SALES_RUN_NOT_FOUND);
  let actor: fleet.FleetActor | undefined;
  await refusalAsNotFound(async () => { actor = await assertSalesRepresentativeAccess(ctx, run.representativeId); }, SALES_RUN_NOT_FOUND);
  return actor!;
}
async function assertSalesDealAccess(ctx: SalesAccessContext, dealId: string): Promise<fleet.FleetActor> {
  const deal = found(await ctx.db.deal.findUnique({ where: { id: dealId }, select: { sellerStrategyId: true } }), DEAL_NOT_FOUND);
  if (!deal.sellerStrategyId) {
    // Sans marque vendeuse, l'état n'est dit qu'à qui voit l'affaire.
    await assertDealAccess(ctx, dealId);
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Rattacher une marque vendeuse avant cette demande." });
  }
  return salesActorFor(ctx, deal.sellerStrategyId, DEAL_NOT_FOUND);
}
// ============================================================================
// DEAL LIFECYCLE (opérateur/ADMIN uniquement)
// ============================================================================

export const crmRouter = createTRPCRouter({
  prepareSalesOffer: governedProcedure({
    kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    caller: "crm:prepareSalesOffer", inputSchema: prepareSalesOfferInput,
  }).mutation(async ({ ctx, input }) => prepareSalesOffer(input, await assertSalesDealAccess(ctx, input.dealId), ctx.intentId)),
  getSalesPublicEntry: protectedProcedure.input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => publicSales.getSalesPublicEntry(await assertSalesBrandRead(ctx, input.strategyId), input)),
  saveSalesPublicEntry: governedProcedure({
    kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    caller: "crm:saveSalesPublicEntry", inputSchema: saveSalesPublicEntryInput,
  }).mutation(async ({ ctx, input }) => publicSales.saveSalesPublicEntry(await assertSalesBrandRead(ctx, input.strategyId), input, ctx.intentId)),
  requestSalesPayment: governedProcedure({
    kind: "LEGACY_CRM_UPDATE_DEAL", caller: "crm:requestSalesPayment",
    inputSchema: z.object({ dealId: z.string().min(1), requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() }).strict(),
  }).mutation(async ({ ctx, input }) => salesPayments.requestSalesPayment(input.dealId, input.requestId, input.expectedRevision, await assertSalesDealAccess(ctx, input.dealId))),
  listCommercialPaymentRequests: protectedProcedure.input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => salesPayments.listCommercialPaymentRequests(input.strategyId, await assertSalesBrandRead(ctx, input.strategyId))),
  reconcileSalesPayment: governedProcedure({
    kind: "LEGACY_CRM_UPDATE_DEAL", caller: "crm:reconcileSalesPayment", inputSchema: salesPayments.reconcileSalesPaymentInput,
  }).mutation(async ({ ctx, input }) => {
    const result = await salesPayments.reconcileSalesPayment(input, await assertSalesDealAccess(ctx, input.dealId));
    // The human receipt and entitlement have committed before any report work.
    const { fulfillPaidIntakeReport } = await import("@/server/services/quick-intake/paid-fulfillment");
    void fulfillPaidIntakeReport(result.reference);
    return result;
  }),
  authorizeSalesPortfolio: governedProcedure({
    kind: "LEGACY_CRM_CREATE_DEAL", inputSchema: authorizeSalesPortfolioInput,
    caller: "crm:authorizeSalesPortfolio",
  }).mutation(async ({ ctx, input }) => authorizeSalesPortfolio(await assertSalesBrandRead(ctx, input.strategyId), input, ctx.intentId)),
  listAuthorizedSalesPortfolios: protectedProcedure.input(z.object({ strategyId: z.string(), representativeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const actor = await assertSalesBrandRead(ctx, input.strategyId);
      if (input.representativeId) await assertSalesRepresentativeAccess(ctx, input.representativeId, input.strategyId);
      return listAuthorizedSalesPortfolios(actor, input);
    }),
  listSalesRepresentatives: protectedProcedure.input(z.object({ strategyId: z.string() })).query(async ({ ctx, input }) =>
    fleet.listSalesRepresentatives(await assertSalesBrandRead(ctx, input.strategyId), input.strategyId)),
  salesRosterOptions: protectedProcedure.input(z.object({ strategyId: z.string() })).query(async ({ ctx, input }) =>
    fleet.salesRosterOptions(await assertSalesBrandRead(ctx, input.strategyId), input.strategyId)),
  getSalesRepresentative: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) =>
    fleet.getSalesRepresentative(await assertSalesRepresentativeAccess(ctx, input.id), input.id)),
  saveSalesRepresentative: governedProcedure({ kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    inputSchema: fleet.representativeInput, caller: "crm:saveSalesRepresentative",
  }).mutation(async ({ ctx, input }) => fleet.saveSalesRepresentative(await assertSalesBrandRead(ctx, input.strategyId), input)),
  setSalesRepresentativeStatus: governedProcedure({ kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    inputSchema: z.object({ id: z.string(), status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]) }), caller: "crm:setSalesRepresentativeStatus",
  }).mutation(async ({ ctx, input }) => fleet.setSalesRepresentativeStatus(await assertSalesRepresentativeAccess(ctx, input.id), input.id, input.status)),
  dispatchSalesRepresentative: governedProcedure({ kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    inputSchema: z.object({ id: z.string(), dealId: z.string().optional(), instruction: z.string().trim().min(2).max(12000), requestId: z.string().uuid() }), caller: "crm:dispatchSalesRepresentative",
  }).mutation(async ({ ctx, input }) => {
    const actor = await assertSalesRepresentativeAccess(ctx, input.id);
    // The service additionally checks the deal's selling brand and exact mandate principal.
    return fleet.dispatchSalesRepresentative(actor, input);
  }),
  resolveSalesRun: governedProcedure({ kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: false,
    inputSchema: z.object({ runId: z.string(), status: z.enum(["DONE", "FAILED"]), result: z.string().trim().min(2).max(20000) }), caller: "crm:resolveSalesRun",
  }).mutation(async ({ ctx, input }) => fleet.resolveSalesRun(await assertSalesRunAccess(ctx, input.runId), input)),
  recordInboundSalesMessage: governedProcedure({ kind: "LEGACY_CRM_ADD_NOTE", requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), channel: z.enum(["EMAIL", "WHATSAPP", "PHONE", "SMS", "WEB", "SOCIAL", "IN_PERSON"]), body: z.string().trim().min(1).max(20000), subject: z.string().max(200).optional(), externalId: z.string().trim().min(1).max(200) }), caller: "crm:recordInboundSalesMessage",
  }).mutation(async ({ ctx, input }) => {
    await assertDealAccess(ctx, input.dealId);
    return fleet.recordInboundSalesMessage(input, ctx.session.user.id);
  }),
  createSalesCustomerAccess: governedProcedure({ kind: "LEGACY_CRM_UPDATE_DEAL", requireOperator: true,
    inputSchema: z.object({ dealId: z.string() }), caller: "crm:createSalesCustomerAccess",
  }).mutation(async ({ ctx, input }) => {
    await assertDealAccess(ctx, input.dealId);
    const { issueCustomerAccess } = await import("@/server/services/crm-engine/customer");
    return issueCustomerAccess(input.dealId);
  }),
  sendSalesCustomerMessage: governedProcedure({ kind: "LEGACY_CRM_ADD_NOTE", requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), requestId: z.string().uuid(), channel: z.enum(["WEB", "EMAIL"]), body: z.string().trim().min(1).max(20000), subject: z.string().max(200).optional(), deliveryActivityId: z.string().trim().min(1).max(200).optional() }), caller: "crm:sendSalesCustomerMessage",
  }).mutation(async ({ ctx, input }) => {
    await assertDealAccess(ctx, input.dealId);
    const actor = { id: ctx.session.user.id, admin: ctx.session.user.role === "ADMIN" };
    if(input.deliveryActivityId&&input.channel!=="WEB")throw new TRPCError({code:"PRECONDITION_FAILED",message:"Joignez ce document depuis la conversation privée du client."});
    const receipt = input.channel === "EMAIL"
      ? await crm.sendSalesEmail(input.dealId, actor, { requestId: input.requestId, subject: input.subject ?? "Votre échange commercial", text: input.body })
      : await (await import("@/server/services/crm-engine/customer")).sendSalesWebMessage(input.dealId, actor, { requestId: input.requestId, text: input.body, deliveryActivityId: input.deliveryActivityId });
    return { status: receipt.activityType === "SALES_EMAIL_UNCERTAIN" ? "UNCERTAIN" as const : "SENT" as const, receipt };
  }),
  listSalesMessages: operatorProcedure.input(z.object({ dealId: z.string() })).query(async ({ ctx, input }) => {
    await assertDealAccess(ctx, input.dealId);
    const [incoming, outgoing] = await Promise.all([
      ctx.db.crmMessage.findMany({ where: { salesDealId: input.dealId }, orderBy: [{ createdAt: "desc" },{id:"desc"}], take: 200,
        select: { id: true, direction: true, channel: true, subject: true, body: true, status: true, createdAt: true } }),
      ctx.db.cRMActivity.findMany({ where: { dealId: input.dealId, activityType: { in: ["SALES_WEB_SENT", "SALES_EMAIL_SENT", "SALES_EMAIL_UNCERTAIN", "SALES_EMAIL_PENDING"] } }, orderBy: [{ performedAt: "desc" },{id:"desc"}], take: 200 }),
    ]);
    return [...incoming, ...outgoing.map(activity => ({ id: activity.id, direction: "OUT", channel: activity.activityType.startsWith("SALES_WEB") ? "WEB" : "EMAIL", subject: activity.description, body: String((activity.metadata as { body?: string } | null)?.body ?? ""), status: activity.activityType.endsWith("SENT") ? "SENT" : activity.activityType.endsWith("UNCERTAIN") ? "UNCERTAIN" : "PENDING", createdAt: activity.performedAt }))].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }),
  createDealFromIntake: governedProcedure({
    kind: "LEGACY_CRM_CREATE_DEAL_FROM_INTAKE",
    requireOperator: true,
    inputSchema: z.object({ intakeId: z.string() }),
    caller: "crm:createDealFromIntake",
  }).mutation(async ({ ctx, input }) => {
    // Le rôle est vérifié avant la lecture : le refus ne dit rien de l'intake demandé.
    if (ctx.session.user.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Rattachement intake réservé au mandant." });
    const intake = found(await ctx.db.quickIntake.findUnique({ where: { id: input.intakeId } }), "Diagnostic introuvable.");
    return crm.createDealFromIntake(intake.id);
  }),

  createDeal: governedProcedure({
    kind: "LEGACY_CRM_CREATE_DEAL",
    requireOperator: true,
    inputSchema: z.object({
      contactName: z.string().min(1),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().trim().min(3).optional(),
      sellerStrategyId: z.string().optional(),
      companyName: z.string().min(1),
      value: z.number().optional(),
      currency: z.string().default("XAF"),
      source: z.string().optional(),
      notes: z.string().optional(),
    }),
    caller: "crm:createDeal",
  }).mutation(async ({ ctx, input }) => {
    if (!input.contactEmail && !input.contactPhone) throw new TRPCError({ code: "BAD_REQUEST", message: "Téléphone ou email nécessaire." });
    let operatorId = await callerOperatorScope(ctx);
    const callerOperatorId = operatorId;
    if (input.sellerStrategyId) {
      await assertStrategyRead(ctx.session.user.id, input.sellerStrategyId);
      const seller = found(await ctx.db.strategy.findUnique({
        where: { id: input.sellerStrategyId }, select: { operatorId: true, client: { select: { operatorId: true } } },
      }), "Marque introuvable.");
      operatorId = seller.operatorId ?? seller.client?.operatorId ?? operatorId;
      if (callerOperatorId !== null && operatorId !== callerOperatorId) throw new TRPCError({ code: "FORBIDDEN", message: "Marque hors de votre portefeuille de vente." });
    }
    return crm.createDeal({ ...input, operatorId: operatorId ?? undefined });
  }),

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
      salesStep: salesStepSchema.optional(),
    }),
    caller: "crm:updateDeal",
  }).mutation(async ({ ctx, input }) => {
    const { dealId, salesStep, ...data } = input;
    const deal = await assertDealAccess(ctx, dealId);
    if (salesStep) {
      if (!deal.sellerStrategyId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choisissez la marque vendeuse avant de définir les conditions de vente." });
      if (salesStep.command.type === "MANDATE") {
        const mandate = salesStep.command.mandate;
        for (const userId of [mandate.sellerId, mandate.deliveryOwnerId]) {
          if (userId.startsWith("mcp:")) {
            const key = await ctx.db.mcpApiKey.findUnique({ where: { id: userId.slice(4) }, select: { isActive: true, scopeKind: true, scopeStrategyId: true, expiresAt: true } });
            if (!key?.isActive || key.scopeKind !== "BRAND" || key.scopeStrategyId !== deal.sellerStrategyId || (key.expiresAt && key.expiresAt <= new Date())) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Clé de l’agent inactive ou hors marque." });
            }
            continue;
          }
          const principal = await getOperatorContext(userId);
          if (principal.role !== "ADMIN" && (!deal.operatorId || principal.operatorId !== deal.operatorId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Titulaire hors de l’équipe vendeuse." });
          }
        }
        if (mandate.intakePaymentReference) {
          const payment = await ctx.db.intakePayment.findUnique({ where: { reference: mandate.intakePaymentReference } });
          if (!payment || payment.amount !== mandate.amount || payment.currency !== mandate.currency) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le paiement lié doit correspondre aux conditions approuvées." });
          }
        }
        const pillar = await ctx.db.pillar.findFirst({ where: { strategyId: deal.sellerStrategyId, key: "v" } });
        const catalogue = (pillar?.content as { produitsCatalogue?: Array<{ id?: string; nom?: string }> } | null)?.produitsCatalogue ?? [];
        if (!catalogue.some(product => product.id === mandate.offerId && product.nom === mandate.offerName)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’offre doit appartenir au catalogue de la marque vendeuse." });
        }
        if (String(pillar?.currentVersion) !== mandate.offerVersion) throw new TRPCError({ code: "CONFLICT", message: "Version d’offre périmée." });
      }
      if (salesStep.command.type === "HANDOVER") {
        if (salesStep.command.sellerId.startsWith("mcp:")) {
          const key = await ctx.db.mcpApiKey.findUnique({ where: { id: salesStep.command.sellerId.slice(4) }, select: { isActive: true, scopeKind: true, scopeStrategyId: true, expiresAt: true } });
          if (!key?.isActive || key.scopeKind !== "BRAND" || key.scopeStrategyId !== deal.sellerStrategyId || (key.expiresAt && key.expiresAt <= new Date())) throw new TRPCError({ code: "FORBIDDEN", message: "Vendeur IA inactif ou hors marque." });
        } else {
          const principal = await getOperatorContext(salesStep.command.sellerId);
          if (principal.role !== "ADMIN" && principal.operatorId !== deal.operatorId) throw new TRPCError({ code: "FORBIDDEN", message: "Titulaire hors de l’équipe." });
        }
      }
      const owner = await ctx.db.strategy.findUniqueOrThrow({ where: { id: deal.sellerStrategyId }, select: { userId: true } });
      return crm.applySalesStep(dealId, salesStep, { id: ctx.session.user.id, admin: ctx.session.user.role === "ADMIN" || owner.userId === ctx.session.user.id });
    }
    if (deal.commercial && [data.value, data.contactEmail, data.contactName, data.companyName].some(value => value !== undefined)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Les conditions de vente et le destinataire ont déjà été approuvés pour cette affaire." });
    }
    return crm.updateDeal(dealId, data);
  }),

  advanceDeal: governedProcedure({
    kind: "LEGACY_CRM_ADVANCE_DEAL",
    requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), notes: z.string().optional() }),
    caller: "crm:advanceDeal",
  }).mutation(async ({ ctx, input }) => { await assertLegacyStageChange(ctx, input.dealId); return crm.advanceDeal(input.dealId, input.notes); }),

  moveDealToStage: governedProcedure({
    kind: "LEGACY_CRM_MOVE_DEAL_TO_STAGE",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
      notes: z.string().optional(),
    }),
    caller: "crm:moveDealToStage",
  }).mutation(async ({ ctx, input }) => { await assertLegacyStageChange(ctx, input.dealId); return crm.moveDealToStage(input.dealId, input.stage, input.notes); }),

  loseDeal: governedProcedure({
    kind: "LEGACY_CRM_LOSE_DEAL",
    requireOperator: true,
    inputSchema: z.object({ dealId: z.string(), reason: z.string() }),
    caller: "crm:loseDeal",
  }).mutation(async ({ ctx, input }) => { await assertLegacyStageChange(ctx, input.dealId); return crm.loseDeal(input.dealId, input.reason); }),

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
    const deal = await assertDealAccess(ctx, input.dealId);
    if (deal.commercial) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La vente de cette offre conserve le compte acheteur existant." });
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
  }).mutation(async ({ ctx, input }) => { await assertDealAccess(ctx, input.dealId); return crm.addNote(input.dealId, ctx.session.user.id, input.content, input.noteType); }),

  listNotes: operatorProcedure
    .input(z.object({ dealId: z.string() }))
    .query(async ({ ctx, input }) => { await assertDealAccess(ctx, input.dealId); return crm.listNotes(input.dealId); }),

  addActivity: governedProcedure({
    kind: "LEGACY_CRM_ADD_ACTIVITY",
    requireOperator: true,
    inputSchema: z.object({
      dealId: z.string(),
      activityType: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "FOLLOWUP", "DEMO", "OTHER"]),
      description: z.string().min(1),
    }),
    caller: "crm:addActivity",
  }).mutation(async ({ ctx, input }) => { await assertDealAccess(ctx, input.dealId); return crm.addActivity(input.dealId, input.activityType, input.description, ctx.session.user.id); }),

  listActivities: operatorProcedure
    .input(z.object({ dealId: z.string() }))
    .query(async ({ ctx, input }) => { await assertDealAccess(ctx, input.dealId); return crm.listActivities(input.dealId); }),

  // ============================================================================
  // QUERIES (opérateur/ADMIN uniquement, scopées opérateur)
  // ============================================================================

  getDealDetails: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => { await assertDealAccess(ctx, input.id); return crm.getDealDetails(input.id); }),

  getDeal: operatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertDealAccess(ctx, input.id);
      return found(await ctx.db.deal.findUnique({
        where: { id: input.id },
        include: {
          strategy: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }), DEAL_NOT_FOUND);
    }),

  listDeals: operatorProcedure
    .input(z.object({
      stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
      limit: z.number().min(1).max(500).default(200),
    }))
    .query(async ({ ctx, input }) =>
      crm.listDeals({ stage: input.stage, limit: input.limit, operatorId: await callerOperatorScope(ctx) }),
    ),

  getPipeline: operatorProcedure.input(z.object({ currency: z.string().regex(/^[A-Z]{3}$/).default("XAF") }).optional()).query(async ({ ctx, input }) =>
    crm.getPipelineOverview(await callerOperatorScope(ctx), input?.currency),
  ),

  // ============================================================================
  // FORECASTING & METRICS
  // ============================================================================

  getRevenueForecast: operatorProcedure.input(z.object({ currency: z.string().regex(/^[A-Z]{3}$/).default("XAF") }).optional()).query(async ({ ctx, input }) =>
    crm.getRevenueForecast(await callerOperatorScope(ctx), input?.currency),
  ),

  getConversionMetrics: operatorProcedure.query(async ({ ctx }) => crm.getConversionMetrics(await callerOperatorScope(ctx))),
});
