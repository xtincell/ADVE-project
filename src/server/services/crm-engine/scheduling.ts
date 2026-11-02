/** Dates are business authority, not an instruction inferred by the model. */
import { createHash } from "node:crypto";
import type { Deal, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { salesPlanSchema, salesStateSchema, type SalesActor, type SalesState, type SalesStep } from "./commercial";

type Tx = Prisma.TransactionClient;
type Plan = NonNullable<SalesState["nextPlan"]>;
const sellingNodes = ["DISCOVERY", "QUALIFIED", "PROPOSAL", "OBJECTION"];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const refusal = (message: string): never => { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); };
export const datedSalesRequestId = (dealId: string, planId: string) => `deadline:${dealId}:${planId}`;

/** One immutable owner authorization, one member, one first-contact schedule. Server only. */
export function firstContactSalesPlan(mandate: NonNullable<SalesState["mandate"]>, requestId: string, now: Date) {
  const policy = mandate.outreachPolicy;
  if (!policy) return undefined;
  const id = createHash("sha256").update(JSON.stringify([requestId, mandate.portfolioMemberId])).digest("hex");
  return salesPlanSchema.parse({ id, basis: "OWNER", purpose: "FIRST_CONTACT",
    action: "Prendre contact sur le canal approuvé, qualifier le besoin et le payeur sans inventer d’offre.",
    channel: mandate.outboundEmailEnabled && mandate.channels.includes("EMAIL") ? "EMAIL" : mandate.channels[0],
    dueAt: policy.firstContactAt, sellerId: mandate.sellerId, createdAt: now.toISOString() });
}

/** Same-brand identity only. A shared address never merges brands or authorizations. */
async function stoppedContactIn(tx: Tx, deal: Deal) {
  const state = salesStateSchema.parse(deal.commercial ?? {});
  const identity: Prisma.DealWhereInput[] = [{ id: deal.id }];
  if (deal.contactEmail) identity.push({ contactEmail: { equals: deal.contactEmail, mode: "insensitive" } });
  if (deal.contactPhone) identity.push({ contactPhone: deal.contactPhone });
  if (state.mandate?.portfolioMemberId) identity.push({ commercial: { path: ["mandate", "portfolioMemberId"], equals: state.mandate.portfolioMemberId } });
  return !!(await tx.deal.findFirst({ where: { sellerStrategyId: deal.sellerStrategyId,
    AND: [{ OR: identity }, { OR: [{ commercial: { path: ["contactStopped"], equals: true } }, { commercial: { path: ["node"], equals: "STOPPED" } }] }] }, select: { id: true } }));
}

async function uncertainIn(tx: Tx, dealId: string) {
  return !!(await tx.cRMActivity.findFirst({ where: { dealId, activityType: { in: ["SALES_EMAIL_PENDING", "SALES_EMAIL_UNCERTAIN"] } }, select: { id: true } })) ||
    !!(await tx.salesRun.findFirst({ where: { dealId, status: "AMBIGUOUS" }, select: { id: true } }));
}

/** A confirmed transport receipt is required; a promise, pending send or model answer is not an anchor. */
async function confirmedTouchesIn(tx: Tx, dealId: string) {
  const rows = await tx.cRMActivity.findMany({ where: { dealId, activityType: { in: ["SALES_EMAIL_SENT", "SALES_WEB_SENT"] } },
    orderBy: [{ performedAt: "asc" }, { id: "asc" }], take: 100,
    select: { id: true, activityType: true, performedAt: true, metadata: true } });
  return rows.map(row => {
    const metadata = row.metadata as { confirmedAt?: string } | null;
    const confirmed = metadata?.confirmedAt ? new Date(metadata.confirmedAt) : row.performedAt;
    return { id: row.id, at: Number.isFinite(confirmed.getTime()) ? confirmed : row.performedAt,
      channel: row.activityType === "SALES_EMAIL_SENT" ? "EMAIL" as const : "WEB" as const };
  });
}

