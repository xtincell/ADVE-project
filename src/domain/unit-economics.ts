import { calculateBreakeven, FinancialWorkingModelSchema } from "./financial-document";

/** The ratio is a calculation over the displayed inputs, never a cached claim. */
export function unitEconomicsRatio(cac: unknown, ltv: unknown, recordedRatio?: unknown): number | null {
  if (typeof cac !== "number" || !Number.isFinite(cac) || cac <= 0
    || typeof ltv !== "number" || !Number.isFinite(ltv) || ltv < 0) return null;
  // null is an explicit refusal in an assembled section, not a missing cached input.
  if (recordedRatio === null) return null;
  const ratio = ltv / cac;
  const rounded = Math.round(ratio * 100) / 100;
  if (!Number.isFinite(rounded)) return null;
  // A contradictory saved ratio may describe another client cohort or period.
  // Refuse that economic claim instead of silently replacing it with a quotient.
  if (typeof recordedRatio === "number" && (!Number.isFinite(recordedRatio) || Math.abs(recordedRatio - rounded) > 0.01)) return null;
  return rounded;
}

/** Carry the source's customer/period qualification into every output reader. */
export function unitEconomicsNote(ue: { cac?: unknown; ltv?: unknown; ltvCacRatio?: unknown; commentaire?: unknown }): string | null {
  const inconsistent = typeof ue.ltvCacRatio === "number"
    && unitEconomicsRatio(ue.cac, ue.ltv, ue.ltvCacRatio) === null;
  const source = typeof ue.commentaire === "string" ? ue.commentaire.trim() : "";
  const warning = inconsistent
    ? "Ratio à requalifier : les montants et le ratio enregistré ne correspondent pas. Vérifiez que CAC et LTV portent sur le même type de client et la même période."
    : "";
  return [warning, source].filter(Boolean).join("\n\n") || null;
}
export interface FinancialMetricContext {
  kind: "WORKING_MODEL";
  currency: string;
  cohort: string;
  ltvHorizonMonths: number;
  outcomes: Record<string, string>;
}

/** One calculation over the admitted ADVE premises. No sector or country
 * benchmark is substituted for a missing amount, cohort or forecast. */
export function projectFinancialWorkingModel(value: unknown) {
  const parsed = FinancialWorkingModelSchema.safeParse(value);
  if (!parsed.success) return { status: "INCOMPLETE_MODEL" as const,
    issues: parsed.error.issues.map(i => `${i.path.join(".")} : ${i.message}`) };
  const model = parsed.data, b = model.breakEven, p = model.projection;
  // The schema has refused all null premises before arithmetic is allowed.
  const sum = (lines: Array<{ value: number | null }>) => lines.reduce((n, v) => n + v.value!, 0);
  const fixed = sum(b.fixedCosts), variable = sum(b.variableCosts), price = b.price.value!;
  const volumes = p.monthlyVolumes.map(v => v.value!);
  const yearVolume = volumes.reduce((a, n) => a + n, 0);
  const revenue = price * yearVolume;
  const contribution = price - variable;
  const payerContribution = contribution * p.unitsPerPayerMonth.value!;
  const monthlyRetention = Math.pow(p.annualRetentionRate.value!, 1 / 12);
  const contributions = Array.from({ length: p.ltvHorizonMonths }, (_, n) => payerContribution * Math.pow(monthlyRetention, n));
  const ltv = contributions.reduce((a, n) => a + n, 0);
  const cac = Math.max(0, contributions.slice(0, p.acquisitionPaybackCeilingMonths).reduce((a, n) => a + n, 0));
  const ratio = cac > 0 ? Math.round(ltv / cac * 100) / 100 : null;
  const roi = cac > 0 ? (ltv - cac) / cac * 100 : null;
  const analysis = calculateBreakeven({ fixedCosts: fixed, variableCostPerUnit: variable, pricePerUnit: price, costPeriod: "MONTH" });
  const firstMonth = analysis.breakEvenUnits === null ? -1 : volumes.findIndex(n => n >= analysis.breakEvenUnits!);
  const outcomes: Record<string, string> = {};
  if (cac === 0) {
    outcomes.ltvCacRatio = "Non applicable : la contribution ne permet aucun budget d’acquisition payante.";
    outcomes.roiEstime = outcomes.ltvCacRatio;
    outcomes.paybackPeriod = "Non applicable : acquisition payante non finançable par cette contribution.";
  }
  if (revenue === 0) outcomes.margeNette = "Non applicable : aucun revenu dans la trajectoire proposée.";
  const marketing = p.marketingFixedCostIndexes.reduce((n, i) => n + b.fixedCosts[i]!.value!, 0) * 12
    + p.marketingVariableCostIndexes.reduce((n, i) => n + b.variableCosts[i]!.value!, 0) * yearVolume;
  let cash = p.cashFlow.openingCash.value!;
  const cashBalances = volumes.map((_, month) => {
    const receipts = month >= p.cashFlow.revenueDelayMonths ? price * volumes[month - p.cashFlow.revenueDelayMonths]! : 0;
    const paymentMonth = month - p.cashFlow.costDelayMonths;
    const payments = paymentMonth >= 0 ? fixed + variable * volumes[paymentMonth]! : 0;
    cash += receipts - payments;
    return cash;
  });
  const values = {
    cac, ltv, ltvCacRatio: ratio, roiEstime: roi,
    paybackPeriod: cac > 0 ? p.acquisitionPaybackCeilingMonths : null,
    margeNette: revenue > 0 ? (revenue - fixed * 12 - variable * yearVolume) / revenue : null,
    caVise: revenue, budgetCom: marketing,
    pointMort: analysis.breakEvenUnits !== null
      ? `${analysis.breakEvenUnits} ${b.unit} ; ${analysis.revenueAtWholeUnits!.toLocaleString("fr-FR")} ${b.currency}`
      : "Aucun seuil fini avec cette contribution unitaire.",
  };
  const note = [
    `Modèle de travail en ${b.currency}, cohorte : ${b.payer}. Coûts mensuels ; revenu et communication sur les douze mois proposés.`,
    `LTV contributive sur ${p.ltvHorizonMonths} mois. Le CAC est un plafond proposé récupérable en ${p.acquisitionPaybackCeilingMonths} mois ; ratio et ROI sont évalués à ce plafond, pas mesurés.`,
    "La marge porte sur les charges incluses au modèle. Le budget de communication est une part de ces charges, sans ajout au coût total.",
    `Trésorerie conditionnelle : ${p.cashFlow.note} Solde initial et délais proposés ; obligations antérieures et coûts hors périmètre exclus.`,
    b.scope, ...b.exclusions, p.note, ...Object.values(outcomes),
  ].join("\n\n");
  return { status: "COMPUTED" as const, values, outcomes, analysis, cashBalances, monthlyVolumes: volumes,
    firstProfitableMonth: firstMonth < 0 ? null : firstMonth + 1,
    projectionOutcome: firstMonth < 0 ? "NOT_REACHED_WITHIN_HORIZON" as const : "REACHED_WITHIN_HORIZON" as const,
    currency: b.currency, cohort: b.payer, ltvHorizonMonths: p.ltvHorizonMonths,
    source: model.source, note };
}

