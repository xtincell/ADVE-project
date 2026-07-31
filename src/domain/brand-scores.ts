/**
 * src/domain/brand-scores.ts — Layer 0. Les TROIS mesures d'une marque, nommées
 * distinctement, et la seule lecture autorisée du vecteur ADVERTIS.
 *
 * ## Pourquoi ce module existe
 *
 * La Fusée porte trois nombres différents, tous légitimes, tous appelés « score »
 * dans le langage courant, et dont **deux portent littéralement le même nom de
 * champ** à un endroit ou à un autre :
 *
 * | Mesure | Où elle vit | Échelle | Ce qu'elle dit |
 * |---|---|---|---|
 * | **Complétude structurelle** | `Strategy.advertis_vector.composite` | /200 | ce que la marque a DÉCLARÉ (ADR-0102), plafonné par l'évidence (ADR-0126) |
 * | **Indice d'attachement** | `CultIndexSnapshot.compositeScore` | /100 | la ferveur mesurée de la communauté |
 * | **Force révélée** | `ScoreVerdict.force` | /200 | les victoires comptées en épreuves dyadiques (ADR-0149) |
 *
 * Le drift qui a motivé ce module : trois lecteurs (`mcp/advertis` ×2,
 * `campaign-canon`) lisaient `advertis_vector.compositeScore` — une clé qui
 * **n'existe pas** dans ce vecteur (le scorer écrit `composite`, cf.
 * `advertis-scorer/index.ts`). Résultat : `compositeScore: null` servi à tout
 * agent MCP et au tracker de campagne, sur des marques dont le cockpit affichait
 * pourtant « Score 164/200 ». Le nom de la mesure d'attachement avait contaminé
 * la lecture de la mesure de complétude.
 *
 * ## Règle
 *
 * **Les trois mesures ne se fusionnent JAMAIS** (décision D9, ADR-0149 §4 —
 * `scoring.ts` reste intact). Une surface qui en affiche plusieurs les nomme
 * séparément. Une mesure absente vaut `null` — « non mesuré » — **jamais 0** :
 * un zéro fabriqué est un mensonge sur l'état de la marque (P22-2).
 *
 * Pur : zéro import, zéro I/O, zéro LLM, variance 0.
 */

/** Plafond de la complétude structurelle ADVE (8 piliers × 25). */
export const ADVE_COMPOSITE_MAX = 200;

/** Plafond de l'indice d'attachement (cult index). */
export const CULT_INDEX_MAX = 100;

/** Plafond de la force révélée (5 arènes × 40). */
export const REVEALED_FORCE_MAX = 200;

/**
 * Clé canonique du composite dans `Strategy.advertis_vector`, telle qu'écrite
 * par `advertis-scorer`. Exportée pour que le test de gouvernance puisse
 * l'asserter au lieu de la ré-encoder.
 */
export const ADVE_VECTOR_COMPOSITE_KEY = "composite" as const;

/**
 * Lecture UNIQUE du composite structurel depuis un `advertis_vector` (JSON
 * Prisma, forme non garantie).
 *
 * Retourne `null` si le vecteur est absent, malformé, ou si le composite n'est
 * pas un nombre fini — jamais 0 par défaut. Tolère un vecteur legacy portant
 * `compositeScore` (des snapshots anciens en ont), mais `composite` prime.
 */
/**
 * Échelle d'un vecteur ADVE-RTIS (V7, 2026-07-31).
 *
 * Piège inscrit au registre : l'INTAKE persiste un composite 4 piliers × 25
 * (échelle /100) sous la MÊME clé `composite` que le canon 8 piliers (/200).
 * Une surface qui pointerait sur une ligne d'intake servirait donc un /100
 * avec l'étiquette « /200 » — la marque paraîtrait deux fois plus faible
 * qu'elle n'est. Aucune surface ne le fait aujourd'hui ; cette fonction rend
 * le piège INOFFENSIF avant qu'une le fasse.
 *
 * Le discriminant est structurel, pas heuristique : un vecteur d'intake ne
 * porte QUE les 4 clés ADVE non nulles (r/t/i/s valent 0 — les piliers RTIS
 * sont dérivés plus tard), là où un vecteur canon en a au moins une.
 */
