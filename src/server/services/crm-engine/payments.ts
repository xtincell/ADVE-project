/** Commercial collection reuses IntakePayment without intake fulfillment or autonomous financial approval. */
import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Deal, IntakePayment, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { serialSalesTransaction as serial } from "./transaction";
import { salesStateSchema, type SalesActor, type SalesState } from "./commercial";
import { assertSalesEffectIn } from "./outbound-authority";

export type SalesPaymentActor = SalesActor & { operatorId?: string | null };
const currencies = { XOF: 0, XAF: 0, EUR: 2, USD: 2, MAD: 2, NGN: 2, GHS: 2, CDF: 2, TND: 3 } as const;
type Currency = keyof typeof currencies;
type Tx = Prisma.TransactionClient;
function fail(message: string): never { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }
const conflict = (message = "Cette référence de demande a déjà été utilisée pour une autre opération."): never => { throw new TRPCError({ code: "CONFLICT", message }); };
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const requestSchema = z.object({ dealId: z.string().min(1), requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() }).strict();
export const reconcileSalesPaymentInput = z.object({ dealId: z.string().min(1), requestId: z.string().uuid(), observedAmount: z.number().finite().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), externalReference: z.string().trim().min(3).max(4000), evidence: z.string().trim().min(3).max(4000) }).strict();
export type ReconcileSalesPaymentInput = z.input<typeof reconcileSalesPaymentInput>;
export interface CommercialPaymentRequest {
  dealId: string; companyName: string; contactName: string; offerName: string; amount: number; currency: string;
  reference: string; status: "PENDING" | "PAID" | "FAILED"; beneficiary: string; destinationRef: string;
  paymentInstructions: string; paidAt: Date | null; canReconcile: boolean;
}
function exponent(currency: string) {
  if (!Object.hasOwn(currencies, currency)) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette devise n’est pas prise en charge pour un paiement." });
  return currencies[currency as Currency];
}
/** Convert the declared decimal exactly; do not round a price to a different financial promise. */
export function salesAmountToMinor(amount: number, currency: string): number {
  const places = exponent(currency);
  if (!Number.isFinite(amount) || amount < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Montant de règlement invalide." });
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(amount));
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Montant de règlement invalide." });
  let minor = BigInt(match[1]! + (match[2] ?? ""));
  const power = places + Number(match[3] ?? 0) - (match[2]?.length ?? 0);
  if (power >= 0) minor *= BigInt(10) ** BigInt(power);
  else {
    const divisor = BigInt(10) ** BigInt(-power);
    if (minor % divisor !== BigInt(0)) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce montant contient trop de décimales pour cette devise." });
    minor /= divisor;
  }
  if (minor > BigInt(2147483647)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le montant dépasse la limite acceptée pour ce paiement." });
  return Number(minor);
}
/** Only this new tier uses ISO minor units; historical intake amounts keep their original contract. */
export function paymentMajorAmount(payment: { tierKey?: string | null; amount: number; currency: string }): number {
  return payment.tierKey === "SALES_COLLECTION" ? payment.amount / 10 ** exponent(payment.currency) : payment.amount;
}

type ScopedBrand = { id: string; userId: string; operatorId: string | null };
async function brandIn(tx: Tx, strategyId: string): Promise<ScopedBrand> {
  const brand = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId }, select: { id: true, userId: true, operatorId: true, client: { select: { operatorId: true } } } });
  return { ...brand, operatorId: brand.operatorId ?? brand.client?.operatorId ?? null };
}
async function humanIn(tx: Tx, actor: SalesPaymentActor, brand: ScopedBrand) {
  if (actor.id.startsWith("mcp:")) throw new TRPCError({ code: "FORBIDDEN", message: "Connectez-vous avec un compte personnel pour vérifier un paiement reçu." });
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, operatorId: true } });
  if (!user) throw new TRPCError({ code: "FORBIDDEN", message: "Compte humain introuvable." });
  const admin = actor.admin && user.role === "ADMIN";
  if (!admin && user.id !== brand.userId && (!brand.operatorId || user.operatorId !== brand.operatorId)) throw new TRPCError({ code: "FORBIDDEN", message: "Règlement hors de votre marque." });
  return { ...user, admin };
}
async function collectionIn(tx: Tx, deal: Deal, state: SalesState, brand: ScopedBrand) {
  const mandate = state.mandate;
  if (mandate?.informationOnly) fail("Cette conversation sert uniquement à répondre aux questions. Aucun paiement n’y est autorisé.");
  if (mandate?.pricingRule && (!state.proposal || state.proposal.amount !== mandate.amount || state.proposal.currency !== mandate.currency)) fail("Préparez la proposition et son prix avant de demander un paiement.");
  if (!mandate?.collection) fail("Confirmez où recevoir le paiement et qui doit le vérifier.");
  const collection = mandate.collection;
  const [attester, finance] = await Promise.all([
    tx.user.findUnique({ where: { id: collection.attestedBy }, select: { id: true, role: true } }),
    tx.user.findUnique({ where: { id: collection.financeOwnerId }, select: { id: true, operatorId: true } }),
  ]);
  if (!attester || (attester.id !== brand.userId && attester.role !== "ADMIN") || new Date(collection.attestedAt).getTime() > Date.now() + 30000) fail("Le propriétaire de la marque doit confirmer où recevoir le paiement.");
  if (!finance || (finance.id !== brand.userId && (!brand.operatorId || finance.operatorId !== brand.operatorId))) fail("La personne chargée de vérifier le paiement doit faire partie de l’équipe de cette marque.");
  if (deal.currency !== mandate.currency || (deal.value != null && deal.value !== mandate.amount)) fail("Les montants ou devises de cette affaire diffèrent des conditions de vente approuvées.");
  return mandate;
}
function nativePayment(payment: IntakePayment | null, deal: Deal, mandate: NonNullable<SalesState["mandate"]>) {
  if (!payment || payment.tierKey !== "SALES_COLLECTION" || payment.provider !== "MANUAL_WA" || payment.intakeToken !== `sales-deal:${deal.id}` || payment.subscriptionId || payment.amount !== salesAmountToMinor(mandate.amount, mandate.currency) || payment.currency !== mandate.currency || deal.paymentReference !== payment.reference || mandate.intakePaymentReference !== payment.reference) fail("Le paiement doit correspondre à cette affaire et aux conditions de vente approuvées.");
  return payment;
}
function project(deal: Deal, state: SalesState, payment: IntakePayment, canReconcile: boolean): CommercialPaymentRequest {
  const mandate = state.mandate!;
  return { dealId: deal.id, companyName: deal.companyName, contactName: deal.contactName, offerName: mandate.offerName,
    amount: paymentMajorAmount(payment), currency: payment.currency, reference: payment.reference, status: payment.status,
    beneficiary: mandate.beneficiary, destinationRef: mandate.collection!.destinationRef, paymentInstructions: mandate.paymentInstructions,
    paidAt: payment.paidAt, canReconcile };
}
async function replayIn(tx: Tx, requestId: string, fingerprint: string, actorId: string, dealId: string) {
  const row = await tx.cRMActivity.findUnique({ where: { id: `sales-payment:${requestId}` } });
  if (!row) return false;
  const metadata = row.metadata as { fingerprint?: string; actorId?: string } | null;
  if (row.dealId !== dealId || metadata?.fingerprint !== fingerprint || metadata.actorId !== actorId) conflict();
  return true;
}