/** A selected financial model is the current calculation basis. Legacy rows
 * stay stored and unchanged; they are used when no model has been supplied. */
export function resolveUnitEconomics(v: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const raw = v?.unitEconomics;
  const legacy = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  if (v?.financialModel == null) return legacy;
  const projection = projectFinancialWorkingModel(v.financialModel);
  if (projection.status !== "COMPUTED") return {
    cac: null, ltv: null, ltvCacRatio: null, roiEstime: null, paybackPeriod: null,
    margeNette: null, caVise: null, budgetCom: null, pointMort: null,
    commentaire: `Complétez les prémisses du modèle dans l’ADVE :\n${projection.issues.join("\n")}`,
    _financialModel: projection,
  };
  const context: FinancialMetricContext = { kind: "WORKING_MODEL", currency: projection.currency,
    cohort: projection.cohort, ltvHorizonMonths: projection.ltvHorizonMonths, outcomes: projection.outcomes };
  return { ...projection.values, currency: projection.currency, commentaire: projection.note, _financialContext: context,
    _financialModel: { status: projection.status }, _legacyComment: legacy.commentaire };
}

/** Canonical read projection for financial consumers. Storage and source
 * provenance are left untouched; all consumers receive the same calculation. */
export function projectFinancialPillar(content: Record<string, unknown>): Record<string, unknown> {
  if (content.financialModel == null) return content;
  const raw = content._fieldProvenance;
  const provenance = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "unitEconomics" && !key.startsWith("unitEconomics."))) : {};
  return { ...content, unitEconomics: resolveUnitEconomics(content),
    _fieldProvenance: { ...provenance, unitEconomics: "INFERRED" } };
}

/** Shared business labels and units for the ADVE screen, Oracle and export.
 * A known mathematical non-applicability is rendered as an outcome, not a gap. */
export function unitEconomicsMetricRows(ue: Record<string, unknown>) {
  const c = ue._financialContext as FinancialMetricContext | undefined;
  const working = c?.kind === "WORKING_MODEL";
  const currency = working ? c.currency : typeof ue.currency === "string" ? ue.currency : "FCFA";
  const num = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const money = (n: number) => `${num(n)} ${currency}`;
  const ratio = unitEconomicsRatio(ue.cac, ue.ltv, ue.ltvCacRatio);
  const rows: Array<[string, string, unknown, (n: number) => string]> = [
    ["cac", working ? "Plafond CAC proposé" : "CAC", ue.cac, money],
    ["ltv", working ? `LTV contributive sur ${c.ltvHorizonMonths} mois` : "LTV", ue.ltv, money],
    ["ltvCacRatio", working ? "LTV / CAC au plafond proposé" : "LTV / CAC calculé", ratio, n => `${num(n)}x`],
    ["margeNette", working ? "Marge de fonctionnement du modèle" : "Marge nette", ue.margeNette, n => `${num(n * 100)} %`],
    ["roiEstime", working ? "ROI contributif au plafond proposé" : "ROI estimé", ue.roiEstime, n => `${num(n)} %`],
    ["paybackPeriod", working ? "Plafond de récupération proposé" : "Payback", ue.paybackPeriod, n => `${num(n)} mois`],
    ["budgetCom", working ? "Communication annuelle incluse aux charges" : "Budget communication annuel", ue.budgetCom, money],
    ["caVise", working ? "Revenu visé sur les douze mois proposés" : "CA annuel visé", ue.caVise, money],
    ["pointMort", working ? "Seuil mensuel du modèle" : "Point mort", ue.pointMort, num],
  ];
  return rows.map(([key, label, value, format]) => ({ key, label,
    value: typeof value === "number" && Number.isFinite(value) ? format(value)
      : typeof value === "string" && value.trim() ? value : c?.outcomes[key] ?? "—" }));
}
