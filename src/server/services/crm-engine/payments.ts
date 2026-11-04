/** Commercial collection reuses IntakePayment and independently verified financial receipts. */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Deal, IntakePayment, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { serialSalesTransaction as serial } from "./transaction";
import { salesStateSchema, type SalesActor, type SalesState } from "./commercial";
import { assertSalesEffectIn } from "./outbound-authority";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { assertFrozenSalesCollectionIn } from "./collection-provider";
import { cinetpayProvider } from "../payment-providers/cinetpay";
import { encryptTokenPayload, decryptTokenPayload } from "../oauth-integrations";
import { salesAmountToMinor, paymentMajorAmount, type SalesPaymentCurrency as Currency } from "./payment-money";
export { salesAmountToMinor, paymentMajorAmount } from "./payment-money";

export type SalesPaymentActor = SalesActor & { operatorId?: string | null };

type Tx = Prisma.TransactionClient;
function fail(message: string): never { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }
const conflict = (message = "Cette référence de demande a déjà été utilisée pour une autre opération."): never => { throw new TRPCError({ code: "CONFLICT", message }); };
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
/** Payment redirects use deployment configuration, never Host/forwarded headers. */
export function salesPaymentPublicOrigin(localRequestUrl?: string): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  let origin: URL;
  try { origin = new URL(configured ?? localRequestUrl ?? ""); } catch { fail("L’adresse de paiement de ce service doit être confirmée."); }
  if (origin.username || origin.password || (origin.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) ||
      (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) ||
      (!configured && !["localhost", "127.0.0.1"].includes(origin.hostname))) fail("L’adresse de paiement de ce service doit être confirmée.");
  return origin.origin;
}
const requestSchema = z.object({ dealId: z.string().min(1), requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative() }).strict();
export const reconcileSalesPaymentInput = z.object({ dealId: z.string().min(1), requestId: z.string().uuid(), observedAmount: z.number().finite().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), externalReference: z.string().trim().min(3).max(4000), evidence: z.string().trim().min(3).max(4000) }).strict();
export type ReconcileSalesPaymentInput = z.input<typeof reconcileSalesPaymentInput>;
export interface CommercialPaymentRequest {
  dealId: string; companyName: string; contactName: string; offerName: string; amount: number; currency: string;
  reference: string; status: "PENDING" | "PAID" | "FAILED"; beneficiary: string; destinationRef: string;
  paymentInstructions: string; paidAt: Date | null; canReconcile: boolean;
  provider: "MANUAL_WA" | "CINETPAY"; paymentUrl?: string;
}

