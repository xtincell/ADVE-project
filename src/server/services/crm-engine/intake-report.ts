/** Bind the customer's existing diagnostic to the paid PDF sold in this dossier.
 * No seller-brand extraction, substitute payment, or new report renderer. */
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Deal, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { commercialQuoteOutputSchema } from "../artemis/tools/commercial-offer-schemas";
import { salesStateSchema, type SalesState } from "./commercial";
import { serialSalesTransaction } from "./transaction";
import { recordInboundSalesMessageIn } from "./fleet";
import { salesAmountToMinor } from "./payment-money";

type Tx = Prisma.TransactionClient;
export type SalesIntakeReportClient = Pick<Tx, "deal" | "quickIntake" | "strategy" | "cRMActivity" | "intakePayment" | "gloryOutput" | "user">;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailKey = (value: string) => value.trim().normalize("NFKC").toLowerCase();
const nameKey = (value: string) => value.trim().normalize("NFKC").replace(/\s+/g, " ").toLowerCase();
const bindingId = (dealId: string) => `sales-intake-link:${dealId}`;
const entitlementId = (reference: string) => `sales-intake-report:${reference}`;
const preparationId = (reference: string) => `sales-intake-preparation:${reference}`;
const deliveryId = (reference: string) => `sales-intake-delivery:${reference}`;
function fail(message: string): never { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }
function changed(): never { throw new TRPCError({ code: "CONFLICT", message: "Le diagnostic ou cette proposition a changé. Relisez la conversation avant de continuer." }); }
const required = (state: SalesState) => !state.mandate?.informationOnly && state.mandate?.pricingRule?.tierKey === "INTAKE_PDF";
const bindingSchema = z.object({
  version: z.literal(1), requestId: z.string().uuid(), consent: z.literal(true),
  intakeId: z.string(), buyerStrategyId: z.string(), sellerStrategyId: z.string(),
  offerId: z.string(), offerVersion: z.string(), proposalId: z.string().uuid(),
  amount: z.number().finite().nonnegative(), currency: z.string(),
  companyName: z.string(), quotedClientName: z.string(), tokenHash: z.string().length(64), emailHash: z.string().length(64),
}).strict();
export const linkCustomerSalesDiagnosticInput = z.object({
  requestId: z.string().uuid(), intakeToken: z.string().trim().min(1).max(2000),
  email: z.string().trim().email().max(320), consent: z.literal(true),
}).strict();

/** A result URL is accepted only for this deployment; never fetched. */
export function parseSalesDiagnosticToken(value: string, publicBaseUrl: string) {
  const raw = value.trim();
  if (/^[a-zA-Z0-9_-]{10,200}$/.test(raw)) return raw;
  try {
    const base = new URL(publicBaseUrl), url = new URL(raw, base);
    const match = url.pathname.match(/^\/intake\/([a-zA-Z0-9_-]{10,200})\/result\/?$/);
    if (url.origin === base.origin && !url.username && !url.password && !url.search && !url.hash && match) return match[1]!;
  } catch { /* Invalid addresses grant no diagnostic access. */ }
  throw new TRPCError({ code: "BAD_REQUEST", message: "Utilisez le lien de résultat de votre diagnostic sur ce site, ou son identifiant." });
}

async function quoteClientIn(client: SalesIntakeReportClient, deal: Deal, state: SalesState) {
  const proposal = state.proposal, mandate = state.mandate;
  if (!required(state) || !proposal || !proposal.presentedAt || proposal.quantity !== 1 || proposal.billing !== "ONE_TIME"
    || proposal.offerId !== mandate?.offerId || proposal.sourceVersion !== mandate.offerVersion
    || proposal.amount !== mandate.amount || proposal.currency !== mandate.currency) fail("Présentez d’abord le devis de ce rapport et ses conditions au client.");
  const output = await client.gloryOutput.findFirst({ where: { id: proposal.gloryOutputId, strategyId: deal.sellerStrategyId!, toolSlug: "devis-generator" }, select: { output: true } });
  const parsed = commercialQuoteOutputSchema.safeParse(output?.output);
  const quote = parsed.success ? parsed.data.devis : null, group = quote?.groups[0], line = quote?.lines[0];
  if (!quote || quote.status !== "READY" || quote.client?.reference !== deal.id || !quote.client.name.trim()
    || quote.groups.length !== 1 || quote.lines.length !== 1 || group?.total !== proposal.amount || group.currency !== proposal.currency
    || group.billing !== proposal.billing || line?.offerId !== proposal.offerId || line.quantity !== 1
    || line.unitPrice !== proposal.unitPrice || nameKey(quote.client.name) !== nameKey(deal.companyName)) fail("Le devis conservé doit correspondre exactement à cette affaire et à son client.");
  return quote.client.name;
}