/** Consecutive approved delays start at actual confirmed contacts, never at an uncertain attempt. */
export async function approvedCadencePlanIn(tx: Tx, deal: Deal, state: SalesState, now = new Date()): Promise<Plan | undefined> {
  const mandate = state.mandate, policy = mandate?.outreachPolicy;
  if (!mandate || !policy || state.cadenceSuspended || !sellingNodes.includes(state.node)) return undefined;
  const touches = await confirmedTouchesIn(tx, deal.id);
  if (!touches.length || touches.length > policy.followUpAfterDays.length) return undefined;
  const last = touches.at(-1)!;
  const holder = await tx.salesRepresentative.findFirst({ where: { strategyId: deal.sellerStrategyId ?? "__none__",
    ...(mandate.sellerId.startsWith("mcp:") ? { mcpKeyId: mandate.sellerId.slice(4) } : { humanUserId: mandate.sellerId }) }, select: { conversationId: true } });
  if (holder?.conversationId && await tx.message.findFirst({ where: { conversationId: holder.conversationId,
    channel: "SALES_MANAGER", content: "État du vendeur : PAUSED", createdAt: { gt: last.at } }, select: { id: true } })) return undefined;
  // A real response ends the silence cadence. A new owner/client appointment may replace it explicitly.
  if (await tx.crmMessage.findFirst({ where: { salesDealId: deal.id, direction: "IN", status: "RECEIVED", createdAt: { gte: touches[0]!.at } }, select: { id: true } })) return undefined;
  const cadenceIndex = touches.length - 1;
  const delay = Math.max(policy.followUpAfterDays[cadenceIndex]! * DAY, policy.minIntervalHours * HOUR);
  const dueAt = new Date(last.at.getTime() + delay);
  if (dueAt >= new Date(mandate.expiresAt) || !mandate.channels.includes(last.channel)) return undefined;
  const id = createHash("sha256").update(JSON.stringify([mandate.portfolioAuthorizationId ?? mandate.offerVersion, last.id, cadenceIndex])).digest("hex");
  return { id, basis: "APPROVED_CADENCE", purpose: "FOLLOW_UP",
    action: "Effectuer uniquement la reprise de contact autorisée si le prospect reste silencieux, puis respecter sa réponse.",
    channel: last.channel, dueAt: dueAt.toISOString(), sellerId: mandate.sellerId,
    createdAt: now.toISOString(), anchorSentAt: last.at.toISOString(), cadenceIndex };
}

/** Root calls this before advanceSale; no model-supplied cadence/date can widen the approved policy. */
export async function prepareSalesPlanIn(tx: Tx, dealId: string, previous: SalesState, step: SalesStep, actor: SalesActor, now = new Date()): Promise<SalesStep> {
  const command = step.command;
  if (command.type !== "PLAN_NEXT_ACTION") return step;
  const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
  if (command.basis === "OWNER" && !actor.admin) refusal("Seul le mandant peut dater une action propriétaire.");
  if (command.basis === "CUSTOMER_REQUEST") {
    const message = command.customerMessageId ? await tx.crmMessage.findUnique({ where: { id: command.customerMessageId } }) : null;
    if (!message || message.salesDealId !== dealId || message.direction !== "IN" || message.status !== "RECEIVED" ||
      !command.nextDeadline || new Date(command.nextDeadline) <= message.createdAt) refusal("La date doit référencer une demande reçue de ce client sur cette affaire.");
  }
  if (command.basis === "APPROVED_CADENCE") {
    if (command.purpose !== "FOLLOW_UP") refusal("La cadence approuvée ne définit pas de nouvelle revue ou vente.");
    if (await uncertainIn(tx, dealId)) refusal("Un envoi ou une exécution attend sa réconciliation ; aucune reprise n’est autorisée.");
    const plan = await approvedCadencePlanIn(tx, deal, previous, now) ?? refusal("Aucune reprise de silence n’est autorisée par les reçus et le mandat actuels.");
    return { ...step, channel: plan.channel, command: { ...command, nextDeadline: plan.dueAt } };
  }
  return step;
}

