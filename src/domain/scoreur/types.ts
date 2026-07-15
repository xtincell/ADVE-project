/**
 * ADR-0147 — Scoreur à force révélée : types canon (Layer 0, pur).
 *
 * Une seule primitive : l'épreuve dyadique. Deux formes (duel vs rival réel / item
 * vs must-have canon), un estimateur (Bradley-Terry = Rasch). La force θ est le
 * nombre qui explique le mieux l'ensemble des résultats observés. Zéro LLM.
 */

import { z } from "zod";

/** Les 5 arènes externes + R dérivée. I/S = plateforme only, jamais dans la force. */
export const SCOREUR_ARENAS = ["A", "D", "V", "E", "T"] as const;
export type ScoreurArena = (typeof SCOREUR_ARENAS)[number];
export const ScoreurArenaSchema = z.enum(SCOREUR_ARENAS);

export const ARENA_LABELS: Record<ScoreurArena, string> = {
  A: "Confiance & origine",
  D: "Reconnaissance",
  V: "Portefeuille",
  E: "Fidélité",
  T: "Le réel qui tranche",
};

export const EPREUVE_RESULTS = ["WIN", "LOSS", "DRAW"] as const;
export type EpreuveResult = (typeof EPREUVE_RESULTS)[number];
export const EpreuveResultSchema = z.enum(EPREUVE_RESULTS);

/** Poids = fiabilité de la PREUVE (pas une opinion). fort > moyen > item. */
export const PROOF_WEIGHTS = { fort: 1.0, moyen: 0.5, item: 0.4 } as const;
export type ProofClass = keyof typeof PROOF_WEIGHTS;

/** Une épreuve compilée, prête pour l'estimateur (référence par id de nœud). */
export interface CompiledEpreuve {
  readonly subjectRef: string; // node id du sujet (marque)
  readonly opponentRef: string; // node id du rival / ancre / item
  readonly arena: ScoreurArena;
  readonly result: EpreuveResult;
  readonly proofWeight: number; // 0..1
  readonly source: string;
  readonly occurredAt: string; // ISO
}

/** Sortie de l'estimateur pour une arène. */
export interface ArenaEstimate {
  readonly arena: ScoreurArena;
  readonly theta: number; // échelle Elo (ancres jaugent)
  readonly rd: number; // ± incertitude (peu d'épreuves → large)
  readonly force: number; // 0..25 (θ mappé sur la jauge de ligue)
  readonly epreuveCount: number;
  readonly wins: number;
  readonly losses: number;
}

/** Le verdict complet = le palmarès (chaque chiffre trace à ses épreuves). */
export interface ScoreVerdict {
  readonly force: number; // 0..200
  readonly tier: string; // BRAND_TIERS
  readonly coherence: number; // R, 0..1
  readonly coveragePct: number; // % d'arènes canon avec ≥1 épreuve
  readonly arenas: ArenaEstimate[];
  readonly gates: { label: string; ok: boolean }[];
  readonly cappedReason: string | null; // items CULTE/ICONE non franchis
  readonly league: LeagueKey;
}

export interface LeagueKey {
  readonly sectorSlug: string;
  readonly marketScale: string | null; // MarketScale
  readonly countryCode: string | null;
}

export function leagueKeyString(l: LeagueKey): string {
  return `${l.sectorSlug}|${l.marketScale ?? "*"}|${l.countryCode ?? "*"}`;
}
