/**
 * Prise d'une mission par un vendeur : la règle commune à `claimRun`, qui prend,
 * et au signal de réveil de la flotte, qui dit seulement qu'une prise aboutirait.
 * Une seule définition, pour que le signal ne réveille jamais un vendeur que la
 * prise refuserait. Les compteurs du jour ne valent que pour le jour UTC où ils
 * ont été posés.
 */

/** Une mission dans l'un de ces statuts interdit d'en prendre une autre. */
export const SALES_RUN_BLOCKING_STATUSES = ["RUNNING", "AMBIGUOUS"] as const;

export interface SalesDailyAllowance {
  budgetDay: string | null;
  dailyTokensReserved: number;
  dailyRunsClaimed: number;
  dailyTokenBudget: number;
  dailyRunLimit: number;
  maxTokens: number;
}

export function salesBudgetDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Jetons réservés et missions prises aujourd'hui ; zéro si les compteurs datent d'un autre jour. */
export function salesDailyUsage(profile: SalesDailyAllowance, today: string): { tokens: number; runs: number } {
  return profile.budgetDay === today
    ? { tokens: profile.dailyTokensReserved, runs: profile.dailyRunsClaimed }
    : { tokens: 0, runs: 0 };
}

/** Une mission de plus tient dans le budget de jetons et la limite de missions du jour. */
export function salesRunAllowedToday(profile: SalesDailyAllowance, today: string): boolean {
  const { tokens, runs } = salesDailyUsage(profile, today);
  return tokens + profile.maxTokens <= profile.dailyTokenBudget && runs < profile.dailyRunLimit;
}
