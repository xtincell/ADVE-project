/**
 * Diagnostic gratuit du funnel — 100 % déterministe.
 *
 * Prend les réponses d'intake sur le socle ADVE (champs de `PILLAR_FIELDS`)
 * et produit : un score /100 (4 piliers × 25), un palier projeté sur
 * l'échelle /200, des forces et faiblesses factuelles, et 3 prochaines
 * actions. Aucune inférence, aucun LLM : chaque force cite un champ rempli,
 * chaque faiblesse cite un champ vide — rien d'autre.
 *
 * Règle de priorité des actions : la cascade d'abord (A avant D avant V
 * avant E — on ne se différencie pas sans identité), puis les décisions
 * humaines (needsHuman) avant le reste au sein d'un pilier.
 */
import { ADVE_PILLARS, type AdvePillarKey, type BrandLevel } from "./pillars";
import {
  PILLAR_FIELDS,
  PILLAR_LABELS,
  type FieldDef,
} from "./pillar-fields";
import {
  classifyLevel,
  LEVEL_DEFINITIONS,
  PILLAR_MAX_SCORE,
  scorePillarContent,
  type PillarContentScore,
} from "./scoring";

/** Score maximal du diagnostic gratuit = socle ADVE seul (4 × 25 = 100). */
export const DIAGNOSTIC_MAX_SCORE = PILLAR_MAX_SCORE * ADVE_PILLARS.length;

export interface DiagnosticIntake {
  /** Réponses du funnel, indexées par pilier ADVE puis par id de champ. */
  answers: Partial<Record<AdvePillarKey, Record<string, unknown> | null>>;
}

export interface Diagnostic {
  /** Score du socle ADVE, /100. */
  score: number;
  /** Palier projeté (le socle /100 est normalisé sur l'échelle /200). */
  level: BrandLevel;
  /** Tagline FR du palier (pour l'affichage funnel). */
  levelLabel: string;
  /** Constats positifs — uniquement des faits (champs réellement remplis). */
  forces: string[];
  /** Constats négatifs — uniquement des champs réellement vides. */
  faiblesses: string[];
  /** Les 3 prochaines actions, dans l'ordre de la cascade. */
  next3Actions: string[];
  /** Détail par pilier ADVE (réutilisable par l'UI du funnel). */
  byPillar: Record<AdvePillarKey, PillarContentScore>;
}

interface MissingField {
  pillar: AdvePillarKey;
  field: FieldDef;
}

/** Verbe d'action FR selon la nature du champ. */
function actionVerb(field: FieldDef): string {
  if (field.needsHuman) return "Déclarer";
  return field.type === "liste" ? "Lister" : "Formuler";
}

function actionForField(pillar: AdvePillarKey, field: FieldDef): string {
  return `${actionVerb(field)} « ${field.label} » (pilier ${PILLAR_LABELS[pillar]}) — ${field.description}`;
}

/** Actions de suite quand le socle est (presque) complet. */
function nextStepActions(byPillar: Record<AdvePillarKey, PillarContentScore>): string[] {
  const weakest = [...ADVE_PILLARS].sort(
    (a, b) => byPillar[a].score - byPillar[b].score,
  )[0]!;
  return [
    "Dériver les piliers RTIS — diagnostic des risques et confrontation au marché.",
    "Composer l'Oracle — le document stratégique complet de la marque.",
    `Approfondir le pilier ${PILLAR_LABELS[weakest]} — c'est votre socle le plus faible (${byPillar[weakest].score}/100).`,
  ];
}

/**
 * Diagnostic déterministe du socle ADVE.
 * Même entrée → même sortie, toujours.
 */
export function diagnose(intake: DiagnosticIntake): Diagnostic {
  const byPillar = {} as Record<AdvePillarKey, PillarContentScore>;
  const missingOrdered: MissingField[] = [];
  let total = 0;

  for (const key of ADVE_PILLARS) {
    const fields = PILLAR_FIELDS[key];
    const result = scorePillarContent(intake.answers[key], fields);
    byPillar[key] = result;
    total += result.score25;

    // Champs manquants du pilier, décisions humaines en tête.
    const missingDefs = fields.filter((f) => result.missing.includes(f.id));
    missingOrdered.push(
      ...missingDefs
        .filter((f) => f.needsHuman)
        .map((field) => ({ pillar: key, field })),
      ...missingDefs
        .filter((f) => !f.needsHuman)
        .map((field) => ({ pillar: key, field })),
    );
  }

  const score = Math.round(total);
  const level = classifyLevel(total, DIAGNOSTIC_MAX_SCORE);

  // ── Forces : des faits, jamais des compliments gratuits ─────────────
  const forces: string[] = [];
  for (const key of ADVE_PILLARS) {
    const r = byPillar[key];
    if (r.score >= 60) {
      forces.push(
        `Pilier ${PILLAR_LABELS[key]} solide : ${r.filled.length}/${PILLAR_FIELDS[key].length} champs renseignés (${r.score}/100).`,
      );
    }
    // Décisions humaines posées = actifs structurants déclarés.
    for (const field of PILLAR_FIELDS[key]) {
      if (field.needsHuman && r.filled.includes(field.id)) {
        forces.push(`« ${field.label} » est déclaré — ${PILLAR_LABELS[key]} repose sur une décision posée, pas une supposition.`);
      }
    }
  }

  // ── Faiblesses : chaque item cite un champ réellement vide ──────────
  const MAX_FAIBLESSES = 8;
  const faiblesses = missingOrdered
    .slice(0, MAX_FAIBLESSES)
    .map(
      ({ pillar, field }) =>
        `« ${field.label} » (pilier ${PILLAR_LABELS[pillar]}) est vide — ${field.description}`,
    );
  const rest = missingOrdered.length - MAX_FAIBLESSES;
  if (rest > 0) {
    faiblesses.push(`… et ${rest} autre${rest > 1 ? "s" : ""} champ${rest > 1 ? "s" : ""} du socle ADVE à compléter.`);
  }

  // ── 3 prochaines actions : cascade d'abord, puis étapes suivantes ───
  const fieldActions = missingOrdered
    .slice(0, 3)
    .map(({ pillar, field }) => actionForField(pillar, field));
  const next3Actions = [...fieldActions, ...nextStepActions(byPillar)].slice(0, 3);

  return {
    score,
    level,
    levelLabel: LEVEL_DEFINITIONS[level].tagline,
    forces,
    faiblesses,
    next3Actions,
    byPillar,
  };
}