type ScopedBrand = { id: string; userId: string; operatorId: string | null };
async function brandIn(tx: Tx, strategyId: string): Promise<ScopedBrand> {
  const brand = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId }, select: { id: true, userId: true, operatorId: true, client: { select: { operatorId: true } } } });
  return { ...brand, operatorId: brand.operatorId ?? brand.client?.operatorId ?? null };
}
async function humanIn(tx: Tx, actor: SalesPaymentActor, brand: ScopedBrand) {
  if (actor.id.startsWith("mcp:")) throw new TRPCError({ code: "FORBIDDEN", message: "Connectez-vous avec un compte personnel pour vérifier un paiement reçu." });
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, email: true, operatorId: true } });
  if (!user) throw new TRPCError({ code: "FORBIDDEN", message: "Compte humain introuvable." });
  const admin = actor.admin && (user.role === "ADMIN" || isGodModeEmail(user.email));
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
    tx.user.findUnique({ where: { id: collection.attestedBy }, select: { id: true, role: true, email: true } }),
    tx.user.findUnique({ where: { id: collection.financeOwnerId }, select: { id: true, operatorId: true } }),
  ]);
  if (!attester || (attester.id !== brand.userId && attester.role !== "ADMIN" && !isGodModeEmail(attester.email)) || new Date(collection.attestedAt).getTime() > Date.now() + 30000) fail("Le propriétaire de la marque doit confirmer où recevoir le paiement.");
  if (!finance || (finance.id !== brand.userId && (!brand.operatorId || finance.operatorId !== brand.operatorId))) fail("La personne chargée de vérifier le paiement doit faire partie de l’équipe de cette marque.");
  if (deal.currency !== mandate.currency || (deal.value != null && deal.value !== mandate.amount)) fail("Les montants ou devises de cette affaire diffèrent des conditions de vente approuvées.");
  return mandate;
}
function nativePayment(payment: IntakePayment | null, deal: Deal, mandate: NonNullable<SalesState["mandate"]>) {
  if (!payment || payment.tierKey !== "SALES_COLLECTION" || payment.provider !== (mandate.collection?.mode === "CINETPAY" ? "CINETPAY" : "MANUAL_WA") || payment.intakeToken !== `sales-deal:${deal.id}` || payment.subscriptionId || payment.amount !== salesAmountToMinor(mandate.amount, mandate.currency) || payment.currency !== mandate.currency || deal.paymentReference !== payment.reference || mandate.intakePaymentReference !== payment.reference) fail("Le paiement doit correspondre à cette affaire et aux conditions de vente approuvées.");
  return payment;
}
function project(deal: Deal, state: SalesState, payment: IntakePayment, canReconcile: boolean): CommercialPaymentRequest {
  const mandate = state.mandate!;
  return { dealId: deal.id, companyName: deal.companyName, contactName: deal.contactName, offerName: mandate.offerName,
    amount: paymentMajorAmount(payment), currency: payment.currency, reference: payment.reference, status: payment.status,
    beneficiary: mandate.beneficiary, destinationRef: mandate.collection!.destinationRef, paymentInstructions: mandate.paymentInstructions,
    paidAt: payment.paidAt, canReconcile: payment.provider === "MANUAL_WA" && canReconcile, provider: payment.provider as "MANUAL_WA" | "CINETPAY" };
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
    if (mandate.collection!.mode === "CINETPAY") {
      await customerCollectionIn(tx, deal, state, state.proposal?.id ?? "");
      const account = await assertFrozenSalesCollectionIn(tx, brand.id, mandate.beneficiary, mandate.collection!);
      if (state.proposal?.countryCode !== account.countryCode || mandate.currency !== account.currency) fail("Le paiement de ce pays et de cette devise n’est pas activé pour cette marque.");
    }
    const { assertSalesIntakeReportReadyIn } = await import("./intake-report");
    await assertSalesIntakeReportReadyIn(tx, deal, state, deal.contactEmail ?? undefined);
    const amount = salesAmountToMinor(mandate.amount, mandate.currency);
    let payment: IntakePayment;
    if (deal.paymentReference) payment = nativePayment(await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference } }), deal, mandate);
    else {
      if (mandate.intakePaymentReference) fail("Une référence de paiement existe déjà, mais aucun paiement ne lui correspond sur cette affaire.");
      payment = await tx.intakePayment.create({ data: { reference: `sales_${randomUUID()}`, intakeToken: `sales-deal:${dealId}`, amount, currency: mandate.currency as Currency, provider: mandate.collection!.mode === "CINETPAY" ? "CINETPAY" : "MANUAL_WA", status: "PENDING", tierKey: "SALES_COLLECTION" } });
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
    if (payment.provider !== "MANUAL_WA") fail("Ce règlement en ligne doit être confirmé par le prestataire de paiement, jamais par le vendeur.");
    if (await replayIn(tx, input.requestId, fingerprint, actor.id, deal.id)) {
      const { grantSalesIntakeReportIn } = await import("./intake-report");
      await grantSalesIntakeReportIn(tx, deal.id, payment.reference);
      return project(deal, state, payment, true);
    }
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
    await tx.cRMActivity.create({ data: { id: `sales-payment:${input.requestId}`, dealId: deal.id, activityType: "SALES_PAYMENT_RECONCILED", performedBy: actor.id, description: "Règlement rapproché par le responsable financier sur preuve externe.", metadata: { action: "RECONCILE", fingerprint, actorId: actor.id, requestId: input.requestId, paymentReference: payment.reference, externalReference: input.externalReference, evidence: input.evidence, amountMinor: observedMinor, currency: input.currency,
      provider: "MANUAL_WA", independentHumanProof: true, verifiedBy: person.id, allocationId, proposalId: state.proposal?.id ?? null } } });
    const { grantSalesIntakeReportIn } = await import("./intake-report");
    await grantSalesIntakeReportIn(tx, deal.id, payment.reference);
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

export const customerSalesPaymentInput = z.object({
  requestId: z.string().uuid(), proposalId: z.string().uuid(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).default(""),
}).strict();
type CustomerPaymentInput = z.input<typeof customerSalesPaymentInput>;
const initId = (reference: string) => `sales-psp-init:${reference}`;
const checkoutReceiptSchema = z.object({
  version: z.literal(1), status: z.enum(["STARTED", "READY", "UNKNOWN"]),
  proposalId: z.string().uuid(), amountMinor: z.number().int().positive(), currency: z.enum(["XOF", "XAF"]),
  proposalFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  account: z.object({ merchantAccountId: z.string(), beneficiary: z.string(), destinationRef: z.string(), countryCode: z.string(), providerAccountHash: z.string(), credentialFingerprint: z.string() }),
  returnId: z.string().regex(/^[a-f0-9]{32}$/), returnCookieEncrypted: z.string(),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  publicOrigin: z.string().url(),
  paymentUrl: z.string().url().optional(),
});
type CheckoutReceipt = z.infer<typeof checkoutReceiptSchema>;
const checkoutUrl = (value: string) => {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "secure.cinetpay.co" && !url.username && !url.password && !url.port ? value : null; }
  catch { return null; }
};
async function activeCustomerSellerIn(tx: Tx, deal: Deal, state: SalesState) {
  const seller = state.mandate?.sellerId;
  if (!seller || !deal.sellerStrategyId) fail("Le paiement en ligne de cette conversation n’est pas disponible pour le moment.");
  const profile = await tx.salesRepresentative.findFirst({ where: { strategyId: deal.sellerStrategyId,
    ...(seller.startsWith("mcp:") ? { mode: "AI", mcpKeyId: seller.slice(4) } : { mode: "HUMAN", humanUserId: seller }) } });
  if (profile?.status !== "ACTIVE") fail("Le paiement en ligne de cette conversation n’est pas disponible pour le moment.");
  if (seller.startsWith("mcp:")) {
    const key = await tx.mcpApiKey.findUnique({ where: { id: seller.slice(4) }, select: { isActive: true, scopeKind: true, scopeStrategyId: true, expiresAt: true } });
    if (!key?.isActive || key.scopeKind !== "BRAND" || key.scopeStrategyId !== deal.sellerStrategyId || (key.expiresAt && key.expiresAt <= new Date())) fail("Le paiement en ligne de cette conversation n’est pas disponible pour le moment.");
  } else {
    const [person, brand] = await Promise.all([
      tx.user.findUnique({ where: { id: seller }, select: { id: true, operatorId: true } }),
      brandIn(tx, deal.sellerStrategyId),
    ]);
    if (!person || (person.id !== brand.userId && (!brand.operatorId || person.operatorId !== brand.operatorId))) fail("Le paiement en ligne de cette conversation n’est pas disponible pour le moment.");
  }
}
async function customerCollectionIn(tx: Tx, deal: Deal, state: SalesState, proposalId: string) {
  const mandate = await collectionIn(tx, deal, state, await brandIn(tx, deal.sellerStrategyId!));
  const proposal = state.proposal;
  if (mandate.collection?.mode !== "CINETPAY" || state.contactStopped || state.node === "STOPPED" ||
      !["ACCEPTED", "PAID", "DELIVERED"].includes(state.node) || !state.agreement || !proposal?.presentedAt ||
      proposal.id !== proposalId || proposal.offerId !== mandate.offerId || proposal.amount !== mandate.amount ||
      proposal.currency !== mandate.currency || mandate.amount <= 0) fail("Confirmez la proposition présentée avant de régler cette commande.");
  return mandate;
}
/** A read projection only; the capability never grants the model financial authority. */
export async function customerSalesCheckout(deal: Deal, state: SalesState) {
  const beneficiary = state.mandate?.beneficiary ?? "";
  const unavailable = { available: false, provider: "CINETPAY" as const, beneficiary,
    requiresEmail: !z.string().email().safeParse(deal.contactEmail).success,
    reason: "Le paiement en ligne n’est pas disponible pour cette conversation. Vous pouvez joindre l’équipe." };
  if (!deal.sellerStrategyId || state.mandate?.informationOnly || state.mandate?.collection?.mode !== "CINETPAY") return undefined;
  try {
    return await db.$transaction(async tx => {
      await customerCollectionIn(tx, deal, state, state.proposal?.id ?? "");
      if (state.node !== "ACCEPTED") return { ...unavailable, reason: "Ce règlement a déjà été confirmé." };
      await activeCustomerSellerIn(tx, deal, state);
      const account = await assertFrozenSalesCollectionIn(tx, deal.sellerStrategyId!, beneficiary, state.mandate!.collection!);
      if (state.proposal?.countryCode !== account.countryCode || state.mandate!.currency !== account.currency) return unavailable;
      const { assertSalesIntakeReportReadyIn } = await import("./intake-report");
      await assertSalesIntakeReportReadyIn(tx, deal, state, deal.contactEmail ?? undefined);
      if (deal.paymentReference) {
        const [payment, init] = await Promise.all([
          tx.intakePayment.findUnique({ where: { reference: deal.paymentReference }, select: { status: true } }),
          tx.cRMActivity.findUnique({ where: { id: initId(deal.paymentReference) }, select: { metadata: true } }),
        ]);
        const status = (init?.metadata as { status?: string } | null)?.status;
        if (payment?.status !== "PENDING" || status === "STARTED" || status === "UNKNOWN") return { ...unavailable, reason: "L’équipe doit vérifier la demande de règlement déjà enregistrée. Conservez votre conversation." };
      }
      return { ...unavailable, available: true, reason: undefined };
    });
  } catch (error) { if (!(error instanceof TRPCError)) throw error; return unavailable; }
}
export async function salesPaymentCheckoutUrl(payment: Pick<IntakePayment, "reference" | "provider" | "amount" | "currency" | "providerRef" | "notificationTokenHash">) {
  if (payment.provider !== "CINETPAY" || !payment.providerRef || !payment.notificationTokenHash) return null;
  const row = await db.cRMActivity.findUnique({ where: { id: initId(payment.reference) } });
  const receipt = checkoutReceiptSchema.safeParse(row?.metadata);
  return receipt.success && receipt.data.status === "READY" && receipt.data.amountMinor === payment.amount && receipt.data.currency === payment.currency && receipt.data.paymentUrl
    ? checkoutUrl(receipt.data.paymentUrl) : null;
}
function initializedCustomerPayment(deal: Deal, state: SalesState, payment: IntakePayment, receipt: CheckoutReceipt) {
  const url = receipt.paymentUrl && checkoutUrl(receipt.paymentUrl);
  if (receipt.status !== "READY" || !url || !payment.providerRef || !payment.notificationTokenHash) {
    fail("Cette demande de paiement doit être vérifiée par l’équipe. Conservez sa référence ; aucun second paiement n’a été créé.");
  }
  const cookie = decryptTokenPayload<{ value: string }>(receipt.returnCookieEncrypted);
  return { paymentUrl: url, reference: payment.reference, status: payment.status, provider: "CINETPAY" as const,
    beneficiary: state.mandate!.beneficiary, amount: paymentMajorAmount(payment), currency: payment.currency,
    returnCookie: { name: `sales-return-${receipt.returnId}`, value: cookie.value }, dealId: deal.id };
}
async function assertCurrentCustomerCapability(dealId: string, token: string) {
  const current = await db.deal.findUnique({ where: { id: dealId }, select: { customerAccessTokenHash: true } });
  if (current?.customerAccessTokenHash !== createHash("sha256").update(token).digest("hex")) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation indisponible." });
}
/** The customer's existing private capability authorizes this checkout, never a forged seller run. */
export async function requestCustomerSalesPayment(token: string, raw: CustomerPaymentInput, publicBaseUrl: string) {
  const input = customerSalesPaymentInput.parse(raw);
  const base = new URL(publicBaseUrl);
  if (base.origin !== salesPaymentPublicOrigin(publicBaseUrl)) fail("L’adresse de retour du paiement ne correspond pas à ce service.");
  if (base.origin !== publicBaseUrl || !["https:", "http:"].includes(base.protocol) ||
      (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))) fail("Adresse de retour du paiement indisponible.");
  const { resolveCustomerDeal } = await import("./customer-access");
  const capability = await resolveCustomerDeal(token);
  const fingerprint = digest({ dealId: capability.id, ...input });
  const customerRequestId = `sales-customer-payment:${input.requestId}`;
  const reserved = await serial(async tx => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: capability.id } });
    if (deal.customerAccessTokenHash !== createHash("sha256").update(token).digest("hex")) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation indisponible." });
    const state = salesStateSchema.parse(deal.commercial ?? {});
    const mandate = await customerCollectionIn(tx, deal, state, input.proposalId);
    const replay = await tx.cRMActivity.findUnique({ where: { id: customerRequestId } });
    if (replay) {
      if (replay.dealId !== deal.id || (replay.metadata as { fingerprint?: string } | null)?.fingerprint !== fingerprint) conflict();
      const payment = nativePayment(await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference! } }), deal, mandate);
      if (payment.status !== "PENDING") fail("Ce règlement a déjà été confirmé. Consultez la conversation.");
      await activeCustomerSellerIn(tx, deal, state);
      await assertFrozenSalesCollectionIn(tx, deal.sellerStrategyId!, mandate.beneficiary, mandate.collection!);
      const previous = await tx.cRMActivity.findUnique({ where: { id: initId(payment.reference) } });
      const receipt = checkoutReceiptSchema.parse(previous?.metadata);
      if (receipt.publicOrigin !== base.origin) fail("L’adresse de retour de cette demande doit être vérifiée par l’équipe.");
      return { callProvider: false as const, deal, state, payment, receipt };
    }
    if (state.node !== "ACCEPTED" || new Date(mandate.expiresAt) <= new Date()) fail("Cette proposition ne permet plus de démarrer un paiement.");
    await activeCustomerSellerIn(tx, deal, state);
    const account = await assertFrozenSalesCollectionIn(tx, deal.sellerStrategyId!, mandate.beneficiary, mandate.collection!);
    if (state.proposal!.countryCode !== account.countryCode || mandate.currency !== account.currency) fail("Le paiement de ce pays et de cette devise n’est pas activé pour cette marque.");
    const email = z.string().trim().email().max(254).safeParse(input.email || deal.contactEmail);
    if (!email.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Indiquez une adresse e-mail pour recevoir la confirmation de paiement." });
    const amount = salesAmountToMinor(mandate.amount, mandate.currency);
    const { assertSalesIntakeReportReadyIn } = await import("./intake-report");
    await assertSalesIntakeReportReadyIn(tx, deal, state, email.data);
    let payment: IntakePayment;
    let currentDeal = deal, currentState = state;
    if (deal.paymentReference) payment = nativePayment(await tx.intakePayment.findUnique({ where: { reference: deal.paymentReference } }), deal, mandate);
    else {
      if (mandate.intakePaymentReference) fail("Le règlement de cette affaire doit être vérifié par l’équipe.");
      payment = await tx.intakePayment.create({ data: { reference: `sales_${randomUUID()}`, intakeToken: `sales-deal:${deal.id}`, amount, currency: account.currency, provider: "CINETPAY", status: "PENDING", tierKey: "SALES_COLLECTION" } });
      currentState = { ...state, mandate: { ...mandate, intakePaymentReference: payment.reference } };
      currentDeal = await tx.deal.update({ where: { id: deal.id, revision: deal.revision }, data: {
        paymentReference: payment.reference, commercial: JSON.parse(JSON.stringify(currentState)), revision: { increment: 1 },
        ...(!deal.contactEmail ? { contactEmail: email.data } : {}),
      } });
      await tx.cRMActivity.create({ data: { id: `sales-payment-customer-request:${payment.reference}`, dealId: deal.id,
        activityType: "SALES_PAYMENT_REQUESTED", description: "Règlement demandé par le client pour la proposition acceptée.",
        metadata: { paymentReference: payment.reference, proposalId: input.proposalId, initiatedBy: "CUSTOMER", amountMinor: amount, currency: account.currency } } });
    }
    if (payment.status !== "PENDING") fail("Ce règlement doit être vérifié par l’équipe avant une nouvelle demande.");
    const previous = await tx.cRMActivity.findUnique({ where: { id: initId(payment.reference) } });
    if (previous) {
      const receipt = checkoutReceiptSchema.parse(previous.metadata);
      if (receipt.publicOrigin !== base.origin) fail("L’adresse de retour de cette demande doit être vérifiée par l’équipe.");
      if (receipt.emailHash !== digest(email.data.toLowerCase())) conflict("L’adresse de cette demande diffère du règlement déjà préparé. L’équipe peut vérifier sa référence.");
      return { callProvider: false as const, deal: currentDeal, state: currentState, payment, receipt };
    }
    await tx.cRMActivity.create({ data: { id: customerRequestId, dealId: deal.id, activityType: "SALES_CUSTOMER_PAYMENT_REQUEST",
      description: "Demande client de règlement enregistrée.", metadata: { fingerprint, proposalId: input.proposalId, paymentReference: payment.reference } } });
    const returnId = randomBytes(16).toString("hex"), returnSecret = randomBytes(32).toString("hex");
    const receipt: CheckoutReceipt = { version: 1, status: "STARTED", proposalId: input.proposalId, proposalFingerprint: digest(state.proposal), amountMinor: amount, currency: account.currency,
      account: { merchantAccountId: account.merchantAccountId, beneficiary: account.beneficiary, destinationRef: account.destinationRef, countryCode: account.countryCode,
        providerAccountHash: account.providerAccountHash, credentialFingerprint: account.credentialFingerprint },
      returnId, returnCookieEncrypted: encryptTokenPayload({ value: returnSecret }), emailHash: digest(email.data.toLowerCase()), publicOrigin: base.origin };
    await tx.cRMActivity.create({ data: { id: initId(payment.reference), dealId: deal.id, activityType: "SALES_PSP_INITIALIZATION",
      description: "Initialisation unique du règlement réservée avant l’appel au prestataire.", metadata: JSON.parse(JSON.stringify(receipt)) } });
    await tx.cRMActivity.create({ data: { id: `sales-payment-return:${returnId}`, dealId: deal.id, activityType: "SALES_PAYMENT_RETURN",
      description: "Retour navigateur distinct du lien privé client.", metadata: { reference: payment.reference, cookieHash: digest(returnSecret) } } });
    return { callProvider: true as const, deal: currentDeal, state: currentState, payment, receipt, email: email.data };
  });
  if (!reserved.callProvider) {
    await assertCurrentCustomerCapability(reserved.deal.id, token);
    return initializedCustomerPayment(reserved.deal, reserved.state, reserved.payment, reserved.receipt);
  }
  // No external effect occurs inside a retriable transaction. Only the committed
  // creator reaches this point; STARTED/UNKNOWN replays never POST again.
  try {
    const result = await cinetpayProvider.initPayment({ reference: reserved.payment.reference, amount: reserved.payment.amount,
      currency: reserved.payment.currency, description: reserved.state.mandate!.offerName,
      returnUrl: `${base.origin}/api/sales/payment-return/${reserved.receipt.returnId}`,
      notifyUrl: `${base.origin}/api/payment/webhook/cinetpay`,
      customer: { name: reserved.deal.companyName === "Demande web" ? reserved.deal.contactName : reserved.deal.companyName, email: reserved.email } });
    if (!result.providerRef || !result.notificationTokenHash || !/^[a-f0-9]{64}$/.test(result.notificationTokenHash) || !checkoutUrl(result.paymentUrl)) fail("Le reçu du prestataire de paiement doit être vérifié par l’équipe.");
    const ready: CheckoutReceipt = { ...reserved.receipt, status: "READY", paymentUrl: result.paymentUrl };
    const saved = await serial(async tx => {
      const payment = await tx.intakePayment.findUniqueOrThrow({ where: { reference: reserved.payment.reference } });
      if (payment.provider !== "CINETPAY" || payment.amount !== reserved.payment.amount || payment.currency !== reserved.payment.currency ||
          (payment.providerRef && payment.providerRef !== result.providerRef)) fail("Le reçu du paiement ne correspond pas à cette demande.");
      const updated = await tx.intakePayment.update({ where: { id: payment.id }, data: { providerRef: result.providerRef, notificationTokenHash: result.notificationTokenHash } });
      await tx.cRMActivity.update({ where: { id: initId(payment.reference) }, data: { metadata: JSON.parse(JSON.stringify(ready)), description: "Reçu d’initialisation du prestataire confirmé avant remise du lien au client." } });
      return updated;
    });
    await assertCurrentCustomerCapability(reserved.deal.id, token);
    return initializedCustomerPayment(reserved.deal, reserved.state, saved, ready);
  } catch {
    // The provider may already have created a transaction. Do not report FAILED
    // or start another one; preserve the reference for authenticated resolution.
    await db.cRMActivity.updateMany({ where: { id: initId(reserved.payment.reference), metadata: { path: ["status"], equals: "STARTED" } },
      data: { metadata: JSON.parse(JSON.stringify({ ...reserved.receipt, status: "UNKNOWN" })), description: "Résultat d’initialisation à vérifier ; aucune nouvelle tentative automatique." } });
    fail("Cette demande de paiement doit être vérifiée par l’équipe. Conservez sa référence ; aucun second paiement n’a été créé.");
  }
}

