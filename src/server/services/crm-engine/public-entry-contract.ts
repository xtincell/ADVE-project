/** A public door delegates only inbound WEB conversations to the existing sales desk. */
import { z } from "zod";
import { collectionSchema, mandateSchema } from "./commercial";

const label = z.string().trim().min(1).max(200);
export const publicSalesOfferSchema = mandateSchema.pick({
  offerId: true, offerVersion: true, offerName: true, terms: true,
  amount: true, currency: true, deliveryOwnerId: true, beneficiary: true,
  expiresAt: true, paymentInstructions: true, conversationTree: true, pricingRule: true, billing: true,
  taxTreatment: true, taxRatePct: true, exclusions: true,
}).extend({
  amount: z.number().finite().nonnegative().optional(),
  currency: mandateSchema.shape.currency.optional(),
  beneficiary: mandateSchema.shape.beneficiary.optional(),
  paymentInstructions: mandateSchema.shape.paymentInstructions.optional(),
  collection: collectionSchema.omit({ attestedBy: true, attestedAt: true }).strict().optional(),
}).strict();

export const saveSalesPublicEntryInput = z.object({
  strategyId: label,
  expectedRevision: z.number().int().nonnegative(),
  representativeId: label,
  enabled: z.boolean(),
  informationOnly: z.boolean().default(false),
  publicBrandName: z.string().trim().min(1).max(120),
  welcome: z.string().trim().min(1).max(600),
  market: label,
  maxConversationsPerDay: z.number().int().min(1).max(100).default(10),
  maxConversationsPerHour: z.number().int().min(1).max(30).default(5),
  offers: z.array(publicSalesOfferSchema).min(1).max(10),
  collectionAttested: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.offers.map(offer => offer.offerId)).size !== value.offers.length) {
    ctx.addIssue({ code: "custom", path: ["offers"], message: "Chaque offre publiée doit être distincte." });
  }
  if (value.maxConversationsPerHour > value.maxConversationsPerDay) {
    ctx.addIssue({ code: "custom", path: ["maxConversationsPerHour"], message: "La limite horaire ne peut dépasser la limite quotidienne." });
  }
  if (value.offers.some(offer => offer.collection) && !value.collectionAttested) {
    ctx.addIssue({ code: "custom", path: ["collectionAttested"], message: "Confirmez où recevoir les paiements avant de l’autoriser." });
  }
  if (!value.informationOnly) value.offers.forEach((offer, index) => {
    if (!offer.pricingRule && offer.amount === undefined) ctx.addIssue({ code: "custom", path: ["offers", index, "amount"], message: "Renseignez le prix approuvé ou la règle de calcul de cette offre." });
    if (!offer.pricingRule && !offer.currency) ctx.addIssue({ code: "custom", path: ["offers", index, "currency"], message: "Renseignez la devise du prix fixe." });
    if (!offer.beneficiary) ctx.addIssue({ code: "custom", path: ["offers", index, "beneficiary"], message: "Renseignez le bénéficiaire approuvé pour cette vente." });
    if (!offer.paymentInstructions) ctx.addIssue({ code: "custom", path: ["offers", index, "paymentInstructions"], message: "Renseignez les conditions de paiement approuvées pour cette vente." });
  });
});
export type SaveSalesPublicEntryInput = z.input<typeof saveSalesPublicEntryInput>;

export const startPublicSalesConversationInput = z.object({
  requestId: z.string().uuid(),
  /** Browser-generated capability; persisted only as a digest, never sent in a URL. */
  clientSecret: z.string().regex(/^[a-f0-9]{64}$/),
  message: z.string().trim().min(1).max(4000),
  displayName: z.string().trim().min(1).max(80).optional(),
  offerId: z.string().trim().min(1).max(200).optional(),
}).strict();
export type StartPublicSalesConversationInput = z.input<typeof startPublicSalesConversationInput>;
