import { z } from "zod";
import { SourceReceiptSchema } from "./source-certainty";

/** A versioned FINANCE source, not a new ledger or an adopted business model. */
export const FinancialAmountSchema = z.object({
  value: z.number().finite().nonnegative().nullable(),
  qualification: z.enum(["SOURCED", "HISTORICAL", "ASSUMPTION"]),
  note: z.string().trim().min(1).max(4000),
  sources: z.array(SourceReceiptSchema.extend({ locator: z.string().trim().min(1).max(1000) })).max(30),
}).superRefine((value, ctx) => {
  if (value.qualification !== "ASSUMPTION" && value.sources.length === 0) {
    ctx.addIssue({ code: "custom", path: ["sources"], message: "Une valeur documentaire exige sa source et son emplacement." });
  }
});
const line = FinancialAmountSchema.safeExtend({ label: z.string().trim().min(1).max(180) });
export const BreakEvenDocumentModelSchema = z.object({
  schema: z.literal("adve-break-even-model-v1"),
  title: z.string().trim().min(1).max(180),
  currency: z.string().regex(/^[A-Z]{3}$/),
  period: z.literal("MONTH"),
  scope: z.string().trim().min(1).max(4000),
  payer: z.string().trim().min(1).max(1000),
  payerPersonaId: z.string().min(1).max(150).optional(),
  unit: z.string().trim().min(1).max(300),
  taxBasis: z.enum(["HT", "TTC", "NO_VAT"]),
  price: FinancialAmountSchema,
  fixedCosts: z.array(line).min(1).max(100),
  variableCosts: z.array(line).min(1).max(100),
  exclusions: z.array(z.string().trim().min(1).max(2000)).max(50),
  assumptions: z.array(z.string().trim().min(1).max(2000)).max(50),
  growth: z.object({ initialUnits: z.number().finite().nonnegative(), monthlyIncrease: z.number().finite().nonnegative(),
    firstMonth: z.union([z.literal(0), z.literal(1)]), note: z.string().max(2000).optional() }).optional(),
});
export type BreakEvenDocumentModel = z.infer<typeof BreakEvenDocumentModelSchema>;

/** Human labels shared by the existing financial screen, chart and Word. */
export const FINANCIAL_TAX_BASIS_LABEL: Record<BreakEvenDocumentModel["taxBasis"], string> = {
  HT: "HT", TTC: "TTC", NO_VAT: "sans TVA collectée",
};
