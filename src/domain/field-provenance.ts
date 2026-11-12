/**
 * FieldProvenance — qui a posé la valeur d'un champ de pilier ADVE.
 *
 * **Layer 0** : zéro IO, zéro Prisma. Pure domain.
 *
 * Distinct de `SourceCertainty` (`source-certainty.ts`), qui note la fiabilité
 * d'une *source de fichier* (OFFICIAL/DECLARED/INFERRED/ARBITRARY). Ici on note
 * l'origine d'une *valeur de champ* déjà posée dans un pilier, pour faire
 * respecter la règle opérateur :
 *
 *     HUMAIN  >  SOURCE  >  INFÉRÉ
 *
 * - **HUMAN**     : valeur saisie/validée explicitement par un opérateur ou un
 *                   founder (OPERATOR_AMEND_PILLAR, confirmInferredField, édition
 *                   manuelle). La parole de l'humain. Ne se fait jamais écraser
 *                   silencieusement.
 * - **SOURCE**    : valeur extraite d'une `BrandDataSource` importée (document
 *                   client, formulaire intake). Peut corriger un INFERRED ;
 *                   si elle contredit un HUMAN → CHALLENGE (arbitrage humain),
 *                   jamais d'écriture silencieuse.
 * - **INFERRED**  : valeur générée par IA / dérivée (cross-pilier, calcul). La
 *                   plus basse autorité : ne peut JAMAIS écraser SOURCE ni HUMAN.
 * - **UNKNOWN**   : pas de provenance tracée (champ vide, legacy). Tout écrit
 *                   l'emporte.
 *
 * Pourquoi une échelle propre et pas SourceCertainty : SourceCertainty classe
 * OFFICIAL > DECLARED, soit « document vérifié > parole humaine ». La doctrine
 * opérateur ici est l'inverse au niveau champ — la décision humaine explicite
 * prime sur ce qu'un document dit, et une contradiction document↔humain se
 * tranche par l'humain (CHALLENGE), jamais en silence. Les deux échelles
 * coexistent : SourceCertainty pondère l'ingestion, FieldProvenance arbitre
 * l'écrasement.
 */

import { z } from "zod";
import { resolvePillarPath } from "./pillar-path";

/** Du plus autoritaire (HUMAN) au moins (UNKNOWN). */
export const FIELD_PROVENANCE_LEVELS = ["HUMAN", "SOURCE", "INFERRED", "UNKNOWN"] as const;

export type FieldProvenance = (typeof FIELD_PROVENANCE_LEVELS)[number];

export const FieldProvenanceSchema = z.enum(FIELD_PROVENANCE_LEVELS);

const RANK: Record<FieldProvenance, number> = {
  HUMAN: 3,
  SOURCE: 2,
  INFERRED: 1,
  UNKNOWN: 0,
};

export function provenanceRank(p: FieldProvenance): number {
  return RANK[p];
}

export function isFieldProvenance(value: unknown): value is FieldProvenance {
  return typeof value === "string" && (FIELD_PROVENANCE_LEVELS as readonly string[]).includes(value);
}

/** Normalise une valeur inconnue/legacy en FieldProvenance (défaut UNKNOWN). */
export function coerceProvenance(value: unknown): FieldProvenance {
  return isFieldProvenance(value) ? value : "UNKNOWN";
}

