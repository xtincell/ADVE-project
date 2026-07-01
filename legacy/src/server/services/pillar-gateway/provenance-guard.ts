/**
 * Provenance guard — applique la règle HUMAIN > SOURCE > INFÉRÉ au niveau champ,
 * AU moment de l'écriture pilier, dans le gateway (chokepoint unique).
 *
 * Fonction PURE (zéro IO) pour être testable sans DB. Le gateway lui fournit :
 *   - `previousContent` : contenu actuel du pilier
 *   - `newContent`      : contenu candidat (après merge des ops)
 *   - `existingProvenance` : map path→FieldProvenance déjà tracée (commentary._fieldProvenance)
 *   - `incomingFor(path)`  : provenance de l'écriture entrante pour ce champ
 *
 * Pour chaque champ top-level qui CHANGE, on tranche via `decideOverwrite` :
 *   - ALLOW     : on garde la nouvelle valeur, on tague le champ avec l'entrant
 *   - DENY      : on REVERTE au précédent (inféré ne peut écraser humain/source)
 *   - CHALLENGE : on REVERTE au précédent + on collecte (une source contredit
 *                 l'humain → reco d'arbitrage en aval, jamais d'écriture silencieuse)
 *
 * Inerte par construction : si `existingProvenance` est vide (cas de TOUS les
 * piliers existants tant que rien n'est tagué), tout champ existant est UNKNOWN
 * → `decideOverwrite` renvoie ALLOW → aucun comportement changé. Le garde ne
 * mord qu'une fois des provenances HUMAN/SOURCE réellement tracées.
 */

import {
  type FieldProvenance,
  coerceProvenance,
  decideOverwrite,
} from "@/domain/field-provenance";

export interface ProvenanceGuardInput {
  previousContent: Record<string, unknown>;
  newContent: Record<string, unknown>;
  existingProvenance: Record<string, unknown> | null | undefined;
  /** Provenance de l'écriture entrante pour un champ donné. */
  incomingFor: (path: string) => FieldProvenance;
}

export interface ProvenanceGuardResult {
  /** Contenu après application du garde (champs DENY/CHALLENGE revertés). */
  content: Record<string, unknown>;
  /** Map provenance mise à jour à persister dans commentary._fieldProvenance. */
  provenance: Record<string, FieldProvenance>;
  /** Champs ignorés (autorité insuffisante). */
  denied: string[];
  /** Champs en conflit source↔humain à remonter en reco CHALLENGE. */
  challenged: string[];
  /** Warnings lisibles pour IntentResult.warnings. */
  warnings: string[];
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function applyProvenanceGuard(input: ProvenanceGuardInput): ProvenanceGuardResult {
  const { previousContent, newContent, existingProvenance, incomingFor } = input;

  const content: Record<string, unknown> = { ...newContent };
  const provenance: Record<string, FieldProvenance> = {};
  // Reprendre la provenance tracée existante (normalisée).
  for (const [k, v] of Object.entries(existingProvenance ?? {})) {
    provenance[k] = coerceProvenance(v);
  }

  const denied: string[] = [];
  const challenged: string[] = [];
  const warnings: string[] = [];

  // On n'examine que les champs top-level présents dans le contenu candidat.
  for (const key of Object.keys(newContent)) {
    // Clés méta (_commentary, _fieldProvenance, _autoApproval…) : jamais arbitrées.
    if (key.startsWith("_")) continue;
    const prevVal = previousContent[key];
    const nextVal = newContent[key];

    // Champ inchangé → rien à arbitrer (mais on conserve sa provenance tracée).
    if (jsonEqual(prevVal, nextVal)) continue;

    const existing = coerceProvenance(provenance[key]);
    const incoming = incomingFor(key);
    const decision = decideOverwrite(incoming, existing);

    if (decision === "ALLOW") {
      provenance[key] = incoming;
      continue;
    }

    // DENY / CHALLENGE → on reverte au précédent (jamais d'écriture silencieuse).
    if (prevVal === undefined) {
      delete content[key];
    } else {
      content[key] = prevVal;
    }

    if (decision === "DENY") {
      denied.push(key);
      warnings.push(
        `Provenance: champ "${key}" non modifié — une écriture ${incoming} ne peut écraser une valeur ${existing} (humain > source > inféré).`,
      );
    } else {
      challenged.push(key);
      warnings.push(
        `Provenance: champ "${key}" — une source contredit une valeur saisie par l'humain. Conflit remonté en arbitrage (CHALLENGE), pas d'écrasement silencieux.`,
      );
    }
  }

  return { content, provenance, denied, challenged, warnings };
}

/** Provenance par défaut déduite du système auteur de l'écriture. */
export function provenanceFromAuthorSystem(system: string): FieldProvenance {
  if (system === "OPERATOR") return "HUMAN";
  if (system === "INGESTION" || system === "BRIEF_INGEST") return "SOURCE";
  // MESTOR / ARTEMIS / GLORY / PROTOCOLE_* / AUTO_FILLER / EXTERNAL_SAAS : dérivé/IA.
  // AUTO_FILLER peut remplir depuis une source ; dans ce cas il passe une
  // provenance explicite par champ (options.fieldProvenance) qui prime.
  return "INFERRED";
}
