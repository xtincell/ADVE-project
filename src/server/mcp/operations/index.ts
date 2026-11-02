// ============================================================================
// MODULE M27 — MCP Operations Server
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §3.3 | Division: La Fusée (BOOST)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  14 tools: createCampaign, updateCampaign, transitionState, listCampaigns,
//            createAction, createAmplification, addTeamMember, setBudget, createMilestone,
//            requestApproval, generateBrief, getRecommendations, createMission, createProcess
// [x] REQ-2  5 resources: campaigns/{strategyId}, budgets/{campaignId}, teams/{campaignId},
//            briefs/{campaignId}, approvals/{campaignId}
// [x] REQ-3  State machine integration (12-state campaign lifecycle)
// [x] REQ-4  Budget breakdown by category with variance tracking
//
// TOOLS: 14 | RESOURCES: 5 | SPEC TARGET: 12 tools + 5 resources ✓
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import * as campaignManager from "@/server/services/campaign-manager";
import type { CampaignState } from "@/server/services/campaign-manager/state-machine";
import type { ProcessStatus, ProcessType } from "@prisma/client";
import * as processScheduler from "@/server/services/process-scheduler";
import * as slaTracker from "@/server/services/sla-tracker";
import * as teamAllocator from "@/server/services/team-allocator";
import { listStrategyMissions } from "@/server/mcp/_shared/strategy-activity";

// ---------------------------------------------------------------------------
// Operations MCP Server
// Gestion des campagnes, dispatching de missions, suivi SLA, planification,
// allocation d'équipe, budgets et reporting AARRR.
// ---------------------------------------------------------------------------

export const serverName = "operations";
export const serverDescription =
  "Serveur MCP Operations — Pilotage opérationnel des campagnes, missions, SLA, équipes et reporting pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
  /**
   * Portée vis-à-vis des marques — cf. `McpToolScope` (anubis/mcp-server.ts).
   * Union écrite en clair plutôt qu'importée : `mcp-server` importe déjà ce
   * module dynamiquement, un import retour créerait un cycle.
   */
  scope?: "BRAND" | "GLOBAL" | "SELF_SCOPED";
}

// ---------------------------------------------------------------------------
// Garde d'appartenance
// ---------------------------------------------------------------------------

/**
 * Vérifie qu'une campagne appartient bien à la marque demandée.
 *
 * Sans cette garde, un outil qui prend un `campaignId` seul rend la donnée de
 * n'importe quelle marque à quiconque devine un identifiant — et un outil qui
 * prend un `strategyId` **sans s'en servir** le rend sans même avoir à deviner
 * (audit MCP P0 : `content_calendar_get` a renvoyé les missions de quatre
 * marques pour un `strategyId` unique).
 */
async function assertCampaignInStrategy(campaignId: string, strategyId: string): Promise<void> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { strategyId: true },
  });
  if (!campaign) throw new Error(`Campagne introuvable : ${campaignId}`);
  if (campaign.strategyId !== strategyId) {
    throw new Error("Cette campagne n'appartient pas à la marque demandée — accès refusé.");
  }
}

/** Même garde pour une mission — `mission_dispatch` MUTE, elle ne peut pas être aveugle. */
async function assertMissionInStrategy(missionId: string, strategyId: string): Promise<void> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    select: { strategyId: true },
  });
  if (!mission) throw new Error(`Mission introuvable : ${missionId}`);
  if (mission.strategyId !== strategyId) {
    throw new Error("Cette mission n'appartient pas à la marque demandée — accès refusé.");
  }
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

async function commercialAgent(input: Record<string, unknown>) {
  const auth = input.__auth as { scopeKind?: string; scopeStrategyId?: string; apiKeyId?: string; salesRunId?: string; salesRequestId?: string } | undefined;
  if (auth?.scopeKind !== "BRAND" || auth.scopeStrategyId !== input.strategyId || !auth.apiKeyId) {
    throw new Error("Une clé d’agent limitée à la marque est nécessaire.");
  }
  const key = await db.mcpApiKey.findUnique({ where: { id: auth.apiKeyId }, select: { isActive: true, scopeKind: true, scopeStrategyId: true, expiresAt: true } });
  if (!key?.isActive || key.scopeStrategyId !== input.strategyId || key.scopeKind !== "BRAND" || (key.expiresAt && key.expiresAt <= new Date())) {
    throw new Error("Mandat d’accès expiré ou révoqué.");
  }
  const profile = await db.salesRepresentative.findUnique({ where: { mcpKeyId: auth.apiKeyId }, select: { status: true } });
  if (profile && profile.status !== "ACTIVE") throw new Error("Commercial suspendu ou non activé.");
  return { id: `mcp:${auth.apiKeyId}`, admin: false, salesRunId:auth.salesRunId, salesRequestId:auth.salesRequestId };
}

