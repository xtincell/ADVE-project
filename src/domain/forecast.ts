/**
 * ADR-0156 — Moteur de forecast déterministe (pur, zéro IO, zéro LLM).
 *
 * Doctrine « l'algorithme de prédiction doit être on point » = trois garanties
 * structurelles, pas une promesse :
 *   1. REFUS de prédire sans donnée suffisante (INSUFFICIENT_DATA — jamais un
 *      chiffre fabriqué, ADR-0046) ;
 *   2. Chaque forecast embarque son ERREUR MESURÉE (backtest walk-forward sur
 *      la queue de la série : on prédit des points passés connus et on mesure
 *      l'écart — MAPE) ;
 *   3. Estimateur ROBUSTE (pente de Theil-Sen = médiane des pentes par paires,
 *      insensible aux outliers d'un relevé raté) + intervalle par écart-type
 *      des résidus.
 *
 * Déterministe : mêmes points d'entrée → même sortie (aucun Date.now interne).
 */

export interface SeriesPoint {
  /** Timestamp ms epoch. */
  t: number;
  v: number;
}

export interface ForecastPoint {
  t: number;
  v: number;
  lo: number;
  hi: number;
}

export interface ForecastResult {
  status: "OK" | "INSUFFICIENT_DATA";
  samples: number;
  spanDays: number;
  slopePerDay: number;
  lastValue: number | null;
  points: ForecastPoint[];
  /** MAPE (0-1) mesuré par backtest walk-forward — null si trop peu de points. */
  backtestMape: number | null;
}

const DAY_MS = 86_400_000;
export const MIN_SAMPLES = 5;
export const MIN_SPAN_DAYS = 14;

/** Dédoublonne par jour (dernière valeur du jour), trie par temps croissant. */
export function normalizeDaily(points: readonly SeriesPoint[]): SeriesPoint[] {
  const byDay = new Map<number, SeriesPoint>();
  for (const p of [...points].sort((a, b) => a.t - b.t)) {
    if (!Number.isFinite(p.v)) continue;
    byDay.set(Math.floor(p.t / DAY_MS), p);
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

/** Pente de Theil-Sen (médiane des pentes de toutes les paires) + intercept médian. */
function theilSen(points: readonly SeriesPoint[]): { slopePerDay: number; intercept: number } {
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dt = (points[j]!.t - points[i]!.t) / DAY_MS;
      if (dt !== 0) slopes.push((points[j]!.v - points[i]!.v) / dt);
    }
  }
  slopes.sort((a, b) => a - b);
  const slopePerDay = slopes.length === 0 ? 0 : slopes[Math.floor(slopes.length / 2)]!;
  const intercepts = points.map((p) => p.v - slopePerDay * (p.t / DAY_MS)).sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)]!;
  return { slopePerDay, intercept };
}

function predictAt(fit: { slopePerDay: number; intercept: number }, t: number): number {
  return fit.intercept + fit.slopePerDay * (t / DAY_MS);
}

/**
 * Forecast d'une série journalière à `horizonDays`, avec backtest intégré.
 * `stepDays` contrôle la granularité des points projetés (défaut 7).
 */
export function forecastSeries(
  raw: readonly SeriesPoint[],
  opts: { horizonDays: number; stepDays?: number },
): ForecastResult {
  const points = normalizeDaily(raw);
  const samples = points.length;
  const spanDays = samples >= 2 ? (points[samples - 1]!.t - points[0]!.t) / DAY_MS : 0;
  if (samples < MIN_SAMPLES || spanDays < MIN_SPAN_DAYS) {
    return {
      status: "INSUFFICIENT_DATA",
      samples,
      spanDays: Math.round(spanDays),
      slopePerDay: 0,
      lastValue: samples > 0 ? points[samples - 1]!.v : null,
      points: [],
      backtestMape: null,
    };
  }

  const fit = theilSen(points);
  // Écart-type des résidus → intervalle ±1.96 σ.
  const residuals = points.map((p) => p.v - predictAt(fit, p.t));
  const sd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length - 1));

  // ── Backtest walk-forward : on re-fit sans les k derniers points et on
  // mesure l'erreur de prédiction sur chacun (vérité terrain connue).
  const k = Math.min(5, samples - MIN_SAMPLES + 1);
  let mapeSum = 0;
  let mapeN = 0;
  for (let i = samples - k; i < samples; i++) {
    if (i < MIN_SAMPLES) continue;
    const train = points.slice(0, i);
    const f = theilSen(train);
    const actual = points[i]!.v;
    if (actual !== 0) {
      mapeSum += Math.abs((predictAt(f, points[i]!.t) - actual) / actual);
      mapeN++;
    }
  }
  const backtestMape = mapeN > 0 ? mapeSum / mapeN : null;

  const last = points[samples - 1]!;
  const stepDays = opts.stepDays ?? 7;
  const out: ForecastPoint[] = [];
  for (let d = stepDays; d <= opts.horizonDays; d += stepDays) {
    const t = last.t + d * DAY_MS;
    const v = predictAt(fit, t);
    const margin = 1.96 * sd * Math.sqrt(1 + 1 / samples);
    out.push({ t, v, lo: v - margin, hi: v + margin });
  }

  return {
    status: "OK",
    samples,
    spanDays: Math.round(spanDays),
    slopePerDay: fit.slopePerDay,
    lastValue: last.v,
    points: out,
    backtestMape,
  };
}

/** Direction prédite depuis la pente (seuil : ±0.1 % de la dernière valeur / jour). */
export function slopeDirection(slopePerDay: number, lastValue: number | null): "UP" | "DOWN" | "FLAT" {
  if (lastValue === null || lastValue === 0) return slopePerDay > 0 ? "UP" : slopePerDay < 0 ? "DOWN" : "FLAT";
  const rel = slopePerDay / Math.abs(lastValue);
  if (rel > 0.001) return "UP";
  if (rel < -0.001) return "DOWN";
  return "FLAT";
}

/**
 * Calibration bayésienne (shrinkage) : confiance affichée = mélange de la
 * confiance déclarée et du taux de réussite OBSERVÉ de la famille de
 * prédictions (pseudo-compte m=5). Sans historique résolu → confiance
 * déclarée inchangée. Déterministe.
 */
export function calibrateConfidence(
  stated: number,
  observed: { hits: number; resolved: number },
): number {
  const m = 5;
  if (observed.resolved === 0) return stated;
  const hitRate = observed.hits / observed.resolved;
  return (stated * m + hitRate * observed.resolved) / (m + observed.resolved);
}