export async function requestSalesPayment(dealId: string, requestId: string, expectedRevision: number, actor: SalesPaymentActor): Promise<CommercialPaymentRequest> {
  const input = requestSchema.parse({ dealId, requestId, expectedRevision });
  const fingerprint = digest({ action: "REQUEST", ...input, actorId: actor.id });
  return serial(async tx => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
    if (!deal.sellerStrategyId) fail("La marque vendeuse est absente de cette affaire.");
    const brand = await brandIn(tx, deal.sellerStrategyId);
    const state = salesStateSchema.parse(deal.commercial ?? {});
    const mandate = await collectionIn(tx, deal, state, brand);
    let canReconcile = false;
    if (actor.id.startsWith("mcp:")) {
      if (actor.id !== mandate.sellerId || !actor.salesRunId) throw new TRPCError({ code: "FORBIDDEN", message: "Le vendeur doit avoir une tâche en cours sur cette affaire pour demander le paiement." });
      const key = await tx.mcpApiKey.findUnique({ where: { id: actor.id.slice(4) }, select: { isActive: true, scopeKind: true, scopeStrategyId: true, expiresAt: true } });
      if (!key?.isActive || key.scopeKind !== "BRAND" || key.scopeStrategyId !== brand.id || (key.expiresAt && key.expiresAt <= new Date())) throw new TRPCError({ code: "FORBIDDEN", message: "Vendeur hors de la marque ou suspendu." });
    } else {
      const person = await humanIn(tx, actor, brand);
      if (!person.admin && person.id !== brand.userId && person.id !== mandate.sellerId) throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire ou le vendeur chargé de cette affaire peut demander le paiement." });
      if (!person.admin && person.id !== brand.userId && person.id !== mandate.collection!.financeOwnerId) {
        const profile = await tx.salesRepresentative.findFirst({ where: { strategyId: brand.id, humanUserId: person.id }, select: { status: true } });
        if (profile && profile.status !== "ACTIVE") throw new TRPCError({ code: "FORBIDDEN", message: "Le vendeur humain est suspendu." });
      }
      canReconcile = person.admin || person.id === mandate.collection!.financeOwnerId;
    }
    await assertSalesEffectIn(tx, deal, actor);
    if (await replayIn(tx, requestId, fingerprint, actor.id, dealId)) return project(deal, state, nativePayment(deal.paymentReference ? await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference } }) : null, deal, mandate), canReconcile);
    if (state.node !== "ACCEPTED" || !state.agreement) fail("Un accord explicite est nécessaire avant la demande de règlement.");
    if (deal.revision !== expectedRevision) conflict("Le dossier a évolué. Relire avant de demander le règlement.");
    const amount = salesAmountToMinor(mandate.amount, mandate.currency);
    let payment: IntakePayment;
    if (deal.paymentReference) payment = nativePayment(await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference } }), deal, mandate);
    else {
      if (mandate.intakePaymentReference) fail("Une référence de paiement existe déjà, mais aucun paiement ne lui correspond sur cette affaire.");
      payment = await tx.intakePayment.create({ data: { reference: `sales_${randomUUID()}`, intakeToken: `sales-deal:${dealId}`, amount, currency: mandate.currency as Currency, provider: "MANUAL_WA", status: "PENDING", tierKey: "SALES_COLLECTION" } });
    }
    const next = { ...state, mandate: { ...mandate, intakePaymentReference: payment.reference } };
    const changed = await tx.deal.updateMany({ where: { id: dealId, revision: expectedRevision }, data: { paymentReference: payment.reference, commercial: JSON.parse(JSON.stringify(next)), revision: { increment: 1 } } });
    if (changed.count !== 1) conflict("Une autre décision vient d’être enregistrée.");
    await tx.cRMActivity.create({ data: { id: `sales-payment:${requestId}`, dealId, activityType: "SALES_PAYMENT_REQUESTED", performedBy: actor.id, description: "Demande de règlement créée depuis le mandat approuvé.", metadata: { action: "REQUEST", fingerprint, actorId: actor.id, requestId, paymentReference: payment.reference, amountMinor: payment.amount, currency: payment.currency } } });
    return project({ ...deal, paymentReference: payment.reference }, next, payment, canReconcile);
  });
}

