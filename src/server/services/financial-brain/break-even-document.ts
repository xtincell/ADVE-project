import { BreakEvenDocumentModelSchema, type BreakEvenDocumentModel } from "@/domain/financial-document";
import { calculateBreakeven } from "./break-even";

/** Reuses the canonical calculator. All monetary inputs have one currency,
 * tax basis and monthly period, declared in the retained source document. */
export function composeBreakEvenDocument(brand: string, input: BreakEvenDocumentModel) {
  const model = BreakEvenDocumentModelSchema.parse(input);
  const missing = [...(model.price.value === null ? ["Prix unitaire"] : []),
    ...[...model.fixedCosts, ...model.variableCosts].filter(v => v.value === null).map(v => v.label)];
  const total = (lines: typeof model.fixedCosts) => lines.some(v => v.value === null) ? NaN : lines.reduce((sum, v) => sum + v.value!, 0);
  const fixed = total(model.fixedCosts), variable = total(model.variableCosts), price = model.price.value ?? NaN;
  const scenarios = [
    { label: "Scénario de base", price, variable, fixed },
    { label: "Prix réduit de 20 %", price: price * .8, variable, fixed },
    { label: "Charges fixes réduites de 30 %", price, variable, fixed: fixed * .7 },
    { label: "Coûts variables réduits de 15 %", price, variable: variable * .85, fixed },
  ].map(s => ({ ...s, price: Number.isFinite(s.price) ? s.price : null,
    variable: Number.isFinite(s.variable) ? s.variable : null, fixed: Number.isFinite(s.fixed) ? s.fixed : null,
    analysis: calculateBreakeven({ fixedCosts: s.fixed, variableCostPerUnit: s.variable, pricePerUnit: s.price, costPeriod: "MONTH" }) }));
  const base = scenarios[0]!.analysis;
  const growth = model.growth;
  const firstProfitableMonth = base.breakEvenUnits !== null && growth
    ? growth.initialUnits >= base.breakEvenUnits ? growth.firstMonth
      : growth.monthlyIncrease > 0 ? growth.firstMonth + Math.ceil((base.breakEvenUnits - growth.initialUnits) / growth.monthlyIncrease) : null
    : null;
  const chart: { units: number; revenue: number; cost: number }[] = [];
  if (base.status === "COMPUTED") {
    const maxUnits = Math.max(10, Math.ceil(base.breakEvenUnits! * 1.6));
    const points = new Set([0, base.breakEvenUnits!, ...Array.from({ length: 41 }, (_, n) => Math.round(n * maxUnits / 40))]);
    for (const units of [...points].sort((a, b) => a - b)) chart.push({ units, revenue: units * price, cost: fixed + units * variable });
  }
  return { schema: "adve-break-even-document-v1" as const, brand, title: model.title, model,
    state: missing.length ? "INCOMPLETE" as const
      : [model.price, ...model.fixedCosts, ...model.variableCosts].some(v => v.qualification !== "SOURCED")
        ? "SCENARIO" as const : "DOCUMENTED_ESTIMATE" as const,
    missing, base, scenarios, chart, firstProfitableMonth,
    delayNote: growth ? "Projection conditionnelle du premier mois couvrant les charges mensuelles ; ne mesure ni ventes réalisées ni remboursement de l’investissement."
      : "Aucune trajectoire commerciale chiffrée : délai non déterminable.",
  };
}
export type BreakEvenDocument = ReturnType<typeof composeBreakEvenDocument>;
