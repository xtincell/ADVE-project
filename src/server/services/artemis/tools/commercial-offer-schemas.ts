/** Contracts of the existing pricing/devis Glory tools. No executable pricing rule here. */
import { z } from "zod";

export const commercialBillingSchema = z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]);
export const commercialTaxTreatmentSchema = z.enum(["INCLUDED_IN_PRICE", "EXCLUDED", "UNSPECIFIED"]);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const text = z.string().trim().min(1).max(4000);
const tierSchema = z.enum(["INTAKE_FREE", "INTAKE_PDF", "ORACLE_FULL", "COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]);

/** Must be supplied by the owner/authorized caller; never inferred from product names. */
export const commercialTierMappingSchema = z.record(z.string().min(1), tierSchema);
export const commercialAuthorizedOffersSchema = z.array(z.string().trim().min(1).max(200)).max(50);
export const commercialCatalogueTermsSchema = z.record(z.string().min(1), z.object({
  currency: currencySchema,
  billing: commercialBillingSchema,
  conditions: z.array(text).max(30).optional(),
  sourceRef: text,
}).strict());

/** Selection contains no price. Conditions/scope come from the owner's authorization. */
export const commercialQuoteRequestSchema = z.object({
  lines: z.array(z.object({
    offerId: z.string().trim().min(1).max(200),
    quantity: z.number().finite().positive().max(100_000),
  }).strict()).min(1).max(50),
  client: z.object({ name: text, reference: text.optional() }).strict().optional(),
  conditions: z.array(text).max(30).optional(),
  scope: z.array(text).max(50).optional(),
  exclusions: z.array(text).max(50).optional(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  taxRatePct: z.number().finite().min(0).max(100).optional(),
  taxTreatment: commercialTaxTreatmentSchema.optional(),
}).strict().superRefine((value, ctx) => {
  const ids = value.lines.map(line => line.offerId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["lines"], message: "Regroupez les quantités d’une même offre sur une ligne." });
  if (value.taxTreatment === "INCLUDED_IN_PRICE" && value.taxRatePct !== undefined) ctx.addIssue({ code: "custom", path: ["taxRatePct"], message: "Le prix final inclut les taxes sans ventilation ; ne lui ajoutez pas un taux." });
  if (value.taxTreatment === "UNSPECIFIED" && value.taxRatePct !== undefined) ctx.addIssue({ code: "custom", path: ["taxRatePct"], message: "Précisez le traitement des taxes avant d’appliquer un taux." });
});
export type CommercialQuoteRequest = z.infer<typeof commercialQuoteRequestSchema>;

export const commercialSourceSchema = z.object({
  kind: z.enum(["CATALOGUE", "MONETIZATION", "OWNER_INPUT"]),
  reference: text,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.number().int().nonnegative().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
const priceItemSchema = z.object({
  offerId: z.string(),
  offerName: z.string(),
  status: z.enum(["PRICED", "NEEDS_INPUT"]),
  unitPrice: z.number().finite().nonnegative().nullable(),
  currency: currencySchema.nullable(),
  billing: commercialBillingSchema.nullable(),
  conditions: z.array(z.string()),
  availability: z.string().nullable(),
  sources: z.array(commercialSourceSchema),
  gaps: z.array(z.string()),
});
export const commercialPricingDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["READY", "NEEDS_INPUT"]),
  countryCode: z.string().nullable(),
  items: z.array(priceItemSchema),
  gaps: z.array(z.string()),
  note: z.string(),
});
export const commercialPricingOutputSchema = z.object({ pricing_strategy: commercialPricingDocumentSchema });
export type CommercialPriceItem = z.infer<typeof priceItemSchema>;
export type CommercialPricingDocument = z.infer<typeof commercialPricingDocumentSchema>;

export const commercialQuoteDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["READY", "NEEDS_INPUT"]),
  client: z.object({ name: z.string(), reference: z.string().optional() }).nullable(),
  lines: z.array(priceItemSchema.extend({
    quantity: z.number().finite().positive(),
    lineTotal: z.number().finite().nonnegative().nullable(),
  })),
  groups: z.array(z.object({
    currency: currencySchema,
    billing: commercialBillingSchema,
    subtotal: z.number().finite().nonnegative(),
    taxTreatment: commercialTaxTreatmentSchema,
    taxRatePct: z.number().finite().min(0).max(100).nullable(),
    tax: z.number().finite().nonnegative().nullable(),
    total: z.number().finite().nonnegative().nullable(),
  })),
  conditions: z.array(z.string()),
  scope: z.array(z.string()),
  exclusions: z.array(z.string()),
  validUntil: z.string().nullable(),
  sources: z.array(commercialSourceSchema),
  gaps: z.array(z.string()),
  note: z.string(),
});
export const commercialQuoteOutputSchema = z.object({ devis: commercialQuoteDocumentSchema });
export type CommercialQuoteDocument = z.infer<typeof commercialQuoteDocumentSchema>;
