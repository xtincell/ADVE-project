/**
 * ADR-0149 — ancres-étalons + jauge de ligue (canon, θ fixé — la seule main
 * humaine du système, brief §D3). Les ancres jaugent l'échelle : tout le reste est
 * estimé par le registre d'épreuves. Valeurs PROPOSÉES — ratification opérateur.
 */

import type { MarketScale } from "../market-scale";
import { SCOREUR_ARENAS, type ScoreurArena } from "./types";

/**
 * Registre d'étalons (θ sur l'échelle Elo). Icônes mondiales + équivalents
 * panafricains / nationaux / de quartier. `scale` = l'échelle où l'ancre est ICONE.
 * PROPOSÉ — à ratifier par l'opérateur au gate de déploiement.
 */
export interface AnchorDef {
  readonly id: string;
  readonly label: string;
  readonly theta: number;
  readonly scale: MarketScale;
  readonly note?: string;
}

export const ANCHOR_REGISTRY: readonly AnchorDef[] = [
  // ── Icônes mondiales (θ apex) ──────────────────────────────────────────────
  { id: "apple", label: "Apple", theta: 2200, scale: "MONDE", note: "produit-culte, premium soutenu mondial" },
  { id: "eglise-catholique", label: "Église catholique", theta: 2200, scale: "MONDE", note: "tenue bimillénaire" },
  { id: "coca-cola", label: "Coca-Cola", theta: 2150, scale: "MONDE" },
  { id: "france", label: "France", theta: 2100, scale: "MONDE", note: "marque-nation" },
  { id: "michael-jackson", label: "Michael Jackson", theta: 2100, scale: "MONDE" },
  { id: "musk", label: "Elon Musk", theta: 2050, scale: "MONDE", note: "personal brand" },
  // ── Icônes panafricaines / continentales ───────────────────────────────────
  { id: "dangote", label: "Dangote", theta: 1980, scale: "CONTINENT" },
  { id: "mtn", label: "MTN", theta: 1950, scale: "CONTINENT" },
  { id: "burna-boy", label: "Burna Boy", theta: 1950, scale: "CONTINENT", note: "afrobeats" },
  { id: "nollywood", label: "Nollywood", theta: 1900, scale: "CONTINENT" },
  // ── Repères nationaux (Afrique francophone) ────────────────────────────────
  { id: "orange-ci", label: "Orange (CI)", theta: 1720, scale: "NATION" },
  { id: "nsia", label: "NSIA", theta: 1650, scale: "NATION" },
  // ── Repères d'échelle inférieure (génériques, plancher de ligue) ───────────
  { id: "champion-region", label: "Champion régional type", theta: 1500, scale: "REGION" },
  { id: "champion-ville", label: "Champion de ville type", theta: 1380, scale: "VILLE" },
  { id: "champion-quartier", label: "Champion de quartier type", theta: 1280, scale: "QUARTIER" },
];

/**
 * Jauge par échelle de marché : θ_floor (force 0) → θ_icone (force max). Encode
 * « le champion de quartier et le champion du monde se lisent sur la même règle,
 * chacun à sa place » : l'ICONE mondiale (2200) est plus haute que l'ICONE de
 * quartier (1500). PROPOSÉ — ratification opérateur.
 */
export const GAUGE_BY_SCALE: Record<MarketScale, { floor: number; icone: number }> = {
  QUARTIER: { floor: 1000, icone: 1500 },
  VILLE: { floor: 1050, icone: 1600 },
  REGION: { floor: 1100, icone: 1750 },
  NATION: { floor: 1200, icone: 1950 },
  CONTINENT: { floor: 1300, icone: 2100 },
  MONDE: { floor: 1400, icone: 2200 },
};

/** Défaut quand l'échelle n'est pas déclarée (ADR-0126 : NATION = historique). */
export const DEFAULT_GAUGE = GAUGE_BY_SCALE.NATION;

/** Force max par arène (5 arènes × 40 = 200, aligné sur l'échelle de palier /200). */
export const ARENA_FORCE_MAX = 40;

/** Jauge éditable a posteriori (ADR-0150) : override partiel par-dessus le canon code. */
export type GaugeMap = Record<MarketScale, { floor: number; icone: number }>;

export function gaugeForScale(
  scale: MarketScale | null | undefined,
  gauge: GaugeMap = GAUGE_BY_SCALE,
): { floor: number; icone: number } {
  return scale ? gauge[scale] : gauge.NATION ?? DEFAULT_GAUGE;
}

/** Mappe un θ (Elo) sur la force d'arène 0..ARENA_FORCE_MAX, via la jauge de ligue. */
export function thetaToForce(
  theta: number,
  scale: MarketScale | null | undefined,
  gauge: GaugeMap = GAUGE_BY_SCALE,
): number {
  const g = gaugeForScale(scale, gauge);
  const span = g.icone - g.floor;
  if (span <= 0) return 0;
  const f = ((theta - g.floor) / span) * ARENA_FORCE_MAX;
  return Math.max(0, Math.min(ARENA_FORCE_MAX, f));
}

/** θ de départ des nœuds libres = médiane de la jauge de ligue. */
export function defaultThetaForScale(
  scale: MarketScale | null | undefined,
  gauge: GaugeMap = GAUGE_BY_SCALE,
): number {
  const g = gaugeForScale(scale, gauge);
  return (g.floor + g.icone) / 2;
}

export const ALL_ARENAS: readonly ScoreurArena[] = SCOREUR_ARENAS;
