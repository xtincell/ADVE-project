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

/** ADVE premises for a reproducible working model. A source receipt identifies
 * its documentary edition; it does not turn forecasts into observed results. */
export const FinancialWorkingModelSchema = z.object({
  schema: z.literal("adve-financial-working-model-v1"),
  source: SourceReceiptSchema,
  breakEven: BreakEvenDocumentModelSchema,
  projection: z.object({
    monthlyVolumes: z.array(FinancialAmountSchema).length(12),
    unitsPerPayerMonth: FinancialAmountSchema,
    annualRetentionRate: FinancialAmountSchema,
    ltvHorizonMonths: z.number().int().min(1).max(120),
    acquisitionPaybackCeilingMonths: z.number().int().min(1).max(120),
    marketingFixedCostIndexes: z.array(z.number().int().nonnegative()),
    marketingVariableCostIndexes: z.array(z.number().int().nonnegative()),
    note: z.string().trim().min(1).max(4000),
    cashFlow: z.object({ openingCash: FinancialAmountSchema,
      revenueDelayMonths: z.number().int().min(0).max(12), costDelayMonths: z.number().int().min(0).max(12),
      note: z.string().trim().min(1).max(4000) }),
  }),
}).superRefine((value, ctx) => {
  const model = value.breakEven, p = value.projection;
  for (const [path, amount] of [
    [["breakEven", "price"], model.price],
    ...model.fixedCosts.map((a, i) => [["breakEven", "fixedCosts", i], a]),
    ...model.variableCosts.map((a, i) => [["breakEven", "variableCosts", i], a]),
    ...p.monthlyVolumes.map((a, i) => [["projection", "monthlyVolumes", i], a]),
    [["projection", "unitsPerPayerMonth"], p.unitsPerPayerMonth],
    [["projection", "annualRetentionRate"], p.annualRetentionRate],
    [["projection", "cashFlow", "openingCash"], p.cashFlow.openingCash],
  ] as Array<[(string | number)[], { value: number | null }]>) {
    if (amount.value === null) ctx.addIssue({ code: "custom", path: [...path, "value"], message: "Établissez cette prémisse dans le modèle ADVE avant le calcul." });
  }
  if (!model.payerPersonaId) ctx.addIssue({ code: "custom", path: ["breakEven", "payerPersonaId"], message: "Identifiez la même cohorte payeuse pour les coûts et la valeur." });
  if (model.price.value !== null && model.price.value <= 0) ctx.addIssue({ code: "custom", path: ["breakEven", "price", "value"], message: "Le prix du modèle doit être positif." });
  if (p.unitsPerPayerMonth.value !== null && p.unitsPerPayerMonth.value <= 0) ctx.addIssue({ code: "custom", path: ["projection", "unitsPerPayerMonth", "value"], message: "Déclarez un volume positif par client et par mois." });
  if (p.annualRetentionRate.value !== null && p.annualRetentionRate.value > 1) ctx.addIssue({ code: "custom", path: ["projection", "annualRetentionRate", "value"], message: "La rétention annuelle est un coefficient entre 0 et 1." });
  if (p.acquisitionPaybackCeilingMonths > p.ltvHorizonMonths) ctx.addIssue({ code: "custom", path: ["projection", "acquisitionPaybackCeilingMonths"], message: "Le plafond de récupération doit rester dans l’horizon de valeur." });
  for (const [key, lines] of [["marketingFixedCostIndexes", model.fixedCosts], ["marketingVariableCostIndexes", model.variableCosts]] as const) {
    const indexes = p[key];
    if (new Set(indexes).size !== indexes.length || indexes.some(i => i >= lines.length)) ctx.addIssue({ code: "custom", path: ["projection", key], message: "Chaque charge de communication doit référencer une ligne existante une seule fois." });
  }
});
export type FinancialWorkingModel = z.infer<typeof FinancialWorkingModelSchema>;

export interface BreakEvenInput {
  fixedCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
  monthlyVolume?: number;
  costPeriod?: "MONTH" | "YEAR";
}

export interface BreakEvenAnalysis {
  status: "COMPUTED" | "INSUFFICIENT_DATA" | "NO_FINITE_BREAK_EVEN";
  issues: string[];
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  revenueAtWholeUnits: number | null;
  breakEvenMonths: number | null;
  marginOfSafety: number | null;
  contributionMargin: number | null;
  contributionMarginRatio: number | null;
}

/** Existing Financial Brain arithmetic, shared by server and client readers. */
export function calculateBreakeven(input: BreakEvenInput): BreakEvenAnalysis {
  const { fixedCosts, variableCostPerUnit, pricePerUnit, monthlyVolume } = input;
  const issues = Object.entries({ fixedCosts, variableCostPerUnit, pricePerUnit })
    .filter(([, value]) => typeof value !== "number" || !Number.isFinite(value) || value < 0)
    .map(([key]) => `${key} absent ou invalide`);
  if (pricePerUnit === 0) issues.push("pricePerUnit doit être strictement positif");
  const empty = { breakEvenUnits: null, breakEvenRevenue: null, revenueAtWholeUnits: null,
    breakEvenMonths: null, marginOfSafety: null, contributionMargin: null, contributionMarginRatio: null };
  if (issues.length) return { ...empty, status: "INSUFFICIENT_DATA", issues };
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = contributionMargin / pricePerUnit;
  if (contributionMargin <= 0) return { ...empty, status: "NO_FINITE_BREAK_EVEN",
    issues: ["La contribution unitaire ne couvre pas les charges fixes."], contributionMargin, contributionMarginRatio };
  const theoreticalUnits = fixedCosts / contributionMargin;
  const breakEvenUnits = Math.ceil(theoreticalUnits);
  const comparableVolume = typeof monthlyVolume === "number" && Number.isFinite(monthlyVolume) && monthlyVolume >= 0 && input.costPeriod
    ? monthlyVolume * (input.costPeriod === "YEAR" ? 12 : 1) : null;
  return {
    status: "COMPUTED", issues: [], breakEvenUnits,
    breakEvenRevenue: fixedCosts / contributionMarginRatio,
    revenueAtWholeUnits: breakEvenUnits * pricePerUnit,
    breakEvenMonths: null,
    marginOfSafety: comparableVolume !== null && comparableVolume > 0
      ? Math.round((comparableVolume - theoreticalUnits) / comparableVolume * 100) / 100 : null,
    contributionMargin,
    contributionMarginRatio,
  };
}

/** Human labels shared by the existing financial screen, chart and Word. */
export const FINANCIAL_TAX_BASIS_LABEL: Record<BreakEvenDocumentModel["taxBasis"], string> = {
  HT: "HT", TTC: "TTC", NO_VAT: "sans TVA collectée",
};