/** Legacy fallback; explicit canonical leaf origins keep their own grain. */
export function provenanceTopKey(path: string, pillarKey: string): string {
  const prefix = `${pillarKey.toLowerCase()}.`;
  return (path.startsWith(prefix) ? path.slice(prefix.length) : path).split(/[.[]/)[0] ?? "";
}

/** La provenance canonique prime ; une absence n'est jamais une déclaration. */
export function fieldStatusFor(certainty: Record<string, string> | null | undefined, pillarKey: string, provenance?: unknown) {
  const fc = certainty ?? {};
  const origins = provenance && typeof provenance === "object" && !Array.isArray(provenance)
    ? provenance as Record<string, unknown> : {};
  const prefix = `${pillarKey.toLowerCase()}.`;
  return (path: string): string | undefined => {
    const bare = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const top = provenanceTopKey(bare, pillarKey);
    const normalizedPath = (key: string) => key.startsWith(prefix) ? key.slice(prefix.length) : key;
    const ancestor = Object.keys(origins).filter(key => {
      const normalized = normalizedPath(key);
      return bare === normalized || bare.startsWith(`${normalized}.`) || bare.startsWith(`${normalized}[`);
    }).sort((a, b) => normalizedPath(b).length - normalizedPath(a).length)[0];
    const raw = ancestor === undefined ? undefined : origins[ancestor];
    if (raw !== undefined) return coerceProvenance(raw);
    return fc[bare] ?? fc[`${prefix}${bare}`] ?? fc[top] ?? fc[`${prefix}${top}`];
  };
}

/** Liste confirmable partagée par lecteur et écrivain, sans champs absents. */
export function inferredFieldPaths(content: Record<string, unknown>, certainty: Record<string, string> | null | undefined, pillarKey: string): string[] {
  const provenance = content._fieldProvenance;
  const origins = provenance && typeof provenance === "object" && !Array.isArray(provenance) ? provenance : {};
  const status = fieldStatusFor(certainty, pillarKey, provenance);
  const paths = [...Object.keys(certainty ?? {}), ...Object.keys(origins)];
  const prefix = `${pillarKey.toLowerCase()}.`;
  return [...new Set(paths.filter(path => status(path) === "INFERRED").map(path => {
    const bare = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    return Object.hasOwn(origins, bare) || Object.hasOwn(origins, `${prefix}${bare}`) ? bare : provenanceTopKey(path, pillarKey);
  }))]
    .filter(key => key && !key.startsWith("_") && resolvePillarPath(content, key) != null && resolvePillarPath(content, key) !== "")
    .sort();
}

/**
 * Décision d'écrasement d'un champ existant (provenance `existing`) par une
 * écriture entrante (provenance `incoming`).
 *
 * - `ALLOW`     : écrire la valeur et taguer le champ avec `incoming`.
 * - `CHALLENGE` : ne PAS écraser ; remonter une recommandation CHALLENGE pour
 *                 arbitrage humain (une source contredit une valeur humaine).
 * - `DENY`      : autorité inférieure — ignorer silencieusement (avec warning).
 *                 Un INFERRED ne peut jamais écraser un SOURCE/HUMAN.
 */
export type OverwriteDecision = "ALLOW" | "CHALLENGE" | "DENY";

export function decideOverwrite(
  incoming: FieldProvenance,
  existing: FieldProvenance,
): OverwriteDecision {
  // Champ sans provenance tracée (vide/legacy) → tout écrit l'emporte.
  if (existing === "UNKNOWN") return "ALLOW";

  // La parole humaine l'emporte toujours.
  if (incoming === "HUMAN") return "ALLOW";

  // L'inféré ne peut jamais écraser une valeur humaine ou sourcée.
  if (incoming === "INFERRED" && (existing === "HUMAN" || existing === "SOURCE")) {
    return "DENY";
  }

  // Une source qui contredirait une valeur humaine → arbitrage, jamais en silence.
  if (incoming === "SOURCE" && existing === "HUMAN") return "CHALLENGE";

  // Source→(source|inferred), inferred→inferred : rafraîchissement autorisé.
  return "ALLOW";
}

/** Label FR court pour la cockpit UI (badge provenance). */
export const FIELD_PROVENANCE_LABEL: Record<FieldProvenance, string> = {
  HUMAN: "Saisi par l'humain",
  SOURCE: "Issu d'une source",
  INFERRED: "Déduit — à vérifier",
  UNKNOWN: "Origine inconnue",
};

/** Review duty accompanies a working premise into its readers. Responsibility
 * is a role, never a fabricated assignment to a person. The existing versioned
 * confirmation records the actual reviewer; pending review does not block use. */
export const FIELD_VERIFICATION_RULES = {
  RITUALS: "Pour chaque transition ou rituel, vérifier le public concerné, le déclencheur, le comportement attendu et les moyens de l’accompagner. Confirmer sa pertinence avec l’équipe ; ne pas le confondre avec un comportement déjà observé.",
  FINANCIAL: "Vérifier les montants, unités, périodes, inclusions et hypothèses de volume. Confronter les coûts aux pièces disponibles et confirmer les hypothèses utilisables pour le plan ; une estimation ne devient pas un devis.",
  MEASUREMENT: "Vérifier le public, la définition de chaque indicateur, sa cible, son unité et sa période. Confirmer que les moyens prévus permettent de tester cette cible ; la distinguer d’un résultat mesuré.",
  ACTORS: "Vérifier le rôle de chaque acteur, son besoin, son apport et sa contrepartie dans les documents et retours terrain. Confirmer les hypothèses retenues sans confondre public, partenaire et client payeur.",
  TEAM: "Vérifier les identités, fonctions et disponibilités auprès des personnes concernées. Un rôle proposé reste à pourvoir tant qu’une personne réelle ne l’a pas accepté.",
  GENERAL: "Confronter cette proposition aux documents de marque, aux constats du scan et aux attentes des parties prenantes. Vérifier sa cohérence, puis confirmer ou corriger chaque élément utilisé pour le plan.",
} as const;
export type FieldVerificationProfile = keyof typeof FIELD_VERIFICATION_RULES;

export const FIELD_VERIFICATION_RESPONSIBILITY = {
  "responsable": "Responsable de marque",
  "usage": "Postulat de travail utilisable pour les calculs et livrables pendant sa vérification. La confirmation engage le choix de cette prémisse, sans la transformer en résultat observé."
} as const;

export function fieldVerificationProfile(pillarKey: string, path: string): FieldVerificationProfile {
  const top = provenanceTopKey(path, pillarKey);
  return /ritesDePassage|rituels|sacraments|hierarchieCommunautaire|pelerinages/.test(top)
    ? "RITUALS"
    : /financial|budget|unitEconomics|prix|produitsCatalogue|productLadder/i.test(top)
      ? "FINANCIAL"
      : /kpis|devotionProjection|objectifs|aarrr|touchpoint/i.test(top)
        ? "MEASUREMENT"
        : /persona|segment|superfan/i.test(top)
          ? "ACTORS"
          : /equipe|founder|fondateur|clerge/i.test(top)
            ? "TEAM"
            : "GENERAL";
}

export function inferredFieldVerification(pillarKey: string, path: string) {
  return { ...FIELD_VERIFICATION_RESPONSIBILITY, instruction: FIELD_VERIFICATION_RULES[fieldVerificationProfile(pillarKey, path)] };
}

/**
 * Part de la matière d'un pilier qui repose sur du DÉCLARÉ plutôt que sur de
 * l'inféré.
 *
 * Motivation (audit MCP 2026-07-27, §6) : « `_fieldProvenance` existe et ne sert
 * à rien ». La provenance est tracée à l'écriture — sur le pilier A de SPAWT,
 * `doctrine`, `prophecy`, `originMyth` sont marqués INFERRED — mais **rien ne
 * l'expose** : un lecteur voit un pilier scoré 17,4 sans savoir si ce socle est
 * réel ou généré. Deux marques au même score peuvent être dans deux situations
 * radicalement différentes.
 *
 * Ce que cette fonction fait : elle **compte**. Ce qu'elle ne fait PAS :
 * modifier un score. `scoring.ts` est le canon figé d'une **complétude
 * structurelle** (ADR-0102) ; y injecter la provenance serait un changement de
 * doctrine, qui appartient à l'opérateur et exige un ADR — pas un effet de bord
 * d'une fonction d'affichage.
 *
 * Honnêteté sur l'absence : quand aucun champ n'est tracé (le cas de tous les
 * piliers antérieurs au garde), `declaredRatio` vaut **`null`** — « non tracé »
 * — et surtout pas 0, qui se lirait « tout est inféré » et serait un mensonge.
 */
export interface ProvenanceBreakdown {
  /** Nombre de champs tracés par niveau. */
  counts: Record<FieldProvenance, number>;
  /** Total de champs portant une provenance tracée. */
  tracked: number;
  /**
   * Part HUMAN+SOURCE sur les champs tracés, 0-1. `null` si rien n'est tracé —
   * « on ne sait pas » ne se rend jamais par un chiffre.
   */
  declaredRatio: number | null;
  /** Champs tracés INFERRED — ceux qu'un opérateur devrait confirmer. */
  inferredFields: string[];
}

/**
 * @param provenanceMap `commentary._fieldProvenance` d'un pilier (path → niveau).
 */
export function computeProvenanceBreakdown(provenanceMap: unknown): ProvenanceBreakdown {
  const counts: Record<FieldProvenance, number> = { HUMAN: 0, SOURCE: 0, INFERRED: 0, UNKNOWN: 0 };
  const inferredFields: string[] = [];

  if (provenanceMap && typeof provenanceMap === "object" && !Array.isArray(provenanceMap)) {
    for (const [path, raw] of Object.entries(provenanceMap as Record<string, unknown>)) {
      const level = coerceProvenance(raw);
      counts[level] += 1;
      if (level === "INFERRED") inferredFields.push(path);
    }
  }

  const tracked = counts.HUMAN + counts.SOURCE + counts.INFERRED + counts.UNKNOWN;
  return {
    counts,
    tracked,
    declaredRatio: tracked === 0 ? null : (counts.HUMAN + counts.SOURCE) / tracked,
    inferredFields: inferredFields.sort(),
  };
}
