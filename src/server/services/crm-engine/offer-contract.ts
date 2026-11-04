import { z } from "zod";
import { TIER_ORDER, type PricingTierKey } from "../monetization/pricing-tiers";

const text = z.string().trim().min(1).max(4000);
export const salesBillingSchema = z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]);
/** The owner associates a real catalogue product with an existing price formula. */
export const salesPricingRuleSchema = z.object({
  kind: z.literal("MARKET_TIER"),
  tierKey: z.enum(TIER_ORDER as [PricingTierKey, ...PricingTierKey[]]),
  countryCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(30),
  maxQuantity: z.number().int().min(1).max(100).default(1),
}).strict().superRefine((rule, ctx) => {
  if (new Set(rule.countryCodes).size !== rule.countryCodes.length) ctx.addIssue({ code: "custom", message: "Chaque pays autorisé doit apparaître une seule fois." });
});

export const salesProposalSchema = z.object({
  id: z.string().uuid(), offerId: text, offerName: text,
  amount: z.number().finite().nonnegative(), unitPrice: z.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/), billing: salesBillingSchema,
  quantity: z.number().int().min(1).max(100), countryCode: z.string().regex(/^[A-Z]{2}$/),
  terms: text, scope: z.array(z.string()).default([]), exclusions: z.array(z.string()).default([]),
  preparedAt: z.string().datetime(), presentedAt: z.string().datetime().optional(),
  sourceVersion: z.string().min(1), gloryOutputId: z.string().min(1),
  taxTreatment: z.enum(["INCLUDED_IN_PRICE", "EXCLUDED", "UNSPECIFIED"]).optional(),
  subtotal: z.number().finite().nonnegative().optional(),
  taxRatePct: z.number().finite().min(0).max(100).nullable().optional(),
  taxAmount: z.number().finite().nonnegative().nullable().optional(),
});
export type SalesProposal = z.infer<typeof salesProposalSchema>;
export const prepareSalesOfferInput = z.object({
  dealId: z.string().min(1), requestId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(),
  offerId: z.string().min(1), countryCode: z.string().regex(/^[A-Z]{2}$/),
  quantity: z.number().int().min(1).max(100).default(1), customerMessageId: z.string().min(1).optional(),
  clientName: z.string().trim().min(1).max(200).optional(),
}).strict();
export type PrepareSalesOfferInput = z.input<typeof prepareSalesOfferInput>;