/** Revalidate the signed run requestId before claim and again before any effect. No model authority here. */
export async function validateDatedSalesRunIn(tx: Tx, input: { requestId: string; dealId?: string | null; representativeId: string }, now = new Date()): Promise<{ allowed: boolean; reason?: string; internalOnly: boolean }> {
  if (!input.requestId.startsWith("deadline:")) return { allowed: true, internalOnly: false };
  const denied = (reason: string, internalOnly = false) => ({ allowed: false, reason, internalOnly });
  if (!input.dealId) return denied("Échéance sans affaire.");
  const [deal, profile] = await Promise.all([
    tx.deal.findUnique({ where: { id: input.dealId } }), tx.salesRepresentative.findUnique({ where: { id: input.representativeId } }),
  ]);
  if (!deal || !profile) return denied("Affaire ou titulaire absent.");
  const parsed = salesStateSchema.safeParse(deal.commercial);
  if (!parsed.success) return denied("État commercial illisible.");
  const state = parsed.data, mandate = state.mandate, plan = state.nextPlan;
  const internalOnly = plan?.purpose === "VALUE_REVIEW";
  if (!mandate || !plan || datedSalesRequestId(deal.id, plan.id) !== input.requestId) return denied("Échéance remplacée ou supprimée.");
  const principal = profile.mode === "AI" ? `mcp:${profile.mcpKeyId}` : profile.humanUserId;
  if (profile.status !== "ACTIVE" || profile.strategyId !== deal.sellerStrategyId || mandate.sellerId !== principal || plan.sellerId !== principal) return denied("Titulaire suspendu ou mandat transmis.", internalOnly);
  if (profile.conversationId && await tx.message.findFirst({ where: { conversationId: profile.conversationId,
    channel: "SALES_MANAGER", content: "État du vendeur : PAUSED", createdAt: { gt: new Date(plan.createdAt) } }, select: { id: true } })) return denied("Le vendeur a été suspendu depuis cette planification ; faire approuver une nouvelle date.", internalOnly);
  if (profile.mode === "AI") {
    const key = profile.mcpKeyId ? await tx.mcpApiKey.findUnique({ where: { id: profile.mcpKeyId }, select: { isActive: true, expiresAt: true, scopeKind: true, scopeStrategyId: true } }) : null;
    if (!key?.isActive || (key.expiresAt && key.expiresAt <= now) || key.scopeKind !== "BRAND" || key.scopeStrategyId !== deal.sellerStrategyId) return denied("Accès commercial révoqué ou hors marque.", internalOnly);
  }
  if (new Date(mandate.expiresAt) <= now || new Date(plan.dueAt) > now || state.nextDeadline !== plan.dueAt || !mandate.channels.includes(plan.channel)) return denied("Date future, mandat expiré ou canal modifié.", internalOnly);
  if (state.contactStopped || state.node === "STOPPED" || await stoppedContactIn(tx, deal)) return denied("Contact arrêté pour cette marque.", internalOnly);
  if (await uncertainIn(tx, deal.id)) return denied("Envoi ou exécution incertain : réconciliation nécessaire.", internalOnly);
  if (internalOnly) return state.node === "DELIVERED" ? { allowed: true, internalOnly: true } : denied("La remise n’est pas prouvée.", true);
  if (!sellingNodes.includes(state.node)) return denied("Le cycle ne permet plus cette sollicitation.");
  const since = plan.anchorSentAt ?? plan.createdAt;
  if (await tx.crmMessage.findFirst({ where: { salesDealId: deal.id, direction: "IN", status: "RECEIVED", createdAt: { gt: new Date(since) } }, select: { id: true } })) return denied("Une nouvelle réponse a remplacé le rappel de silence.");
  if (plan.basis === "APPROVED_CADENCE") {
    const current = await approvedCadencePlanIn(tx, deal, state, now);
    if (!current || current.dueAt !== plan.dueAt || current.channel !== plan.channel || (plan.cadenceIndex !== undefined && current.id !== plan.id)) return denied("La cadence ou son reçu d’ancrage a évolué.");
  }
  return { allowed: true, internalOnly: false };
}

/** Frozen instruction is identical on poll replay; values are explicit, not model-derived dates. */
export function datedSalesInstruction(plan: Plan) {
  return plan.purpose === "VALUE_REVIEW"
    ? `Revue interne datée ${plan.dueAt} : ${plan.action} Relire les preuves et le retour client. Aucune nouvelle sollicitation, décision, livraison, facture ou reconduction n’est autorisée par cette échéance. Signaler le résultat à la supervision.`
    : `Action commerciale autorisée à ${plan.dueAt} sur ${plan.channel} : ${plan.action} Relire l’affaire et les reçus. Une nouvelle réponse, un STOP, une pause, un mandat expiré ou une tentative incertaine annule cette reprise. Ne pas inventer une cadence, un paiement, une livraison ou une promesse hors mandat.`;
}
