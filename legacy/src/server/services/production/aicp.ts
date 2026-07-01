/**
 * aicp.ts — Devis AICP : triple PLANNED / ACTUAL / VARIANCE (ADR-0112).
 *
 * PUR, zéro LLM. La taxonomie A→X vit en base (`AicpSectionReference`, seedée) ;
 * ce module ne contient que les FORMULES estimate→actual→variance + rollups.
 */

export interface AicpLineLike {
  sectionCode: string;
  plannedAmount: number;
  actualAmount: number | null;
}

/** Variance d'une ligne : actual − planned. `null` si non réalisé. PUR. */
export function computeLineVariance(plannedAmount: number, actualAmount: number | null): number | null {
  if (actualAmount === null || !Number.isFinite(actualAmount) || !Number.isFinite(plannedAmount)) return null;
  return Math.round((actualAmount - plannedAmount) * 100) / 100;
}

/** Variance relative (%) : (actual − planned) / planned × 100. `null` si planned = 0. PUR. */
export function variancePct(plannedAmount: number, actualAmount: number | null): number | null {
  if (actualAmount === null || plannedAmount === 0 || !Number.isFinite(plannedAmount) || !Number.isFinite(actualAmount)) return null;
  return Math.round(((actualAmount - plannedAmount) / plannedAmount) * 10000) / 100;
}

export interface SectionRollup {
  sectionCode: string;
  planned: number;
  actual: number | null; // null si aucune ligne de la section n'est réalisée
  variance: number | null;
}

/** Agrège les lignes par section AICP. PUR. */
export function rollupBySection(lines: AicpLineLike[]): SectionRollup[] {
  const map = new Map<string, { planned: number; actual: number; anyActual: boolean }>();
  for (const l of lines) {
    const cur = map.get(l.sectionCode) ?? { planned: 0, actual: 0, anyActual: false };
    cur.planned += l.plannedAmount;
    if (l.actualAmount !== null && Number.isFinite(l.actualAmount)) {
      cur.actual += l.actualAmount;
      cur.anyActual = true;
    }
    map.set(l.sectionCode, cur);
  }
  return [...map.entries()].map(([sectionCode, v]) => ({
    sectionCode,
    planned: Math.round(v.planned * 100) / 100,
    actual: v.anyActual ? Math.round(v.actual * 100) / 100 : null,
    variance: v.anyActual ? Math.round((v.actual - v.planned) * 100) / 100 : null,
  }));
}

export interface AicpTotals {
  plannedTotal: number;
  actualTotal: number | null;
  varianceTotal: number | null;
  variancePct: number | null;
}

/** Totaux du devis (planned/actual/variance). PUR. */
export function rollupTotals(lines: AicpLineLike[]): AicpTotals {
  let planned = 0;
  let actual = 0;
  let anyActual = false;
  for (const l of lines) {
    planned += l.plannedAmount;
    if (l.actualAmount !== null && Number.isFinite(l.actualAmount)) {
      actual += l.actualAmount;
      anyActual = true;
    }
  }
  const plannedTotal = Math.round(planned * 100) / 100;
  if (!anyActual) return { plannedTotal, actualTotal: null, varianceTotal: null, variancePct: null };
  const actualTotal = Math.round(actual * 100) / 100;
  return {
    plannedTotal,
    actualTotal,
    varianceTotal: Math.round((actual - planned) * 100) / 100,
    variancePct: plannedTotal === 0 ? null : Math.round(((actual - planned) / planned) * 10000) / 100,
  };
}
