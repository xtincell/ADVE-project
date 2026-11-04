/** A seller prepares the existing Glory devis under the owner's price authority. */
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { executeTool } from "../artemis/tools/engine";
import { commercialQuoteOutputSchema } from "../artemis/tools/commercial-offer-schemas";
import { getTier } from "../monetization/pricing-tiers";
import { lookupCountry } from "../country-registry";
import { salesStateSchema, type SalesActor } from "./commercial";
import { prepareSalesOfferInput, salesProposalSchema, type PrepareSalesOfferInput } from "./offer-contract";
import { assertSalesCatalogueOfferIn } from "./offer-source";
import { assertSalesEffectIn } from "./outbound-authority";
import { serialSalesTransaction } from "./transaction";
import { issueCustomerAccessIn } from "./customer";

const fail = (message: string): never => { throw new TRPCError({ code: "PRECONDITION_FAILED", message }); };
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function prepareSalesOffer(raw: PrepareSalesOfferInput, actor: SalesActor, authorizationIntentId?: string) {
  const input = prepareSalesOfferInput.parse(raw);
  const requestHash = fingerprint({ ...input, actorId: actor.id });
  return serialSalesTransaction(async tx => {
    // Serialize even same-revision concurrent proposals before producing a document.
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id=${input.dealId} FOR UPDATE`;
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: input.dealId } });
    const state = salesStateSchema.parse(deal.commercial ?? {}), mandate = state.mandate;
    if (!deal.sellerStrategyId || !mandate) fail("Définissez les conditions de vente de cette affaire avant de préparer une proposition.");
    const brand = await tx.strategy.findUniqueOrThrow({ where: { id: deal.sellerStrategyId! }, select: { userId: true } });
    if (actor.id !== mandate!.sellerId && !actor.admin && actor.id !== brand.userId) throw new TRPCError({ code: "FORBIDDEN", message: "Cette affaire n’est pas confiée à ce vendeur." });
    await assertSalesEffectIn(tx, deal, actor);
    if (actor.id.startsWith("mcp:") && !actor.salesRunId) fail("Le vendeur doit avoir une tâche en cours pour préparer la proposition.");
    const existing = await tx.cRMActivity.findUnique({ where: { id: `sales-offer:${input.requestId}` } });
    if (existing) {
      const data = existing.metadata as { fingerprint?: string; result?: unknown } | null;
      if (existing.dealId !== deal.id || data?.fingerprint !== requestHash) throw new TRPCError({ code: "CONFLICT", message: "Cette référence correspond à une autre proposition." });
      if (state.proposal?.id !== input.requestId) throw new TRPCError({ code: "CONFLICT", message: "Une proposition plus récente existe. Relisez-la avant de poursuivre." });
      return data!.result as SalesOfferResult;
    }
    if (state.node !== "QUALIFIED" || state.contactStopped || deal.paymentReference || mandate!.informationOnly) fail("Qualifiez le besoin du client avant de préparer une proposition. Les conditions déjà présentées restent conservées.");
    if (deal.revision !== input.expectedRevision) throw new TRPCError({ code: "CONFLICT", message: "L’affaire a changé. Relisez-la avant de préparer la proposition." });
    if (new Date(mandate!.expiresAt) <= new Date()) fail("Les conditions de vente ont expiré. Faites-les vérifier avant de continuer.");
    if (mandate!.offerId !== input.offerId) fail("Choisissez d’abord une offre autorisée pour cette affaire.");
    if (mandate!.pricingRule && (!mandate!.pricingRule.countryCodes.includes(input.countryCode) || input.quantity > mandate!.pricingRule.maxQuantity)) fail("Ce pays ou cette quantité ne fait pas partie des conditions de vente approuvées.");
    if (!mandate!.pricingRule && input.quantity !== 1) fail("Cette offre fixe autorise une seule prestation. Faites approuver un autre volume avant de la modifier.");
    const country = await lookupCountry(input.countryCode);
    if (!country || country.code !== input.countryCode) fail("Précisez un pays reconnu pour calculer le tarif.");
    if (actor.id.startsWith("mcp:") && !input.customerMessageId) fail("Référencez le message reçu du client qui précise son besoin.");
    if (input.customerMessageId) {
      const message = await tx.crmMessage.findUnique({ where: { id: input.customerMessageId } });
      if (!message || message.salesDealId !== deal.id || message.direction !== "IN" || message.status !== "RECEIVED") fail("Référencez un message réellement reçu dans cette affaire.");
    }
    await assertSalesCatalogueOfferIn(tx, deal.sellerStrategyId!, mandate!);
    const tier = mandate!.pricingRule ? getTier(mandate!.pricingRule.tierKey) : null;
    const scope = tier ? [tier.summary, ...tier.inclusions] : [mandate!.terms];
    if (!mandate!.billing && !tier) fail("Précisez la période du prix fixe avant de préparer le devis.");
    if (!mandate!.taxTreatment || mandate!.taxTreatment === "UNSPECIFIED") fail("Précisez si le montant est le prix final à payer ou un prix hors taxes.");
    const toolInput: Record<string, string> = {
      country_code: input.countryCode,
      tier_mapping: JSON.stringify(tier ? { [input.offerId]: mandate!.pricingRule!.tierKey } : {}),
      catalogue_terms: JSON.stringify(tier ? {} : { [input.offerId]: { currency: mandate!.currency, billing: mandate!.billing, conditions: [mandate!.terms], sourceRef: `sales-authorization:${deal.id}:${mandate!.offerVersion}` } }),
      owner_authorized_offer_ids: JSON.stringify([input.offerId]),
      quote_request: JSON.stringify({ lines: [{ offerId: input.offerId, quantity: input.quantity }], client: { name: deal.companyName || deal.contactName, reference: deal.id },
        conditions: [mandate!.terms], scope, exclusions: mandate!.exclusions ?? [], validUntil: mandate!.expiresAt,
        taxTreatment: mandate!.taxTreatment, ...(mandate!.taxTreatment === "EXCLUDED" ? { taxRatePct: mandate!.taxRatePct } : {}) }),
    };
    const generated = await executeTool("devis-generator", deal.sellerStrategyId!, toolInput);
    const parsed = commercialQuoteOutputSchema.safeParse(generated.output);
    if (!parsed.success) fail("Le générateur n’a pas fourni un devis exploitable. Aucune proposition n’a été engagée.");
    const quote = parsed.data!.devis;
    if (quote.status !== "READY") fail(quote.gaps.join(" ") || "Complétez les informations nécessaires au devis.");
    if (quote.groups.length !== 1 || quote.lines.length !== 1 || quote.groups[0]!.total === null) fail("Présentez séparément les abonnements et les prestations ponctuelles. Aucun total global n’est engagé.");
    const group = quote.groups[0]!, line = quote.lines[0]!;
    if (line.offerId !== input.offerId || line.quantity !== input.quantity || line.unitPrice === null || !quote.sources.some(source => source.kind === "CATALOGUE" && String(source.version) === mandate!.offerVersion)) fail("Le devis doit correspondre à l’offre et à sa version approuvées.");
    if (!tier && (line.unitPrice !== mandate!.amount || group.currency !== mandate!.currency)) fail("Le prix du catalogue diffère du prix fixe approuvé. Faites vérifier les conditions avant de poursuivre.");
    const access = await issueCustomerAccessIn(tx, deal.id);
    const token = access.path.split("/").at(-1)!;
    const proposal = salesProposalSchema.parse({ id: input.requestId, offerId: input.offerId, offerName: mandate!.offerName,
      amount: group.total, unitPrice: line.unitPrice, currency: group.currency, billing: group.billing,
      quantity: input.quantity, countryCode: input.countryCode, terms: mandate!.terms, scope: quote.scope, exclusions: quote.exclusions,
      preparedAt: new Date().toISOString(), sourceVersion: mandate!.offerVersion, gloryOutputId: generated.outputId,
      taxTreatment: mandate!.taxTreatment, subtotal: group.subtotal, taxRatePct: group.taxRatePct, taxAmount: group.tax });
    const next = { ...state, proposal, mandate: { ...mandate!, amount: proposal.amount, currency: proposal.currency, billing: proposal.billing } };
    const changed = await tx.deal.updateMany({ where: { id: deal.id, revision: input.expectedRevision }, data: {
      commercial: JSON.parse(JSON.stringify(next)), value: proposal.amount, currency: proposal.currency, revision: { increment: 1 },
    } });
    if (changed.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "L’affaire a changé pendant la préparation. Relisez-la avant de continuer." });
    const result = { status: "READY" as const, dealId: deal.id, revision: deal.revision + 1,
      proposal: { ...proposal, documentUrl: `/api/sales/${token}/proposal` },
      currentState: { node: state.node, treeNodeId: state.treeNodeId ?? null, nextAction: state.nextAction ?? null } };
    await tx.cRMActivity.create({ data: { id: `sales-offer:${input.requestId}`, dealId: deal.id, performedBy: actor.id, activityType: "SALES_OFFER_PREPARED",
      description: "Proposition et devis préparés depuis les conditions autorisées.", metadata: JSON.parse(JSON.stringify({ fingerprint: requestHash, authorizationIntentId, customerMessageId: input.customerMessageId, result, gloryIntentId: generated.intentId })) } });
    return result;
  }, { timeout: 20000 });
}

export type SalesOfferResult = { status: "READY"; dealId: string; revision: number;
  proposal: import("./offer-contract").SalesProposal & { documentUrl: string };
  currentState: { node: string; treeNodeId: string | null; nextAction: string | null } };
