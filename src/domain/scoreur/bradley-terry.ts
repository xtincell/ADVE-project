/**
 * ADR-0149 — estimateur Bradley-Terry / Rasch (pur TS, déterministe, zéro-LLM).
 *
 * `P(i bat j) = 1 / (1 + 10^((θj − θi)/400))` — même loi qu'Elo. θ̂ maximise la
 * log-vraisemblance pondérée des résultats observés (MLE batch, convexe,
 * indépendant de l'ordre). Les ancres-étalons ont un θ FIXÉ (la jauge) et ne sont
 * pas estimées. RD (incertitude) = 1/√(information de Fisher) : peu d'épreuves ⇒
 * intervalle large, honnête.
 *
 * Discipline de pureté (précédent `campaign-tracker/superfan-attribution`) :
 * init déterministe à 0, JAMAIS de Math.random, ordre-indépendant (le résultat ne
 * dépend que de l'ensemble des épreuves). Aucune dépendance npm.
 */

/** Échelle Elo — écart de 400 pts = 10:1 de cote. */
export const ELO_SCALE = 400;
const LN10_OVER_SCALE = Math.log(10) / ELO_SCALE;

export interface Pairwise {
  /** gagnant et perdant (un DRAW est décomposé en deux demi-observations). */
  readonly winner: string;
  readonly loser: string;
  readonly weight: number;
}

export interface BradleyTerryInput {
  /** Tous les nœuds (marques + ancres + items). */
  readonly nodes: readonly string[];
  /** θ fixés des ancres/items (la jauge). Les nœuds absents sont estimés. */
  readonly anchors: Readonly<Record<string, number>>;
  readonly pairwise: readonly Pairwise[];
}

export interface BradleyTerryOutput {
  readonly theta: Readonly<Record<string, number>>;
  readonly rd: Readonly<Record<string, number>>;
}

/** Probabilité que i batte j sous l'écart de θ (échelle Elo). */
export function winProbability(thetaI: number, thetaJ: number): number {
  return 1 / (1 + Math.pow(10, (thetaJ - thetaI) / ELO_SCALE));
}

export interface FitOpts {
  readonly iterations?: number;
  readonly learningRate?: number;
  /** θ de départ des nœuds libres (défaut = moyenne des ancres, sinon 1500). */
  readonly defaultTheta?: number;
  readonly ridge?: number; // régularisation L2 vers le défaut (stabilise le sous-déterminé)
  readonly rdBase?: number;
  readonly rdFloor?: number;
}

/**
 * MLE batch par montée de gradient. Déterministe : même entrée = même sortie.
 * Les ancres restent à leur θ fixé ; les nœuds libres convergent.
 */
export function fitBradleyTerry(input: BradleyTerryInput, opts: FitOpts = {}): BradleyTerryOutput {
  const iterations = opts.iterations ?? 800;
  const lr = opts.learningRate ?? 8; // en points Elo
  const ridge = opts.ridge ?? 0.002;
  const rdBase = opts.rdBase ?? 350;
  const rdFloor = opts.rdFloor ?? 30;

  const anchorVals = Object.values(input.anchors);
  const anchorMean = anchorVals.length
    ? anchorVals.reduce((a, b) => a + b, 0) / anchorVals.length
    : 1500;
  const defaultTheta = opts.defaultTheta ?? anchorMean;

  // Init déterministe : ancres à leur valeur, libres au défaut.
  const theta = new Map<string, number>();
  const free = new Set<string>();
  for (const n of input.nodes) {
    const anchor = input.anchors[n];
    if (anchor !== undefined) {
      theta.set(n, anchor);
    } else {
      theta.set(n, defaultTheta);
      free.add(n);
    }
  }

  // Montée de gradient sur la log-vraisemblance pondérée.
  for (let iter = 0; iter < iterations; iter++) {
    const grad = new Map<string, number>();
    for (const g of input.pairwise) {
      const ti = theta.get(g.winner);
      const tj = theta.get(g.loser);
      if (ti === undefined || tj === undefined) continue;
      const p = winProbability(ti, tj); // proba que le gagnant gagne
      const resid = g.weight * (1 - p) * LN10_OVER_SCALE;
      grad.set(g.winner, (grad.get(g.winner) ?? 0) + resid);
      grad.set(g.loser, (grad.get(g.loser) ?? 0) - resid);
    }
    for (const n of free) {
      const cur = theta.get(n)!;
      // Ridge vers le défaut : garde les nœuds quasi-non-joués près du centre.
      const g = (grad.get(n) ?? 0) - ridge * (cur - defaultTheta) * LN10_OVER_SCALE;
      theta.set(n, cur + lr * g);
    }
  }

  // RD via l'information de Fisher : I_i = Σ w·p·(1−p)·k²  (k = ln10/scale).
  const info = new Map<string, number>();
  const k2 = LN10_OVER_SCALE * LN10_OVER_SCALE;
  for (const g of input.pairwise) {
    const ti = theta.get(g.winner);
    const tj = theta.get(g.loser);
    if (ti === undefined || tj === undefined) continue;
    const p = winProbability(ti, tj);
    const fisher = g.weight * p * (1 - p) * k2;
    info.set(g.winner, (info.get(g.winner) ?? 0) + fisher);
    info.set(g.loser, (info.get(g.loser) ?? 0) + fisher);
  }

  const thetaOut: Record<string, number> = {};
  const rd: Record<string, number> = {};
  for (const n of input.nodes) {
    thetaOut[n] = theta.get(n)!;
    if (!free.has(n)) {
      rd[n] = 0; // ancre : jauge, pas d'incertitude
      continue;
    }
    const i = info.get(n) ?? 0;
    // Peu d'info → RD proche de rdBase ; beaucoup d'info → RD → rdFloor.
    const se = i > 0 ? 1 / Math.sqrt(i) : rdBase;
    rd[n] = Math.max(rdFloor, Math.min(rdBase, se));
  }

  return { theta: thetaOut, rd };
}

/** Décompose des résultats (WIN/LOSS/DRAW) en observations pairwise pondérées. */
export function toPairwise(
  epreuves: readonly { subjectRef: string; opponentRef: string; result: "WIN" | "LOSS" | "DRAW"; proofWeight: number }[],
): Pairwise[] {
  const out: Pairwise[] = [];
  for (const e of epreuves) {
    if (e.result === "WIN") {
      out.push({ winner: e.subjectRef, loser: e.opponentRef, weight: e.proofWeight });
    } else if (e.result === "LOSS") {
      out.push({ winner: e.opponentRef, loser: e.subjectRef, weight: e.proofWeight });
    } else {
      // DRAW = deux demi-observations symétriques.
      out.push({ winner: e.subjectRef, loser: e.opponentRef, weight: e.proofWeight / 2 });
      out.push({ winner: e.opponentRef, loser: e.subjectRef, weight: e.proofWeight / 2 });
    }
  }
  return out;
}
