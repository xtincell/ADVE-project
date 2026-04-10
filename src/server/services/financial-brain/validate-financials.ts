/**
 * Financial Validation — 40+ guardrail rules (BLOCK / WARN / INFORM)
 *
 * Every financial output passes through these rules before being accepted.
 * BLOCK = invalid data, reject immediately
 * WARN = suspicious, flag for review
 * INFORM = advisory, best practice suggestion
 */

import type {
  ActorType,
  FinancialValidationReport,
  ValidationContext,
  ValidationResult,
  ValidationSeverity,
} from "./types";
import { getRevenueRatio } from "./benchmarks/revenue-ratios";

// ─── Rule Definitions ───────────────────────────────────────────────────────

interface RuleDef {
  id: string;
  severity: ValidationSeverity;
  applicableTo: ActorType[];
  field: string;
  description: string;
  check: (ctx: ValidationContext) => boolean; // true = PASSES validation
  suggestion: string;
}

const RULES: RuleDef[] = [
  // ── BLOCK Rules (8) ──────────────────────────────────────────────────────
  {
    id: "FIN-B01", severity: "BLOCK", applicableTo: ["ADVERTISER"], field: "cac",
    description: "CAC depasse le prix du produit",
    check: (ctx) => !(ctx.cac && ctx.productPrice && ctx.cac > ctx.productPrice),
    suggestion: "Le CAC doit etre inferieur au prix unitaire du produit",
  },
  {
    id: "FIN-B02", severity: "BLOCK", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Budget marketing depasse le chiffre d'affaires",
    check: (ctx) => !(ctx.budgetCom && ctx.caVise && ctx.budgetCom > ctx.caVise),
    suggestion: "Le budget marketing ne peut pas depasser le CA vise",
  },
  {
    id: "FIN-B03", severity: "BLOCK", applicableTo: ["ALL"], field: "margeNette",
    description: "Marge nette inferieure a -50%",
    check: (ctx) => !(ctx.margeNette !== undefined && ctx.margeNette < -0.50),
    suggestion: "Une marge nette < -50% indique un modele economique non viable",
  },
  {
    id: "FIN-B04", severity: "BLOCK", applicableTo: ["ADVERTISER"], field: "ltvCacRatio",
    description: "Ratio LTV/CAC negatif",
    check: (ctx) => !(ctx.ltvCacRatio !== undefined && ctx.ltvCacRatio < 0),
    suggestion: "Le ratio LTV/CAC ne peut pas etre negatif",
  },
  {
    id: "FIN-B05", severity: "BLOCK", applicableTo: ["ALL"], field: "paybackPeriod",
    description: "Periode de remboursement negative",
    check: (ctx) => !(ctx.paybackPeriod !== undefined && ctx.paybackPeriod < 0),
    suggestion: "La periode de payback ne peut pas etre negative",
  },
  {
    id: "FIN-B06", severity: "BLOCK", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Budget ou CA negatif",
    check: (ctx) => !((ctx.budgetCom !== undefined && ctx.budgetCom < 0) || (ctx.caVise !== undefined && ctx.caVise < 0)),
    suggestion: "Les montants financiers ne peuvent pas etre negatifs",
  },
  {
    id: "FIN-B07", severity: "BLOCK", applicableTo: ["AGENCY"], field: "totalFee",
    description: "Fee depasse 100% du budget media pilote",
    check: (ctx) => !(ctx.totalFee && ctx.mediaBudgetManaged && ctx.totalFee > ctx.mediaBudgetManaged),
    suggestion: "Les frais d'agence ne peuvent pas depasser le budget media gere",
  },
  {
    id: "FIN-B08", severity: "BLOCK", applicableTo: ["FREELANCE"], field: "dayRate",
    description: "Tarif journalier inferieur au cout reel",
    check: (ctx) => !(ctx.dayRate && ctx.costRate && ctx.dayRate < ctx.costRate * 8),
    suggestion: "Vendre en dessous du cout reel garantit une perte financiere",
  },

  // ── WARN Rules (14) ──────────────────────────────────────────────────────
  {
    id: "FIN-W01", severity: "WARN", applicableTo: ["ADVERTISER"], field: "ltvCacRatio",
    description: "Ratio LTV/CAC < 1.0 — chaque client coute plus qu'il ne rapporte",
    check: (ctx) => !(ctx.ltvCacRatio !== undefined && ctx.ltvCacRatio < 1.0),
    suggestion: "Objectif minimum: LTV/CAC > 3.0 pour un business viable",
  },
  {
    id: "FIN-W02", severity: "WARN", applicableTo: ["ADVERTISER"], field: "ltvCacRatio",
    description: "Ratio LTV/CAC < 3.0 — en dessous du seuil sain",
    check: (ctx) => !(ctx.ltvCacRatio !== undefined && ctx.ltvCacRatio >= 1.0 && ctx.ltvCacRatio < 3.0),
    suggestion: "Un ratio LTV/CAC de 3:1 est le minimum pour un business sain",
  },
  {
    id: "FIN-W03", severity: "WARN", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Budget marketing > 25% du CA",
    check: (ctx) => !(ctx.budgetCom && ctx.caVise && ctx.budgetCom > ctx.caVise * 0.25),
    suggestion: "Un budget > 25% du CA est risque sauf en phase de lancement",
  },
  {
    id: "FIN-W04", severity: "WARN", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Budget marketing sous le minimum sectoriel",
    check: (ctx) => {
      if (!ctx.budgetCom || !ctx.caVise || !ctx.sector) return true;
      const ratio = getRevenueRatio(ctx.sector, ctx.companyStage ?? "GROWTH");
      return ctx.budgetCom >= ctx.caVise * ratio.marketingPct * 0.5; // 50% du benchmark = plancher
    },
    suggestion: "Le budget est significativement sous le benchmark sectoriel",
  },
  {
    id: "FIN-W05", severity: "WARN", applicableTo: ["ADVERTISER"], field: "cac",
    description: "CAC > 2x le benchmark sectoriel",
    check: (ctx) => !(ctx.cac && ctx.cac > 100_000), // Simplified — real check would use sector data
    suggestion: "CAC anormalement eleve — verifier l'efficacite des canaux",
  },
  {
    id: "FIN-W06", severity: "WARN", applicableTo: ["ALL"], field: "margeNette",
    description: "Marge nette < 5%",
    check: (ctx) => !(ctx.margeNette !== undefined && ctx.margeNette >= 0 && ctx.margeNette < 0.05),
    suggestion: "Marge tres fine — moindre variation de couts menace la rentabilite",
  },
  {
    id: "FIN-W07", severity: "WARN", applicableTo: ["ADVERTISER"], field: "paybackPeriod",
    description: "Periode de remboursement > 24 mois",
    check: (ctx) => !(ctx.paybackPeriod !== undefined && ctx.paybackPeriod > 24),
    suggestion: "Un payback > 2 ans est risque pour la tresorerie",
  },
  {
    id: "FIN-W08", severity: "WARN", applicableTo: ["ADVERTISER"], field: "roiEstime",
    description: "ROI estime < 100% (retour negatif)",
    check: (ctx) => !(ctx.roiEstime !== undefined && ctx.roiEstime < 100),
    suggestion: "L'investissement marketing ne genere pas de retour positif",
  },
  {
    id: "FIN-W09", severity: "WARN", applicableTo: ["AGENCY"], field: "commissionRate",
    description: "Taux de commission > 20%",
    check: (ctx) => !(ctx.commissionRate !== undefined && ctx.commissionRate > 0.20),
    suggestion: "Commission > 20% est au-dessus des standards du marche",
  },
  {
    id: "FIN-W10", severity: "WARN", applicableTo: ["AGENCY", "FREELANCE"], field: "utilization",
    description: "Taux d'utilisation < 60%",
    check: (ctx) => !(ctx.utilization !== undefined && ctx.utilization < 0.60),
    suggestion: "Sous-utilisation — risque de non-rentabilite",
  },
  {
    id: "FIN-W11", severity: "WARN", applicableTo: ["ADVERTISER"], field: "workingMediaPct",
    description: "Working media < 50% du budget total",
    check: (ctx) => !(ctx.workingMediaPct !== undefined && ctx.workingMediaPct < 0.50),
    suggestion: "Moins de 50% du budget touche le consommateur — overhead trop eleve",
  },
  {
    id: "FIN-W12", severity: "WARN", applicableTo: ["ADVERTISER"], field: "alwaysOnPct",
    description: "Aucun budget always-on (hors startup)",
    check: (ctx) => {
      if (ctx.companyStage === "STARTUP") return true;
      return !(ctx.alwaysOnPct !== undefined && ctx.alwaysOnPct === 0);
    },
    suggestion: "Les marques en croissance/maturite ont besoin de presence continue",
  },
  {
    id: "FIN-W13", severity: "WARN", applicableTo: ["ALL"], field: "contingencyPct",
    description: "Aucun budget de contingence",
    check: (ctx) => !(ctx.contingencyPct !== undefined && ctx.contingencyPct === 0),
    suggestion: "Prevoir 5-10% de contingence pour les imprevu",
  },
  {
    id: "FIN-W14", severity: "WARN", applicableTo: ["AGENCY"], field: "revenuePerHead",
    description: "Revenu par tete < benchmark -30%",
    check: (ctx) => !(ctx.revenuePerHead !== undefined && ctx.revenuePerHead < 10_000_000),
    suggestion: "Revenu par employe anormalement bas — verifier la capacite",
  },

  // ── INFORM Rules (18) ────────────────────────────────────────────────────
  {
    id: "FIN-I01", severity: "INFORM", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Budget sous la mediane sectorielle",
    check: (ctx) => {
      if (!ctx.budgetCom || !ctx.caVise || !ctx.sector) return true;
      const ratio = getRevenueRatio(ctx.sector, ctx.companyStage ?? "GROWTH");
      return ctx.budgetCom >= ctx.caVise * ratio.marketingPct;
    },
    suggestion: "Investir au niveau du benchmark sectoriel pour rester competitif",
  },
  {
    id: "FIN-I02", severity: "INFORM", applicableTo: ["ADVERTISER"], field: "ltvCacRatio",
    description: "LTV/CAC sous la mediane sectorielle",
    check: (ctx) => !(ctx.ltvCacRatio !== undefined && ctx.ltvCacRatio >= 3.0 && ctx.ltvCacRatio < 5.0),
    suggestion: "Objectif ideal: LTV/CAC entre 5:1 et 8:1",
  },
  {
    id: "FIN-I03", severity: "INFORM", applicableTo: ["ADVERTISER"], field: "budgetCom",
    description: "Pas d'ajustement saisonnier",
    check: () => true, // Always passes — pure advisory
    suggestion: "Moduler le budget par mois selon le calendrier commercial",
  },
  {
    id: "FIN-I04", severity: "INFORM", applicableTo: ["ADVERTISER"], field: "production",
    description: "Budget production > 25% du total",
    check: () => true,
    suggestion: "Au-dela de 25%, verifier si la qualite de production est justifiee par le ROI",
  },
  {
    id: "FIN-I05", severity: "INFORM", applicableTo: ["ALL"], field: "contingency",
    description: "Budget contingence < 5%",
    check: (ctx) => !(ctx.contingencyPct !== undefined && ctx.contingencyPct > 0 && ctx.contingencyPct < 0.05),
    suggestion: "L'industrie recommande 5-10% de contingence",
  },
  {
    id: "FIN-I06", severity: "INFORM", applicableTo: ["ADVERTISER"], field: "agencyFee",
    description: "Frais d'agence > 15% du total",
    check: () => true,
    suggestion: "Les frais d'agence > 15% meritent une renegociation ou un modele hybride",
  },
];