async function linkedIn(client: SalesIntakeReportClient, deal: Deal, state: SalesState) {
  const row = await client.cRMActivity.findUnique({ where: { id: bindingId(deal.id) } });
  const parsed = bindingSchema.safeParse(row?.metadata);
  if (!row || row.dealId !== deal.id || row.activityType !== "SALES_CUSTOMER_DIAGNOSTIC_LINKED" || !parsed.success) return null;
  const link = parsed.data, proposal = state.proposal, mandate = state.mandate;
  if (!required(state) || link.intakeId !== deal.intakeId || link.buyerStrategyId !== deal.strategyId
    || link.sellerStrategyId !== deal.sellerStrategyId || link.buyerStrategyId === deal.sellerStrategyId
    || link.offerId !== mandate?.offerId || link.offerVersion !== mandate.offerVersion
    || link.proposalId !== proposal?.id || link.amount !== proposal.amount || link.currency !== proposal.currency
    || !deal.contactEmail || link.emailHash !== hash(emailKey(deal.contactEmail))) return null;
  const intake = await client.quickIntake.findUnique({ where: { id: link.intakeId } });
  if (!intake || !["COMPLETED", "CONVERTED"].includes(intake.status) || intake.quarantinedAt
    || intake.convertedToId !== link.buyerStrategyId || hash(intake.shareToken) !== link.tokenHash
    || hash(emailKey(intake.contactEmail)) !== link.emailHash || nameKey(intake.companyName) !== nameKey(link.companyName)) return null;
  const buyer = await client.strategy.findUnique({ where: { id: link.buyerStrategyId }, select: { id: true, status: true } });
  if (!buyer || ["ARCHIVED", "DELETED"].includes(buyer.status)) return null;
  let quotedName: string;
  try { quotedName = await quoteClientIn(client, deal, state); }
  catch (error) { if (error instanceof TRPCError) return null; throw error; }
  if (nameKey(quotedName) !== nameKey(link.quotedClientName)) return null;
  return { link, intake, buyer };
}

async function verifiedPaymentIn(client: SalesIntakeReportClient, deal: Deal, state: SalesState, reference: string) {
  const payment = await client.intakePayment.findUnique({ where: { reference } });
  if (!payment || payment.tierKey !== "SALES_COLLECTION" || !["CINETPAY", "MANUAL_WA"].includes(payment.provider)
    || payment.status !== "PAID" || !payment.paidAt || !payment.providerRef
    || payment.intakeToken !== `sales-deal:${deal.id}` || deal.paymentReference !== reference || state.mandate?.intakePaymentReference !== reference
    || !state.proposal || payment.amount !== salesAmountToMinor(state.proposal.amount, payment.currency)
    || payment.currency !== state.proposal.currency) return null;
  if (payment.provider === "MANUAL_WA") {
    if (state.mandate.collection?.mode !== "MANUAL" || !payment.providerEventId) return null;
    const allocation = await client.cRMActivity.findUnique({ where: { id: payment.providerEventId } });
    const allocated = allocation?.metadata as { paymentReference?: string; externalReference?: string; requestId?: string; amountMinor?: number; currency?: string } | null;
    if (!allocation || allocation.dealId !== deal.id || allocation.activityType !== "SALES_PAYMENT_ALLOCATION" || !allocation.performedBy
      || allocation.performedBy.startsWith("mcp:") || !payment.providerEventId.startsWith("sales-payment-external:")
      || allocated?.paymentReference !== reference || allocated.externalReference !== payment.providerRef || !allocated.requestId
      || allocated.amountMinor !== payment.amount || allocated.currency !== payment.currency) return null;
    const proof = await client.cRMActivity.findUnique({ where: { id: `sales-payment:${allocated.requestId}` } });
    const human = proof?.metadata as { independentHumanProof?: boolean; independentProviderProof?: boolean; verifiedBy?: string;
      allocationId?: string; proposalId?: string; paymentReference?: string; amountMinor?: number; currency?: string;
      externalReference?: string; evidence?: string } | null;
    if (!proof || proof.dealId !== deal.id || proof.activityType !== "SALES_PAYMENT_RECONCILED" || proof.performedBy !== allocation.performedBy
      || human?.independentHumanProof !== true || human.independentProviderProof === true || human.verifiedBy !== proof.performedBy
      || human.allocationId !== allocation.id || human.proposalId !== state.proposal.id || human.paymentReference !== reference
      || human.amountMinor !== payment.amount || human.currency !== payment.currency || human.externalReference !== payment.providerRef
      || typeof human.evidence !== "string" || !human.evidence.trim()) return null;
    const actor = await client.user.findUnique({ where: { id: allocation.performedBy }, select: { id: true, role: true, email: true } });
    if (!actor || (actor.id !== state.mandate.collection.financeOwnerId && actor.role !== "ADMIN" && !isGodModeEmail(actor.email))) return null;
    return { payment, proof };
  }
  if (state.mandate.collection?.mode !== "CINETPAY" || !payment.notificationTokenHash) return null;
  const proof = await client.cRMActivity.findUnique({ where: { id: `sales-cinetpay-paid:${reference}` } });
  const metadata = proof?.metadata as { independentProviderProof?: boolean; proposalId?: string; amountMinor?: number; currency?: string; providerRef?: string; paymentReference?: string } | null;
  if (!proof || proof.dealId !== deal.id || proof.activityType !== "SALES_PAYMENT_RECONCILED" || metadata?.independentProviderProof !== true
    || metadata.paymentReference !== reference || metadata.proposalId !== state.proposal?.id || metadata.amountMinor !== payment.amount
    || metadata.currency !== payment.currency || metadata.providerRef !== payment.providerRef) return null;
  return { payment, proof };
}