/** PSP success binds to the original durable initialization, not model assertions. */
export async function reconcileCinetpaySalesPayment(reference: string, validateOnly = false) {
  return serial(async tx => {
    const payment = await tx.intakePayment.findUniqueOrThrow({ where: { reference } });
    if (payment.tierKey !== "SALES_COLLECTION" || payment.provider !== "CINETPAY" || (!validateOnly && (payment.status !== "PAID" || !payment.paidAt)) || !payment.providerRef || !payment.notificationTokenHash) fail("Règlement en ligne non confirmé.");
    const deal = await tx.deal.findUniqueOrThrow({ where: { paymentReference: reference } });
    const state = salesStateSchema.parse(deal.commercial ?? {}), mandate = state.mandate;
    const init = checkoutReceiptSchema.parse((await tx.cRMActivity.findUnique({ where: { id: initId(reference) } }))?.metadata);
    if (!mandate || !deal.sellerStrategyId || mandate.collection?.mode !== "CINETPAY" || mandate.informationOnly ||
        init.status !== "READY" || init.proposalId !== state.proposal?.id || init.proposalFingerprint !== digest(state.proposal) || init.amountMinor !== payment.amount || init.currency !== payment.currency ||
        init.account.providerAccountHash !== mandate.collection.providerAccountHash || init.account.beneficiary !== mandate.beneficiary ||
        state.proposal.countryCode !== init.account.countryCode) fail("Le paiement ne correspond pas à la proposition acceptée et au compte approuvé.");
    nativePayment(payment, deal, mandate);
    if (validateOnly) return { received: false, dealId: deal.id };
    const activityId = `sales-cinetpay-paid:${reference}`;
    const previous = await tx.cRMActivity.findUnique({ where: { id: activityId } });
    if (!previous) {
      await tx.cRMActivity.create({ data: { id: activityId, dealId: deal.id, activityType: "SALES_PAYMENT_RECONCILED",
        description: "Règlement confirmé par la vérification authentifiée du prestataire.",
        metadata: { paymentReference: reference, provider: "CINETPAY", providerRef: payment.providerRef, amountMinor: payment.amount,
          currency: payment.currency, beneficiary: init.account.beneficiary, merchantAccountId: init.account.merchantAccountId,
          proposalId: init.proposalId, providerAccountHash: init.account.providerAccountHash, independentProviderProof: true } } });
      await tx.deal.update({ where: { id: deal.id, revision: deal.revision }, data: { revision: { increment: 1 } } });
    } else if (previous.dealId !== deal.id) conflict();
    const { grantSalesIntakeReportIn } = await import("./intake-report");
    await grantSalesIntakeReportIn(tx, deal.id, reference);
    return { received: true, dealId: deal.id };
  });
}