export function compositeScaleOf(vector: unknown): 100 | 200 {
  if (!vector || typeof vector !== "object" || Array.isArray(vector)) return 200;
  const rec = vector as Record<string, number | undefined>;
  const rtisMeasured = (["r", "t", "i", "s"] as const).some(
    (k) => typeof rec[k] === "number" && (rec[k] as number) > 0,
  );
  return rtisMeasured ? 200 : 100;
}

export function readCompositeFromVector(vector: unknown): number | null {
  if (!vector || typeof vector !== "object" || Array.isArray(vector)) return null;
  const rec = vector as Record<string, unknown>;
  const canonical = rec[ADVE_VECTOR_COMPOSITE_KEY];
  if (typeof canonical === "number" && Number.isFinite(canonical)) return canonical;
  // Tolérance de lecture seule : anciens vecteurs sérialisés sous l'autre nom.
  // On ne RÉ-ÉCRIT jamais sous cette clé — le writer canon reste `composite`.
  const legacy = rec.compositeScore;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  return null;
}

/** Une mesure bornée, ou l'aveu honnête qu'elle n'est pas mesurée. */
export interface ScoreReading {
  /** Valeur mesurée, ou `null` = non mesuré (jamais 0 de remplacement). */
  value: number | null;
  /** Plafond de l'échelle — indispensable : deux mesures ici sont /200, une /100. */
  max: number;
  /** Nom lisible de CE que le nombre mesure (jamais « score » tout court). */
  label: string;
}

/** Les trois mesures d'une marque, côte à côte et jamais additionnées. */
export interface BrandScoreTriplet {
  /** Complétude structurelle ADVE — ce que la marque a déclaré (ADR-0102/0126). */
  structurel: ScoreReading;
  /** Indice d'attachement communautaire (cult index). */
  attachement: ScoreReading;
  /** Force révélée par les épreuves (ADR-0149) + son incertitude. */
  forceRevelee: ScoreReading & {
    /** Force latente θ de l'estimateur Bradley-Terry. */
    theta: number | null;
    /** Écart-type de la force (Fisher) — large = peu d'épreuves. */
    rd: number | null;
    /** Part des arènes réellement couvertes par des épreuves (0-100). */
    coveragePct: number | null;
  };
}

export interface DescribeScoresInput {
  /** `Strategy.advertis_vector` brut. */
  advertisVector?: unknown;
  /** `CultIndexSnapshot.compositeScore` du dernier snapshot. */
  cultIndexScore?: number | null;
  /** Dernier `ScoreVerdict` de la marque, s'il existe. */
  revealedForce?: {
    force?: number | null;
    theta?: number | null;
    rd?: number | null;
    coveragePct?: number | null;
  } | null;
}

function finite(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Compose les trois mesures en un objet où chacune est nommée, bornée et
 * honnête sur son absence. C'est la forme que toute surface (cockpit, MCP,
 * export) doit servir quand elle expose « le score » d'une marque.
 */
export function describeScores(input: DescribeScoresInput): BrandScoreTriplet {
  return {
    structurel: {
      value: readCompositeFromVector(input.advertisVector),
      max: ADVE_COMPOSITE_MAX,
      label: "Complétude structurelle",
    },
    attachement: {
      value: finite(input.cultIndexScore),
      max: CULT_INDEX_MAX,
      label: "Indice d'attachement",
    },
    forceRevelee: {
      value: finite(input.revealedForce?.force),
      max: REVEALED_FORCE_MAX,
      label: "Force révélée",
      theta: finite(input.revealedForce?.theta),
      rd: finite(input.revealedForce?.rd),
      coveragePct: finite(input.revealedForce?.coveragePct),
    },
  };
}