/** This is a view of an actually paid right, not another IntakePayment. */
async function entitlementIn(client: SalesIntakeReportClient, reference: string) {
  const grant = await client.cRMActivity.findUnique({ where: { id: entitlementId(reference) } });
  const deal = grant ? await client.deal.findUnique({ where: { id: grant.dealId } }) : null;
  if (!grant || !deal || grant.activityType !== "SALES_INTAKE_REPORT_ENTITLEMENT") return null;
  const state = salesStateSchema.parse(deal.commercial ?? {}), linked = await linkedIn(client, deal, state);
  const verified = linked ? await verifiedPaymentIn(client, deal, state, reference) : null;
  const data = grant.metadata as { intakeId?: string; buyerStrategyId?: string; proposalId?: string; paymentReference?: string; bindingId?: string; amountMinor?: number; currency?: string } | null;
  if (!linked || !verified || data?.intakeId !== linked.intake.id || data.buyerStrategyId !== linked.buyer.id
    || data.proposalId !== state.proposal?.id || data.paymentReference !== reference || data.bindingId !== bindingId(deal.id)
    || data.amountMinor !== verified.payment.amount || data.currency !== verified.payment.currency) return null;
  return { grant, deal, state, ...linked, ...verified };
}

export async function readSalesIntakeReportAccessIn(client: SalesIntakeReportClient, intakeToken: string, exceptDealId?: string) {
  const intake = await client.quickIntake.findUnique({ where: { shareToken: intakeToken }, select: { id: true } });
  if (!intake) return null;
  const candidates = await client.cRMActivity.findMany({ where: { activityType: "SALES_INTAKE_REPORT_ENTITLEMENT",
    metadata: { path: ["intakeId"], equals: intake.id } }, orderBy: { performedAt: "desc" }, take: 50 });
  for (const row of candidates) {
    if (row.dealId === exceptDealId) continue;
    const reference = (row.metadata as { paymentReference?: unknown } | null)?.paymentReference;
    if (typeof reference !== "string") continue;
    const right = await entitlementIn(client, reference);
    if (right && right.intake.id === intake.id && right.intake.shareToken === intakeToken) return right;
  }
  return null;
}
async function alreadyAvailableIn(client: SalesIntakeReportClient, intakeToken: string, exceptDealId?: string) {
  const direct = await client.intakePayment.findFirst({ where: { intakeToken, status: "PAID", OR: [{ tierKey: { not: "SALES_COLLECTION" } }, { tierKey: null }] }, select: { reference: true } });
  return Boolean(direct || await readSalesIntakeReportAccessIn(client, intakeToken, exceptDealId));
}