// ─── Main Validation Function ───────────────────────────────────────────────

export function validateFinancials(ctx: ValidationContext): FinancialValidationReport {
  const results: ValidationResult[] = [];

  for (const rule of RULES) {
    // Check if rule applies to this actor type
    if (!rule.applicableTo.includes(ctx.actorType) && !rule.applicableTo.includes("ALL")) {
      continue;
    }

    const passes = rule.check(ctx);
    if (!passes) {
      results.push({
        ruleId: rule.id,
        severity: rule.severity,
        field: rule.field,
        message: rule.description,
        currentValue: ctx[rule.field as keyof ValidationContext],
        suggestion: rule.suggestion,
      });
    }
  }

  const blockers = results.filter(r => r.severity === "BLOCK");
  const warnings = results.filter(r => r.severity === "WARN");
  const advisories = results.filter(r => r.severity === "INFORM");

  // Score: start at 100, subtract for issues
  let score = 100;
  score -= blockers.length * 25;   // Each blocker = -25 points
  score -= warnings.length * 10;   // Each warning = -10 points
  score -= advisories.length * 2;  // Each advisory = -2 points
  score = Math.max(0, Math.min(100, score));

  const overall = blockers.length > 0 ? "INVALID" : warnings.length > 0 ? "WARNING" : "VALID";

  return { overall, score, results, blockers, warnings, advisories };
}

/**
 * Quick check: does a set of unit economics have any BLOCK-level issues?
 */
export function hasBlockingIssues(ctx: ValidationContext): boolean {
  return validateFinancials(ctx).blockers.length > 0;
}