/** Return id alone cannot disclose the customer's conversation to the PSP. */
export async function resolveSalesPaymentReturn(returnId: string, cookie: string | undefined) {
  if (!/^[a-f0-9]{32}$/.test(returnId) || !cookie || !/^[a-f0-9]{64}$/.test(cookie)) throw new TRPCError({ code: "NOT_FOUND" });
  return serial(async tx => {
  const row = await tx.cRMActivity.findUnique({ where: { id: `sales-payment-return:${returnId}` } });
  const metadata = row?.metadata as { cookieHash?: string; reference?: string } | null;
  if (!row || !metadata?.cookieHash || row.performedAt.getTime() < Date.now() - 86400000 ||
      metadata.cookieHash.length !== 64 || !timingSafeEqual(Buffer.from(metadata.cookieHash), Buffer.from(digest(cookie)))) throw new TRPCError({ code: "NOT_FOUND" });
  const deal = await tx.deal.findUnique({ where: { id: row.dealId } });
  if (!deal?.customerAccessTokenEncrypted || deal.paymentReference !== metadata.reference) throw new TRPCError({ code: "NOT_FOUND" });
  const { token } = decryptTokenPayload<{ token: string }>(deal.customerAccessTokenEncrypted);
  if (deal.customerAccessTokenHash !== createHash("sha256").update(token).digest("hex")) throw new TRPCError({ code: "NOT_FOUND" });
  return { path: `/sales/${token}` };
  });
}
