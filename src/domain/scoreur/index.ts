/**
 * ADR-0149 — Scoreur à force révélée : orchestrateur PUR (Layer 0, déterministe).
 *
 * Entrée = les épreuves compilées + la jauge d'ancres + les items franchis.
 * Sortie = le verdict (palmarès). Aucune IO, aucun LLM, ordre-indépendant : deux
 * runs sur le même registre = le même score (acceptance C3).
 */

import type { MarketScale } from "../market-scale";
import { fitBradleyTerry, toPairwise } from "./bradley-terry";
import { defaultThetaForScale, thetaToForce, GAUGE_BY_SCALE, type GaugeMap } from "./anchors";
import { computeCoherence, computeVerdict, MUST_HAVE_ITEMS, type MustHaveItem } from "./palier";
import {
  SCOREUR_ARENAS,
  type ArenaEstimate,
  type CompiledEpreuve,
  type LeagueKey,
  type ScoreVerdict,
  type ScoreurArena,
} from "./types";

export * from "./types";
export * from "./anchors";
export * from "./palier";
export * from "./bradley-terry";
export * from "./revealed-gates";


export interface ScoreInput {
  readonly subjectRef: string;
  readonly league: LeagueKey;
  readonly epreuves: readonly CompiledEpreuve[];
  /** θ fixés des ancres + items (la jauge). */
  readonly anchors: Readonly<Record<string, number>>;
  readonly itemsMet: ReadonlySet<string>;
  /** Canon éditable a posteriori (ADR-0150) — défaut = constantes code. */
  readonly canon?: { gauge?: GaugeMap; items?: readonly MustHaveItem[] };
}

/** Estime une arène : θ ± RD du sujet, mappé en force via la jauge de ligue. */
function estimateArena(
  arena: ScoreurArena,
  subjectRef: string,
  epreuves: readonly CompiledEpreuve[],
  anchors: Readonly<Record<string, number>>,
  scale: MarketScale | null | undefined,
  gauge: GaugeMap,
): ArenaEstimate {
  const arenaEpreuves = epreuves.filter((e) => e.arena === arena);
  const wins = arenaEpreuves.filter((e) => e.result === "WIN").length;
  const losses = arenaEpreuves.filter((e) => e.result === "LOSS").length;

  if (arenaEpreuves.length === 0) {
    // Absence honnête : force 0, RD max, aucune fabrication.
    return {
      arena,
      theta: defaultThetaForScale(scale, gauge),
      rd: 350,
      force: 0,
      epreuveCount: 0,
      wins: 0,
      losses: 0,
    };
  }

  const nodeSet = new Set<string>([subjectRef]);
  for (const e of arenaEpreuves) {
    nodeSet.add(e.subjectRef);
    nodeSet.add(e.opponentRef);
  }
  // N'inclut que les ancres réellement affrontées (les autres ne contraignent pas).
  const relevantAnchors: Record<string, number> = {};
  for (const n of nodeSet) {
    const a = anchors[n];
    if (a !== undefined) relevantAnchors[n] = a;
  }

  const { theta, rd } = fitBradleyTerry(
    { nodes: [...nodeSet], anchors: relevantAnchors, pairwise: toPairwise(arenaEpreuves) },
    { defaultTheta: defaultThetaForScale(scale, gauge) },
  );

  const subjTheta = theta[subjectRef] ?? defaultThetaForScale(scale, gauge);
  return {
    arena,
    theta: Math.round(subjTheta),
    rd: Math.round(rd[subjectRef] ?? 350),
    force: Math.round(thetaToForce(subjTheta, scale, gauge) * 10) / 10,
    epreuveCount: arenaEpreuves.length,
    wins,
    losses,
  };
}

/** Le calcul complet : épreuves → θ par arène → cohérence → palier → verdict. */
export function scoreFromEpreuves(input: ScoreInput): ScoreVerdict {
  const scale = (input.league.marketScale ?? null) as MarketScale | null;
  const gauge = input.canon?.gauge ?? GAUGE_BY_SCALE;
  const items = input.canon?.items ?? MUST_HAVE_ITEMS;
  const arenas: ArenaEstimate[] = SCOREUR_ARENAS.map((arena) =>
    estimateArena(arena, input.subjectRef, input.epreuves, input.anchors, scale, gauge),
  );
  const coherence = computeCoherence(arenas);
  return computeVerdict({ arenas, league: input.league, coherence, itemsMet: input.itemsMet, items });
}