/** Must run inside the same transaction before a new payment is reserved. */
export async function assertSalesIntakeReportReadyIn(tx: Tx, deal: Deal, state: SalesState, email?: string) {
  if (!required(state)) return null;
  const linked = await linkedIn(tx, deal, state);
  if (!linked) fail("Associez le diagnostic finalisé de votre entreprise à cette conversation avant de payer ce rapport.");
  if (email && hash(emailKey(email)) !== linked.link.emailHash) fail("Utilisez l’adresse e-mail associée à votre diagnostic pour ce paiement.");
  if (!deal.paymentReference) {
    await tx.$queryRaw`SELECT id FROM "QuickIntake" WHERE id=${linked.intake.id} FOR UPDATE`;
    if (await alreadyAvailableIn(tx, linked.intake.shareToken)) fail("Ce rapport est déjà accessible. Ouvrez votre diagnostic ; aucun nouveau règlement n’est nécessaire.");
    if (linked.buyer.status !== "QUICK_INTAKE") fail("Cette marque est déjà activée. L’équipe doit vérifier la prestation utile avant un nouveau règlement.");
    const pending = await tx.deal.findFirst({ where: { intakeId: linked.intake.id, id: { not: deal.id }, paymentReference: { not: null } }, select: { paymentReference: true } });
    if (pending?.paymentReference && (await tx.intakePayment.findUnique({ where: { reference: pending.paymentReference }, select: { status: true } }))?.status === "PENDING") fail("Une demande de règlement existe déjà pour ce diagnostic. Reprenez cette demande avant de continuer.");
  }
  return linked;
}

export async function salesIntakeReportProjectionIn(client: SalesIntakeReportClient, deal: Deal, state: SalesState) {
  if (!required(state)) return null;
  const linked = await linkedIn(client, deal, state);
  const canLink = !deal.paymentReference && !state.contactStopped && ["PROPOSAL", "OBJECTION", "ACCEPTED"].includes(state.node)
    && Boolean(state.proposal?.presentedAt) && Date.parse(state.mandate!.expiresAt) > Date.now();
  const available = linked ? await alreadyAvailableIn(client, linked.intake.shareToken) : false;
  const preparation = deal.paymentReference ? await client.cRMActivity.findUnique({ where: { id: preparationId(deal.paymentReference) }, select: { metadata: true } }) : null;
  const preparationState = preparation?.metadata as { status?: string; startedAt?: string } | null;
  const status = preparationState?.status;
  const startedAt = Date.parse(preparationState?.startedAt ?? "");
  const preparationNeedsReview = status === "FAILED" || (status === "PROCESSING" &&
    (!Number.isFinite(startedAt) || Date.now() - startedAt > 15 * 60000));
  return { required: true, linked: Boolean(linked), canLink: canLink && !linked, companyName: linked?.intake.companyName ?? null,
    alreadyAvailable: available && !deal.paymentReference,
    ...(available && linked && !deal.paymentReference ? { reportUrl: `/api/intake/${linked.intake.shareToken}/pdf` } : {}),
    preparation: preparationNeedsReview ? "NEEDS_REVIEW" as const : status === "DONE" ? "READY" as const : status === "PROCESSING" ? "PREPARING" as const : "NOT_STARTED" as const };
}