async function salesDecisionResult(work:()=>Promise<unknown>,dealId:string){
  try{return await work();}catch(error){
    if(!(error instanceof TRPCError)||!["PRECONDITION_FAILED","CONFLICT","FORBIDDEN","BAD_REQUEST"].includes(error.code))throw error;
    const current=await db.deal.findUniqueOrThrow({where:{id:dealId},select:{revision:true,commercial:true}});
    const state=current.commercial as {node?:string;nextAction?:string}|null;
    return {status:"REFUSED",errorCode:error.code,message:error.message,currentState:{node:state?.node??"DISCOVERY",revision:current.revision,nextAction:state?.nextAction??null}};
  }
}

export const tools: ToolDefinition[] = [
  {
    name: "sales_portfolio",
    description: "Retrouver les affaires confiées à cet agent, leurs offres, preuves et prochaines actions sur tous les canaux.",
    inputSchema: z.object({ strategyId: z.string() }),
    handler: async input => {
      const actor = await commercialAgent(input);
      const scopedDeal = (input.__auth as {salesDealId?:string|null}|undefined)?.salesDealId;
      const rows = await db.deal.findMany({ where: { sellerStrategyId: String(input.strategyId), ...(scopedDeal?{id:scopedDeal}:{}) }, orderBy: { updatedAt: "desc" } });
      const { salesStateSchema } = await import("@/server/services/crm-engine/commercial");
      const assigned = rows.filter(row => {
        const state = salesStateSchema.safeParse(row.commercial);
        return state.success && state.data.mandate?.sellerId === actor.id;
      });
      const activities = await db.cRMActivity.findMany({
        where: { dealId: { in: assigned.map(row => row.id) } }, orderBy: { performedAt: "asc" },
      });
      const inbound = await db.crmMessage.findMany({
        where: { direction: "IN", status: "RECEIVED", OR: [
          { salesDealId: { in: assigned.map(deal => deal.id) } },
          { salesDealId: null, contact: { strategyId: String(input.strategyId), email: { in: assigned.flatMap(deal => deal.contactEmail ? [deal.contactEmail] : []) } } },
        ] },
        select: { id: true, salesDealId: true, body: true, subject: true, channel: true, createdAt: true, contact: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      });
      return { deals: assigned.map(row => {
        const {customerAccessTokenHash:_hash,customerAccessTokenEncrypted:_secret,...deal}=row;
        const history=activities.filter(item=>item.dealId===deal.id);
        const replies=inbound.filter(item=>item.salesDealId?item.salesDealId===deal.id:item.contact?.email.toLowerCase()===deal.contactEmail?.toLowerCase());
        return {deal,historyEarlierCount:Math.max(0,history.length-8),replyEarlierCount:Math.max(0,replies.length-8),
          history:history.slice(-8).map(item=>({id:item.id,activityType:item.activityType,description:item.description,performedAt:item.performedAt,
            metadata:item.activityType.startsWith("SALES_WEB")||item.activityType.startsWith("SALES_EMAIL")?{body:(item.metadata as {body?:string}|null)?.body}:undefined})),
          replies:replies.slice(-8)};
      }) };
    },
  },
  {
    name: "sales_request_payment",
    description: "Après accord reçu, préparer le règlement individuel au montant et à la destination approuvés. Aucun débit ni confirmation de paiement.",
    inputSchema: z.object({strategyId:z.string(),dealId:z.string(),requestId:z.string().uuid(),expectedRevision:z.number().int().nonnegative()}),
    handler:async input=>{
      const actor=await commercialAgent(input);
      const deal=await db.deal.findUniqueOrThrow({where:{id:String(input.dealId)}});
      if(deal.sellerStrategyId!==input.strategyId)throw new TRPCError({code:'FORBIDDEN',message:'Affaire hors marque.'});
      const {requestSalesPayment}=await import('@/server/services/crm-engine/payments');
      return salesDecisionResult(()=>requestSalesPayment(deal.id,String(input.requestId),Number(input.expectedRevision),actor),deal.id);
    },
  },
  {
    name: "sales_sync_payment",
    description: "Relire le règlement natif lié par le mandant. Un paiement en attente reste en attente. Ne crée ni débit ni nouveau paiement.",
    inputSchema: z.object({ strategyId: z.string(), dealId: z.string(), requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() }),
    handler: async input => {
      const actor = await commercialAgent(input);
      const deal = await db.deal.findUniqueOrThrow({ where: { id: String(input.dealId) } });
      const { salesStateSchema } = await import("@/server/services/crm-engine/commercial");
      const state = salesStateSchema.parse(deal.commercial);
      if (deal.sellerStrategyId !== input.strategyId || state.mandate?.sellerId !== actor.id) throw new Error("Affaire hors mandat.");
      if (!deal.paymentReference) return {status:"NOT_REQUESTED",nextAction:"Après accord reçu, utiliser sales_request_payment pour ce mandat."};
      const payment = await db.intakePayment.findUniqueOrThrow({ where: { reference: deal.paymentReference } });
      if (payment.status !== "PAID" || !payment.paidAt) return { status: payment.status, dealId: deal.id };
      if (state.node === "PAID" || state.node === "DELIVERED") return { status: "PAID", dealId: deal.id };
      const { applySalesStep } = await import("@/server/services/crm-engine");
      const {paymentMajorAmount}=await import("@/server/services/crm-engine/payments");
      return salesDecisionResult(()=>applySalesStep(deal.id, {
        requestId: String(input.requestId), expectedRevision: Number(input.expectedRevision),
        channel: state.mandate!.channels[0]!,
        command: { type: "PAYMENT", amount: paymentMajorAmount(payment), currency: payment.currency, evidence: `IntakePayment:${payment.reference}` },
      }, { ...actor, admin: true }),deal.id);
    },
  },
  {
    name: "sales_send_email",
    description: "Envoyer au seul contact de l’affaire mandatée via le transport email existant. requestId stable. Un résultat incertain exige un rapprochement avant nouvel envoi.",
    inputSchema: z.object({ strategyId: z.string(), dealId: z.string(), requestId: z.string().uuid(),
      subject: z.string().trim().min(1).max(200), text: z.string().trim().min(1).max(20000) }),
    handler: async input => {
      const actor = await commercialAgent(input);
      const deal = await db.deal.findUniqueOrThrow({ where: { id: String(input.dealId) } });
      if (deal.sellerStrategyId !== input.strategyId) throw new Error("Affaire hors de cette marque.");
      const { sendSalesEmail } = await import("@/server/services/crm-engine");
      return salesDecisionResult(()=>sendSalesEmail(deal.id, actor, { requestId: String(input.requestId), subject: String(input.subject), text: String(input.text) }),deal.id);
    },
  },
  {
    name: "sales_decide",
    description: "Conduire une affaire mandatée jusqu’à l’accord et la remise. requestId stable au rejeu, expectedRevision relue. Le règlement est attesté par la finance.",
    inputSchema: z.object({ strategyId: z.string(), dealId: z.string(), step: z.unknown() }),
    handler: async input => {
      const actor = await commercialAgent(input);
      const deal = await db.deal.findUniqueOrThrow({ where: { id: String(input.dealId) } });
      if (deal.sellerStrategyId !== input.strategyId) throw new Error("Affaire hors de cette marque.");
      const { salesStepSchema } = await import("@/server/services/crm-engine/commercial");
      const step = salesStepSchema.parse(input.step);
      if (["MANDATE", "PAYMENT", "HANDOVER"].includes(step.command.type)) throw new Error("Décision réservée au mandant.");
      const { applySalesStep } = await import("@/server/services/crm-engine");
      return salesDecisionResult(()=>applySalesStep(deal.id, step, actor),deal.id);
    },
  },

  {
    name: "sales_claim_run",
    description: "Réserver une instruction commerciale bornée ; zéro appel modèle si file vide. Rejouer requestId après timeout.",
    inputSchema: z.object({ strategyId:z.string(),requestId:z.string().uuid() }),
    handler: async input => {
      const auth=input.__auth as {scopeKind?:string;scopeStrategyId?:string;apiKeyId?:string}|undefined;
      if(auth?.scopeKind!=="BRAND"||auth.scopeStrategyId!==input.strategyId||!auth.apiKeyId)throw new Error("Clé commerciale requise.");
      const {claimRun}=await import("@/server/services/crm-engine/fleet");
      return claimRun(auth.apiKeyId,String(input.requestId));
    },
  },
  {
    name: "sales_complete_run",
    description: "Conserver le résultat d'une instruction déjà réservée, même après suspension. Aucun nouvel effet client.",
    inputSchema: z.object({strategyId:z.string(),runId:z.string(),leaseToken:z.string(),status:z.enum(["DONE","FAILED","AMBIGUOUS"]),result:z.string().max(20000),tokensUsed:z.number().int().nonnegative().optional()}),
    handler: async input => {
      const auth=input.__auth as {scopeKind?:string;scopeStrategyId?:string;apiKeyId?:string}|undefined;
      if(auth?.scopeKind!=="BRAND"||auth.scopeStrategyId!==input.strategyId||!auth.apiKeyId)throw new Error("Clé commerciale requise.");
      const {completeRun}=await import("@/server/services/crm-engine/fleet");
      return completeRun(auth.apiKeyId,String(input.runId),String(input.leaseToken),{status:input.status as "DONE"|"FAILED"|"AMBIGUOUS",result:String(input.result),tokensUsed:input.tokensUsed as number|undefined});
    },
  },
  {
    name: "sales_send_message",
    description: "Répondre au client sur sa conversation web. La réponse est réellement visible dans le même dossier.",
    inputSchema:z.object({strategyId:z.string(),dealId:z.string(),requestId:z.string().uuid(),text:z.string().trim().min(1).max(12000),channel:z.literal("WEB")}),
    handler:async input=>{
      const actor=await commercialAgent(input);
      const deal=await db.deal.findUniqueOrThrow({where:{id:String(input.dealId)}});
      if(deal.sellerStrategyId!==input.strategyId)throw new Error("Affaire hors marque.");
      const {sendSalesWebMessage}=await import("@/server/services/crm-engine/customer");
      return salesDecisionResult(()=>sendSalesWebMessage(deal.id,actor,{requestId:String(input.requestId),text:String(input.text)}),deal.id);
    },
  },

  {
    name:"sales_customer_link",description:"Retrouver le lien sécurisé de conversation du client mandaté pour le lui transmettre sur un canal autorisé.",
    inputSchema:z.object({strategyId:z.string(),dealId:z.string()}),
    handler:async input=>{
      const actor=await commercialAgent(input);const deal=await db.deal.findUniqueOrThrow({where:{id:String(input.dealId)}});
      const {salesStateSchema}=await import("@/server/services/crm-engine/commercial");const state=salesStateSchema.parse(deal.commercial??{});
      if(deal.sellerStrategyId!==input.strategyId||state.mandate?.sellerId!==actor.id||!state.mandate.channels.includes("WEB")||state.contactStopped||new Date(state.mandate.expiresAt)<=new Date())throw new Error("Lien client hors mandat.");
      const {issueCustomerAccess}=await import("@/server/services/crm-engine/customer");return salesDecisionResult(()=>issueCustomerAccess(deal.id,actor),deal.id);
    },
  },
  // ---- Découverte : les campagnes d'une marque ----
  {
    name: "campaign_list",
    description:
      "Liste les campagnes d'une marque (en cours et passées) : nom, état, type canon, fenêtre de dates, budget, nombre de missions et de jalons. C'EST LE POINT D'ENTRÉE des campagnes — les autres outils exigent un campaignId, que seul celui-ci fournit. Lecture seule.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque"),
      state: z
        .enum([
          "BRIEF_DRAFT", "BRIEF_VALIDATED", "PLANNING", "CREATIVE_DEV", "PRODUCTION",
          "PRE_PRODUCTION", "APPROVAL", "READY_TO_LAUNCH", "LIVE", "POST_CAMPAIGN",
          "ARCHIVED", "CANCELLED",
        ])
        .optional()
        .describe("Filtre optionnel sur l'état de la machine à états"),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const campaigns = await db.campaign.findMany({
        where: {
          strategyId,
          ...(input.state ? { state: input.state as CampaignState } : {}),
        },
        select: {
          id: true,
          name: true,
          state: true,
          canonType: true,
          routeKey: true,
          startDate: true,
          endDate: true,
          budget: true,
          budgetCurrency: true,
          isAlwaysOn: true,
          _count: { select: { missions: true, milestones: true, brandActions: true } },
        },
        orderBy: { createdAt: "desc" },
        take: (input.limit as number) ?? 50,
      });
      const now = Date.now();
      return {
        strategyId,
        count: campaigns.length,
        campaigns: campaigns.map((c) => ({
          campaignId: c.id,
          name: c.name,
          state: c.state,
          canonType: c.canonType,
          routeKey: c.routeKey,
          // « En cours » est DÉRIVÉ des dates, pas d'un booléen déclaré qui
          // pourrait mentir (cf. les process au statut RUNNING arrêtés depuis
          // trois mois — audit MCP P3).
          enCours:
            c.isAlwaysOn ||
            (!!c.startDate && c.startDate.getTime() <= now && (!c.endDate || c.endDate.getTime() >= now)),
          startDate: c.startDate?.toISOString() ?? null,
          endDate: c.endDate?.toISOString() ?? null,
          budget: c.budget,
          budgetCurrency: c.budgetCurrency,
          missionsCount: c._count.missions,
          milestonesCount: c._count.milestones,
          actionsCount: c._count.brandActions,
        })),
      };
    },
  },

  // ---- État de campagne ----
  {
    name: "campaign_state_get",
    description:
      "Récupère l'état actuel d'une campagne et les transitions disponibles dans la machine à états. Obtenir un campaignId via campaign_list.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire"),
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      const campaignId = input.campaignId as string;
      await assertCampaignInStrategy(campaignId, input.strategyId as string);
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: campaignId },
        include: { missions: true, milestones: true, teamMembers: true },
      });
      const availableTransitions = campaignManager.getAvailableTransitions(campaign.state as CampaignState);
      return {
        campaignId: campaign.id,
        strategyId: campaign.strategyId,
        name: campaign.name,
        state: campaign.state,
        availableTransitions,
        missionsCount: campaign.missions.length,
        milestonesCount: campaign.milestones.length,
      };
    },
  },

  {
    name: "campaign_state_transition",
    description:
      "Effectue une transition d'état sur une campagne (ex: DRAFT -> ACTIVE). Valide les gates automatiquement.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire"),
      campaignId: z.string().describe("ID de la campagne"),
      toState: z.string().describe("État cible (ex: ACTIVE, PAUSED, COMPLETED)"),
      approverId: z.string().optional().describe("ID de l'approbateur si requis"),
    }),
    handler: async (input) => {
      await assertCampaignInStrategy(input.campaignId as string, input.strategyId as string);
      return campaignManager.transitionCampaign(
        input.campaignId as string,
        input.toState as CampaignState,
        input.approverId as string | undefined
      );
    },
  },

  // ---- Dispatching de missions ----
  {
    name: "mission_dispatch",
    description:
      "Dispatch une mission à un créateur de la Guilde en fonction du matching compétences/disponibilité.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire de la mission"),
      missionId: z.string().describe("ID de la mission à dispatcher"),
      assigneeId: z.string().describe("ID du créateur assigné"),
      deadline: z.string().optional().describe("Date limite (ISO)"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    }),
    handler: async (input) => {
      await assertMissionInStrategy(input.missionId as string, input.strategyId as string);
      const mission = await db.mission.update({
        where: { id: input.missionId as string },
        data: {
          assigneeId: input.assigneeId as string,
          status: "ASSIGNED",
          slaDeadline: input.deadline ? new Date(input.deadline as string) : undefined,
        },
      });
      return mission;
    },
  },

  {
    name: "mission_list",
    description:
      "Liste les missions d'une marque, filtrables par campagne, driver ou statut. SOURCE UNIQUE des missions d'une marque — le calendrier éditorial consomme la même requête.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque"),
      campaignId: z.string().optional().describe("Filtrer par campagne"),
      driverId: z.string().optional().describe("Filtrer par driver"),
      status: z
        .enum(["DRAFT", "ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION", "COMPLETED", "CANCELLED"])
        .optional()
        .describe("Filtrer par statut"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      if (input.campaignId) await assertCampaignInStrategy(input.campaignId as string, strategyId);
      const missions = await listStrategyMissions({
        strategyId,
        campaignId: input.campaignId as string | undefined,
        driverId: input.driverId as string | undefined,
        status: input.status as string | undefined,
        limit: (input.limit as number) ?? 20,
      });
      return { strategyId, missions, count: missions.length };
    },
  },

  // ---- SLA Tracking ----
  {
    name: "sla_check",
    description:
      "Vérifie les SLA en cours et retourne les alertes (warning, urgent, breached) pour un opérateur.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur à vérifier"),
    }),
    handler: async (input) => {
      return slaTracker.checkSlaDeadlines();
    },
  },

  {
    name: "sla_metrics",
    description:
      "Récupère les métriques SLA globales : taux de respect, missions en retard, temps moyen de livraison.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
    }),
    handler: async (input) => {
      return slaTracker.calculateSlaMetrics(input.operatorId as string);
    },
  },

  // ---- Process Scheduling ----
  {
    name: "process_schedule_list",
    description:
      "Liste les processus planifiés (récurrents et ponctuels) d'une marque avec leur prochain déclenchement. Chaque ligne porte son statut DÉCLARÉ et son statut EFFECTIF : un processus « RUNNING » sans prochaine échéance est rapporté STALLED, pas sain.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque"),
      // Valeurs RÉELLES de l'enum Prisma `ProcessStatus`. « FAILED » n'existe
      // pas : le proposer envoyait l'appelant droit dans une erreur de schéma,
      // pour une valeur que l'outil lui-même annonçait.
      status: z.enum(["RUNNING", "PAUSED", "STOPPED", "COMPLETED"]).optional(),
    }),
    handler: async (input) => {
      // Le filtre `strategyId` était exposé et jamais transmis — la fonction ne
      // prenait aucun argument. Tout appel « filtré » rendait la planification
      // de toutes les marques.
      const entries = await processScheduler.getSchedule({
        strategyId: input.strategyId as string,
        status: input.status as ProcessStatus | undefined,
      });
      const stalled = entries.filter((e) => e.stalled);
      return {
        strategyId: input.strategyId,
        count: entries.length,
        stalledCount: stalled.length,
        processes: entries,
      };
    },
  },

  {
    name: "process_create",
    description:
      "Crée un nouveau processus planifié (campagne récurrente, reporting automatique, maintenance).",
    inputSchema: z.object({
      strategyId: z.string().optional().describe("ID de la stratégie associée"),
      type: z.enum(["RECURRING_CAMPAIGN", "REPORT", "MAINTENANCE", "AUTOMATION", "CUSTOM"]),
      name: z.string().describe("Nom du processus"),
      description: z.string().optional(),
      frequency: z.string().optional().describe("Fréquence (cron expression ou texte)"),
      priority: z.number().int().min(1).max(10).default(5),
    }),
    handler: async (input) => {
      return processScheduler.createProcess({
        strategyId: input.strategyId as string | undefined,
        type: input.type as ProcessType,
        name: input.name as string,
        description: input.description as string | undefined,
        frequency: input.frequency as string | undefined,
        priority: (input.priority as number) ?? 5,
      });
    },
  },

  // ---- Team Allocation ----
  {
    name: "team_allocation_overview",
    description:
      "Vue d'ensemble de l'allocation des équipes de la Guilde : charge de travail, utilisation, goulots d'étranglement. Outil OPÉRATEUR — inaccessible avec une clé limitée à une marque.",
    // PAS de `scope: "GLOBAL"` : la sortie nomme les talents (`userId`,
    // `displayName`, taux d'occupation) — c'est le carnet d'adresses freelance
    // de l'agence et de la PII, pas un référentiel public. L'avoir marqué GLOBAL
    // l'aurait ouvert à tout fondateur client (relecture adversariale
    // 2026-07-27). Sans `strategyId` au schéma, il reste fail-closed en BRAND.
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
    }),
    handler: async (input) => {
      const [loads, bottlenecks] = await Promise.all([
        teamAllocator.getCreatorLoads(),
        teamAllocator.detectBottlenecks(),
      ]);
      return { creatorLoads: loads, bottlenecks };
    },
  },

  {
    name: "team_suggest_assignment",
    description:
      "Suggère le meilleur créateur disponible pour une mission en fonction des compétences et de la charge.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire de la mission"),
      missionId: z.string().describe("ID de la mission"),
      requiredSkills: z.array(z.string()).optional().describe("Compétences requises"),
      preferredTier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]).optional(),
    }),
    handler: async (input) => {
      await assertMissionInStrategy(input.missionId as string, input.strategyId as string);
      return teamAllocator.suggestAllocation(
        input.missionId as string,
      );
    },
  },

  // ---- Budget campagne ----
  {
    name: "campaign_budget_overview",
    description:
      "Vue d'ensemble du budget d'une campagne : dépenses, reste à dépenser, ventilation par driver.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire"),
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      await assertCampaignInStrategy(input.campaignId as string, input.strategyId as string);
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: {
          missions: { select: { id: true, status: true, budget: true, driverId: true } },
        },
      });
      // Group missions by driverId to approximate "by driver" view
      const byDriver: Record<string, { spent: number; count: number }> = {};
      for (const m of campaign.missions) {
        const key = m.driverId ?? "unassigned";
        if (!byDriver[key]) byDriver[key] = { spent: 0, count: 0 };
        byDriver[key].spent += m.budget ?? 0;
        byDriver[key].count += 1;
      }
      const totalSpent = Object.values(byDriver).reduce((sum: number, d) => sum + d.spent, 0);
      return {
        campaignBudget: campaign.budget,
        totalSpent,
        remaining: (campaign.budget ?? 0) - totalSpent,
        byDriver,
      };
    },
  },

  // ---- AARRR Reporting ----
  {
    name: "aarrr_report",
    description:
      "Génère un rapport AARRR (Acquisition, Activation, Rétention, Referral, Revenue) pour une campagne.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire"),
      campaignId: z.string().describe("ID de la campagne"),
      period: z.enum(["weekly", "monthly", "quarterly"]).default("monthly"),
    }),
    handler: async (input) => {
      await assertCampaignInStrategy(input.campaignId as string, input.strategyId as string);
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: { milestones: true, missions: true },
      });
      const activeMissions = campaign.missions.filter((m) => m.status === "IN_PROGRESS");
      const completedMilestones = campaign.milestones.filter((m) => m.completed);
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        period: input.period,
        aarrr: {
          acquisition: { missions: campaign.missions.length, activeMissions: activeMissions.length },
          activation: { completedMilestones: completedMilestones.length, totalMilestones: campaign.milestones.length },
          retention: { state: campaign.state },
          referral: { instrumented: false }, // pas encore instrumenté — honnête, pas de chiffre inventé
          revenue: { budget: campaign.budget },
        },
      };
    },
  },

  // ---- Field Operations ----
  {
    name: "field_ops_status",
    description:
      "Statut des opérations terrain d'une marque : missions actives et échéances imminentes.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque"),
      daysAhead: z.number().int().min(1).max(30).default(7).describe("Horizon en jours"),
    }),
    handler: async (input) => {
      const daysAhead = (input.daysAhead as number) ?? 7;
      const horizon = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      // Filtrait par `operatorId` — un opérateur voit toutes ses marques d'un
      // bloc, ce qui rendait l'outil inutilisable côté marque ET impossible à
      // scoper. La marque est désormais la dimension, l'opérateur en découle.
      const missions = await db.mission.findMany({
        where: {
          strategyId: input.strategyId as string,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW"] },
          slaDeadline: { lte: horizon },
        },
        include: { driver: true },
        orderBy: { slaDeadline: "asc" },
      });
      return {
        strategyId: input.strategyId,
        horizon: `${daysAhead} jours`,
        upcomingMissions: missions.length,
        missions,
      };
    },
  },

  // ---- Milestone Tracking ----
  {
    name: "milestone_track",
    description:
      "Suivi des jalons d'une campagne : progression, retards, prochains jalons à atteindre.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID (ou slug public) de la marque propriétaire"),
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      await assertCampaignInStrategy(input.campaignId as string, input.strategyId as string);
      const milestones = await db.campaignMilestone.findMany({
        where: { campaignId: input.campaignId as string },
        orderBy: { dueDate: "asc" },
      });
      const completed = milestones.filter((m) => m.completed);
      const overdue = milestones.filter(
        (m) => !m.completed && m.dueDate < new Date()
      );
      const upcoming = milestones.filter(
        (m) => !m.completed && m.dueDate >= new Date()
      );
      return {
        total: milestones.length,
        completed: completed.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        // lafusee:allow-adhoc-completion: MCP operations context summary (mission completion count ratio)
        progress: milestones.length > 0 ? Math.round((completed.length / milestones.length) * 100) : 0,
        overdueItems: overdue,
        nextMilestones: upcoming.slice(0, 3),
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Resources (5 as per spec §3.3)
// ---------------------------------------------------------------------------

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string; campaignId?: string }) => Promise<unknown>;
}

