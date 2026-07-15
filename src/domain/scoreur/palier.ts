/**
 * ADR-0147 — modulateurs (cohérence R, tenue) + palier = min(bande, items).
 *
 * Les items sont les must-have Michelin, calibrés sur les ancres de ligue (jamais
 * waivable). `palier = min(bande(force,tenue), items(gates))`. Canon PROPOSÉ —
 * ratification opérateur. Zéro-LLM.
 */

import {
  BRAND_TIERS,
  classifyTier,
  compareTiers,
  tierIndex,
  type BrandTier,
} from "../brand-tier";
import { ARENA_FORCE_MAX } from "./anchors";
import type { ArenaEstimate, LeagueKey, ScoreVerdict, ScoreurArena } from "./types";
import { SCOREUR_ARENAS } from "./types";

/** Un item = un must-have de palier, rattaché à une arène. */
export interface MustHaveItem {
  readonly id: string;
  readonly tier: Exclude<BrandTier, "LATENT">;
  readonly label: string;
  readonly arena: ScoreurArena | "R" | "TENURE";
}

/**
 * Registre canon des items par palier (portes Michelin). PROPOSÉ — à ratifier.
 * Ordre = escalade : un palier n'est atteint par items que si TOUS les items des
 * paliers inférieurs ET du sien sont franchis.
 */
export const MUST_HAVE_ITEMS: readonly MustHaveItem[] = [
  { id: "dirigeant-identifiable", tier: "FRAGILE", label: "Dirigeant identifiable", arena: "A" },
  { id: "mythe-fondateur", tier: "ORDINAIRE", label: "Mythe fondateur documenté & daté", arena: "A" },
  { id: "market-fit", tier: "ORDINAIRE", label: "Market-fit prouvé", arena: "V" },
  { id: "actif-distinctif", tier: "FORTE", label: "Actif distinctif possédé", arena: "D" },
  { id: "coherence-seuil", tier: "FORTE", label: "Cohérence ≥ seuil", arena: "R" },
  { id: "duel-cadre-overton", tier: "CULTE", label: "≥ 1 duel de cadre (Overton) gagné", arena: "T" },
  { id: "masse-superfan", tier: "CULTE", label: "Masse superfan ≥ plancher de ligue", arena: "E" },
  { id: "tenue", tier: "ICONE", label: "Tenue de la bande CULTE sur la durée canon", arena: "TENURE" },
  { id: "crise-survecue", tier: "ICONE", label: "≥ 1 crise survécue (pic négatif + rétention)", arena: "A" },
];

export const COHERENCE_THRESHOLD = 0.7; // seuil de l'item FORTE
/** Tenue canon exigée pour ICONE (mois au-dessus de la bande CULTE). */
export const ICONE_TENURE_MONTHS = 24;

/**
 * Cohérence R (dérivée, aucune collecte) : 1 − dispersion normalisée des forces
 * d'arène mesurées. Peu de dispersion (la marque gagne partout pareil) → R haut ;
 * forte dispersion (revendique premium, le perd en reconnaissance) → R bas.
 */
export function computeCoherence(arenas: readonly ArenaEstimate[]): number {
  const measured = arenas.filter((a) => a.epreuveCount > 0);
  if (measured.length < 2) return 1; // pas assez d'arènes pour disperser
  const forces = measured.map((a) => a.force);
  const mean = forces.reduce((a, b) => a + b, 0) / forces.length;
  const variance = forces.reduce((s, f) => s + (f - mean) ** 2, 0) / forces.length;
  const std = Math.sqrt(variance);
  // Normalise par la demi-échelle d'arène ; clamp [0.5, 1] (jamais annihilant).
  const dispersion = Math.min(1, std / (ARENA_FORCE_MAX / 2));
  return Math.max(0.5, 1 - dispersion);
}

/** Le plus haut palier atteint par les ITEMS (escalade stricte, jamais waivable). */
export function itemsTier(itemsMet: ReadonlySet<string>): BrandTier {
  let reached: BrandTier = "LATENT";
  for (const tier of BRAND_TIERS) {
    if (tier === "LATENT") continue;
    const required = MUST_HAVE_ITEMS.filter((i) => i.tier === tier);
    const allMet = required.every((i) => itemsMet.has(i.id));
    if (allMet) reached = tier;
    else break; // escalade stricte : un trou stoppe la montée
  }
  return reached;
}

export interface VerdictInput {
  readonly arenas: readonly ArenaEstimate[];
  readonly league: LeagueKey;
  readonly coherence: number;
  readonly itemsMet: ReadonlySet<string>;
}

/** Assemble le verdict : force pondérée par R, palier = min(bande, items), couverture. */
export function computeVerdict(input: VerdictInput): ScoreVerdict {
  const composite = input.arenas.reduce((s, a) => s + a.force, 0); // 0..200
  const force = Math.max(0, Math.min(200, composite * input.coherence));
  const bande = classifyTier(force, 200);
  const items = itemsTier(input.itemsMet);
  // palier = min(bande, items)
  const tier: BrandTier = compareTiers(bande, items) <= 0 ? bande : items;

  const measuredCount = input.arenas.filter((a) => a.epreuveCount > 0).length;
  const coveragePct = Math.round((measuredCount / SCOREUR_ARENAS.length) * 100);

  const gates = MUST_HAVE_ITEMS.map((i) => ({ label: i.label, ok: input.itemsMet.has(i.id) }));

  let cappedReason: string | null = null;
  if (tierIndex(items) < tierIndex(bande)) {
    const missing = MUST_HAVE_ITEMS.filter(
      (i) => tierIndex(i.tier) <= tierIndex(bande) && !input.itemsMet.has(i.id),
    ).map((i) => i.label);
    cappedReason = `plafonné à ${items} — items non franchis : ${missing.join(", ")}`;
  }

  return {
    force: Math.round(force * 10) / 10,
    tier,
    coherence: Math.round(input.coherence * 100) / 100,
    coveragePct,
    arenas: [...input.arenas],
    gates,
    cappedReason,
    league: input.league,
  };
}