export async function linkCustomerSalesDiagnostic(token: string, raw: z.input<typeof linkCustomerSalesDiagnosticInput>, publicBaseUrl: string) {
  const input = linkCustomerSalesDiagnosticInput.parse(raw), intakeToken = parseSalesDiagnosticToken(input.intakeToken, publicBaseUrl);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation indisponible." });
  return serialSalesTransaction(async tx => {
    const existing = await tx.deal.findUnique({ where: { customerAccessTokenHash: hash(token) } });
    if (!existing?.sellerStrategyId) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation indisponible." });
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id=${existing.id} FOR UPDATE`;
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: existing.id } });
    const state = salesStateSchema.parse(deal.commercial ?? {});
    const prior = await tx.cRMActivity.findUnique({ where: { id: bindingId(deal.id) } });
    if (prior) {
      const parsed = bindingSchema.safeParse(prior.metadata);
      if (!parsed.success || parsed.data.tokenHash !== hash(intakeToken) || parsed.data.emailHash !== hash(emailKey(input.email))) changed();
      return { diagnostic: await salesIntakeReportProjectionIn(tx, deal, state) };
    }
    if (!required(state) || state.contactStopped || !["PROPOSAL", "OBJECTION", "ACCEPTED"].includes(state.node)
      || Date.parse(state.mandate!.expiresAt) <= Date.now() || deal.paymentReference) changed();
    const seller = await tx.strategy.findUnique({ where: { id: deal.sellerStrategyId! }, select: { status: true } });
    if (!seller || ["ARCHIVED", "DELETED"].includes(seller.status)) changed();
    const intake = await tx.quickIntake.findUnique({ where: { shareToken: intakeToken } });
    if (!intake || !["COMPLETED", "CONVERTED"].includes(intake.status) || intake.quarantinedAt || !intake.convertedToId
      || emailKey(intake.contactEmail) !== emailKey(input.email) || intake.convertedToId === deal.sellerStrategyId
      || (deal.contactEmail && emailKey(deal.contactEmail) !== emailKey(intake.contactEmail))
      || (deal.intakeId && deal.intakeId !== intake.id) || (deal.strategyId && deal.strategyId !== intake.convertedToId)) fail("Utilisez le diagnostic finalisé de votre entreprise et l’adresse e-mail qui lui est associée.");
    const buyer = await tx.strategy.findUnique({ where: { id: intake.convertedToId! }, select: { id: true, status: true } });
    const quotedClientName = await quoteClientIn(tx, deal, state);
    if (!buyer || ["ARCHIVED", "DELETED"].includes(buyer.status)) fail("Le diagnostic associé n’est plus disponible pour cette prestation.");
    if (buyer.status !== "QUICK_INTAKE" && !await alreadyAvailableIn(tx, intake.shareToken)) fail("Cette marque est déjà activée. L’équipe doit vérifier le rapport utile avant un nouveau règlement.");
    const link = bindingSchema.parse({ version: 1, requestId: input.requestId, consent: true, intakeId: intake.id, buyerStrategyId: buyer.id,
      sellerStrategyId: deal.sellerStrategyId, offerId: state.mandate!.offerId, offerVersion: state.mandate!.offerVersion,
      proposalId: state.proposal!.id, amount: state.proposal!.amount, currency: state.proposal!.currency,
      companyName: intake.companyName, quotedClientName, tokenHash: hash(intakeToken), emailHash: hash(emailKey(input.email)) });
    await tx.deal.update({ where: { id: deal.id }, data: { intakeId: intake.id, strategyId: buyer.id, contactEmail: emailKey(intake.contactEmail), revision: { increment: 1 } } });
    await tx.cRMActivity.create({ data: { id: bindingId(deal.id), dealId: deal.id, activityType: "SALES_CUSTOMER_DIAGNOSTIC_LINKED",
      description: "Le client a associé son diagnostic finalisé au rapport présenté dans ce devis.", metadata: link } });
    await recordInboundSalesMessageIn(tx, { dealId: deal.id, channel: "WEB", externalId: `diagnostic:${input.requestId}`,
      body: `J’associe le diagnostic finalisé de ${intake.companyName} à ce devis de rapport PDF. Je consens à son utilisation pour cette prestation. Aucun nouveau paiement n’a été confirmé par cette association.` });
    return { diagnostic: await salesIntakeReportProjectionIn(tx, { ...deal, intakeId: intake.id, strategyId: buyer.id, contactEmail: emailKey(intake.contactEmail) }, state) };
  });
}

/** Called only after the independent PSP receipt is persisted in this transaction. */
export async function grantSalesIntakeReportIn(tx: Tx, dealId: string, reference: string) {
  const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } }), state = salesStateSchema.parse(deal.commercial ?? {});
  if (!required(state)) return null;
  const linked = await linkedIn(tx, deal, state), verified = linked ? await verifiedPaymentIn(tx, deal, state, reference) : null;
  if (!linked || !verified) fail("Le droit au rapport doit être lié au diagnostic du client et à un paiement effectivement vérifié.");
  const id = entitlementId(reference), previous = await tx.cRMActivity.findUnique({ where: { id } });
  const metadata = { intakeId: linked.intake.id, buyerStrategyId: linked.buyer.id, proposalId: state.proposal!.id,
    paymentReference: reference, bindingId: bindingId(deal.id), amountMinor: verified.payment.amount, currency: verified.payment.currency };
  if (previous) {
    if (!await entitlementIn(tx, reference)) changed();
  } else await tx.cRMActivity.create({ data: { id, dealId, activityType: "SALES_INTAKE_REPORT_ENTITLEMENT",
    description: "Accès au rapport du client acquis par le règlement vérifié de cette affaire.", metadata } });
  return { entitlementId: id, intakeId: linked.intake.id };
}

/** A durable trigger; replayed webhooks do not regenerate a paid report again. */
export async function claimSalesIntakePreparation(reference: string) {
  return serialSalesTransaction(async tx => {
    const right = await entitlementIn(tx, reference);
    if (!right) return null;
    const id = preparationId(reference);
    if (await tx.cRMActivity.findUnique({ where: { id } })) return null;
    const applicable = right.buyer.status === "QUICK_INTAKE";
    await tx.cRMActivity.create({ data: { id, dealId: right.deal.id, activityType: "SALES_INTAKE_REPORT_PREPARATION",
      description: applicable ? "Actualisation du rapport payé demandée au traitement existant." : "Actualisation à vérifier : la marque est déjà activée, aucune réécriture forcée.",
      metadata: { paymentReference: reference, intakeId: right.intake.id, buyerStrategyId: right.buyer.id,
        status: applicable ? "PROCESSING" : "FAILED", startedAt: new Date().toISOString() } } });
    return applicable ? { token: right.intake.shareToken } : null;
  });
}
export async function finishSalesIntakePreparation(reference: string, completed: boolean) {
  return serialSalesTransaction(async tx => {
    const right = await entitlementIn(tx, reference), preparation = await tx.cRMActivity.findUnique({ where: { id: preparationId(reference) } });
    const metadata = preparation?.metadata as { status?: string } | null;
    if (!right || !preparation || preparation.dealId !== right.deal.id || metadata?.status !== "PROCESSING") return;
    const narrative = (right.intake.diagnostic as { narrativeReport?: { executiveSummary?: unknown; adve?: Array<{ key?: unknown; full?: unknown }>; rtis?: { framing?: unknown; pillars?: Array<{ key?: unknown; full?: unknown }> } } } | null)?.narrativeReport;
    const full = (rows: Array<{ key?: unknown; full?: unknown }> | undefined, keys: readonly string[]) => Array.isArray(rows)
      && rows.length === keys.length && keys.every(key => rows.filter(row => row.key === key && typeof row.full === "string" && row.full.trim()).length === 1);
    const ready = completed && typeof narrative?.executiveSummary === "string" && Boolean(narrative.executiveSummary.trim())
      && typeof narrative.rtis?.framing === "string" && Boolean(narrative.rtis.framing.trim()) && full(narrative.adve, ADVE_STORAGE_KEYS) && full(narrative.rtis.pillars, RTIS_STORAGE_KEYS);
    await tx.cRMActivity.update({ where: { id: preparation.id }, data: { metadata: { ...(preparation.metadata as Prisma.JsonObject), status: ready ? "DONE" : "FAILED", finishedAt: new Date().toISOString() },
      description: ready ? "Le traitement existant a terminé le rapport du client, dont les huit sections sont disponibles." : "Le rapport demande une vérification par l’équipe ; aucune livraison confirmée." } });
    if (ready) await tx.cRMActivity.create({ data: { id: deliveryId(reference), dealId: right.deal.id, performedBy: "system:sales-intake-report",
      activityType: "SALES_DELIVERY_READY", description: "Rapport du client actualisé et accessible depuis son droit de paiement vérifié.",
      metadata: { artifact: `/api/intake/${right.intake.shareToken}/pdf`, entitlementId: right.grant.id, paymentReference: reference,
        intakeId: right.intake.id, buyerStrategyId: right.buyer.id, proposalId: right.state.proposal!.id } } });
  });
}
export async function verifySalesIntakeDeliveryIn(client: SalesIntakeReportClient, deal: { id: string; sellerStrategyId: string | null }, state: SalesState,
  activity: { id: string; dealId: string; performedBy: string | null; activityType: string; metadata: Prisma.JsonValue }) {
  if (!required(state) || !["PAID", "DELIVERED"].includes(state.node) || activity.performedBy !== "system:sales-intake-report" || activity.dealId !== deal.id || activity.activityType !== "SALES_DELIVERY_READY") return false;
  const metadata = activity.metadata as { paymentReference?: string; artifact?: string; entitlementId?: string } | null;
  if (!metadata?.paymentReference || activity.id !== deliveryId(metadata.paymentReference)) return false;
  const right = await entitlementIn(client, metadata.paymentReference);
  const preparation = await client.cRMActivity.findUnique({ where: { id: preparationId(metadata.paymentReference) }, select: { metadata: true } });
  return Boolean(right && right.deal.id === deal.id && right.deal.sellerStrategyId === deal.sellerStrategyId && metadata.entitlementId === right.grant.id
    && metadata.artifact === `/api/intake/${right.intake.shareToken}/pdf` && (preparation?.metadata as { status?: string } | null)?.status === "DONE");
}