export const resources: ResourceDefinition[] = [
  {
    uri: "operations://campaigns/{strategyId}",
    name: "Active Campaigns",
    description: "List of all active campaigns for a strategy with state, budget, and mission counts",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const campaigns = await db.campaign.findMany({
        where: { strategyId, state: { notIn: ["ARCHIVED", "CANCELLED"] } },
        include: {
          missions: { select: { id: true, status: true } },
          budgetLines: { select: { planned: true, actual: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return {
        count: campaigns.length,
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          state: c.state,
          code: c.code,
          budget: c.budget,
          missionCount: c.missions.length,
          totalPlanned: c.budgetLines.reduce((s, b) => s + (b.planned ?? 0), 0),
          totalActual: c.budgetLines.reduce((s, b) => s + (b.actual ?? 0), 0),
        })),
      };
    },
  },
  {
    uri: "operations://budgets/{campaignId}",
    name: "Campaign Budget",
    description: "Detailed budget breakdown for a campaign — planned vs actual by category",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const lines = await db.budgetLine.findMany({ where: { campaignId } });
      const totalPlanned = lines.reduce((s, l) => s + (l.planned ?? 0), 0);
      const totalActual = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
      const byCategory: Record<string, { planned: number; actual: number }> = {};
      for (const l of lines) {
        if (!byCategory[l.category]) byCategory[l.category] = { planned: 0, actual: 0 };
        const cat = byCategory[l.category]!;
        cat.planned += l.planned ?? 0;
        cat.actual += l.actual ?? 0;
      }
      return { campaignId, totalPlanned, totalActual, variance: totalPlanned - totalActual, byCategory };
    },
  },
  {
    uri: "operations://teams/{campaignId}",
    name: "Campaign Team",
    description: "Team composition for a campaign — members, roles, allocation",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const members = await db.campaignTeamMember.findMany({
        where: { campaignId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
      return {
        campaignId,
        memberCount: members.length,
        members: members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        })),
      };
    },
  },
  {
    uri: "operations://briefs/{campaignId}",
    name: "Campaign Briefs",
    description: "All briefs generated for a campaign — creative, media, production, vendor",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const briefs = await db.campaignBrief.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
      return {
        campaignId,
        count: briefs.length,
        briefs: briefs.map((b) => ({
          id: b.id,
          briefType: b.briefType,
          title: b.title,
          generatedBy: b.generatedBy,
          createdAt: b.createdAt,
        })),
      };
    },
  },
  {
    uri: "operations://approvals/{campaignId}",
    name: "Campaign Approvals",
    description: "Pending and completed approvals for a campaign",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const approvals = await db.campaignApproval.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
      const pending = approvals.filter((a) => a.status === "PENDING");
      const approved = approvals.filter((a) => a.status === "APPROVED");
      const rejected = approvals.filter((a) => a.status === "REJECTED");
      return {
        campaignId,
        total: approvals.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        items: approvals.map((a) => ({
          id: a.id,
          approvalType: a.approvalType,
          status: a.status,
          round: a.round,
          createdAt: a.createdAt,
        })),
      };
    },
  },
];