export async function reconcileSalesPayment(raw: ReconcileSalesPaymentInput, actor: SalesPaymentActor): Promise<CommercialPaymentRequest> {
  const input = reconcileSalesPaymentInput.parse(raw);
  if (actor.id.startsWith("mcp:")) throw new TRPCError({ code: "FORBIDDEN", message: "Une personne doit vérifier le paiement reçu." });
  const fingerprint = digest({ action: "RECONCILE", ...input, actorId: actor.id });
  return serial(async tx => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: input.dealId } });
    if (!deal.sellerStrategyId) fail("La marque vendeuse est absente de cette affaire.");
    const brand = await brandIn(tx, deal.sellerStrategyId);
    const person = await humanIn(tx, actor, brand);
    const state = salesStateSchema.parse(deal.commercial ?? {});
    const mandate = await collectionIn(tx, deal, state, brand);
    if (!person.admin && person.id !== mandate.collection!.financeOwnerId) throw new TRPCError({ code: "FORBIDDEN", message: "Seule la personne désignée pour vérifier les paiements peut valider celui-ci." });
    const payment = nativePayment(deal.paymentReference ? await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference } }) : null, deal, mandate);
    if (await replayIn(tx, input.requestId, fingerprint, actor.id, deal.id)) return project(deal, state, payment, true);
    if (state.node !== "ACCEPTED" || !state.agreement || payment.status !== "PENDING") fail("Le client doit avoir accepté l’offre et le paiement doit encore être en attente de vérification.");
    const observedMinor = salesAmountToMinor(input.observedAmount, input.currency);
    if (input.currency !== mandate.currency || observedMinor !== payment.amount) fail("Montant ou devise effectivement reçus différents des conditions approuvées.");
    const normalize = (value: string) => value.trim().normalize("NFKC").toUpperCase();
    const allocationId = `sales-payment-external:${digest([normalize(mandate.collection!.destinationRef), input.currency, normalize(input.externalReference)])}`;
    if (await tx.cRMActivity.findUnique({ where: { id: allocationId }, select: { id: true } })) conflict("Cette référence externe a déjà été affectée à un règlement.");
    const now = new Date();
    await tx.cRMActivity.create({ data: { id: allocationId, dealId: deal.id, activityType: "SALES_PAYMENT_ALLOCATION", performedBy: actor.id, description: "Preuve externe affectée à ce règlement.", metadata: { externalReference: input.externalReference, paymentReference: payment.reference, requestId: input.requestId, amountMinor: observedMinor, currency: input.currency } } });
    const settled = await tx.intakePayment.updateMany({ where: { id: payment.id, status: "PENDING", amount: observedMinor, currency: payment.currency }, data: { status: "PAID", paidAt: now, providerRef: input.externalReference, providerEventId: allocationId } });
    if (settled.count !== 1) conflict("Ce paiement vient d’être vérifié avec une autre preuve. Relisez son état avant de continuer.");
    const changed = await tx.deal.updateMany({ where: { id: deal.id, revision: deal.revision }, data: { revision: { increment: 1 } } });
    if (changed.count !== 1) conflict("Cette affaire a changé pendant la vérification du paiement. Relisez-la avant de continuer.");
    await tx.cRMActivity.create({ data: { id: `sales-payment:${input.requestId}`, dealId: deal.id, activityType: "SALES_PAYMENT_RECONCILED", performedBy: actor.id, description: "Règlement rapproché par le responsable financier sur preuve externe.", metadata: { action: "RECONCILE", fingerprint, actorId: actor.id, requestId: input.requestId, paymentReference: payment.reference, externalReference: input.externalReference, evidence: input.evidence, amountMinor: observedMinor, currency: input.currency } } });
    return project(deal, state, { ...payment, status: "PAID", paidAt: now, providerRef: input.externalReference, providerEventId: allocationId }, true);
  });
}

export async function listCommercialPaymentRequests(strategyId: string, actor: SalesPaymentActor): Promise<CommercialPaymentRequest[]> {
  return db.$transaction(async tx => {
    const brand = await brandIn(tx, strategyId);
    const person = await humanIn(tx, actor, brand);
    const deals = await tx.deal.findMany({ where: { sellerStrategyId: strategyId, paymentReference: { not: null } }, orderBy: { updatedAt: "desc" }, take: 200 });
    const result: CommercialPaymentRequest[] = [];
    for (const deal of deals) {
      const state = salesStateSchema.safeParse(deal.commercial);
      if (!state.success || !state.data.mandate?.collection) continue;
      const mandate = await collectionIn(tx, deal, state.data, brand);
      const payment = nativePayment(await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference! } }), deal, mandate);
      result.push(project(deal, state.data, payment, person.admin || person.id === mandate.collection!.financeOwnerId));
    }
    return result;
  });
}
