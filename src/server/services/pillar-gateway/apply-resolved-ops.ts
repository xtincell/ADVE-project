/**
 * PILLAR-GATEWAY — Application des recos pré-résolues (Notoria), PROFONDE et pure.
 *
 * Extrait du gateway (`APPLY_RECOS_RESOLVED`) : la logique était OBJECT-ONLY
 * (`newContent[op.field]`), donc une reco ciblant une feuille imbriquée
 * (`prophecy.pioneers`, `produitsCatalogue[2].gainClientConcret`) créait une clé
 * LITTÉRALE `"prophecy.pioneers"` — écrasée ensuite comme artefact de dot-notation
 * → application SILENCIEUSEMENT sans effet. Le chantier « chemin profond unifié »
 * (Phase 0, `@/lib/pillar-path`) avait unifié l'écriture PARTOUT sauf cette
 * branche : ce module la referme.
 *
 * Pur (aucune IO, aucune dépendance serveur/DB) → testable sans base. Le gateway
 * reste le SEUL écrivain (C5) : il appelle cette fonction, puis persiste via
 * `writePillar`. Rétro-compatible : un champ top-level (`op.field` sans `.` ni
 * index) suit exactement l'ancien chemin d'écriture.
 */

import { resolvePillarPath, setNestedValue } from "@/lib/pillar-path";

/**
 * Coerce a proposed value to match the type of the existing value.
 * Prevents type mismatches when LLM produces wrong format.
 */
export function coerceValue(existing: unknown, proposed: unknown): unknown {
  if (proposed === null || proposed === undefined) return proposed;

  // If existing is a string and proposed is an array → join
  if (typeof existing === "string" && Array.isArray(proposed)) {
    return proposed.map(String).join(", ");
  }

  // If existing is a string and proposed is an object → stringify the main value
  if (typeof existing === "string" && typeof proposed === "object" && !Array.isArray(proposed)) {
    const obj = proposed as Record<string, unknown>;
    // Try common fields
    return obj.value ?? obj.text ?? obj.content ?? obj.description ?? obj.name ?? JSON.stringify(proposed);
  }

  // If existing is a number and proposed is a string → parse
  if (typeof existing === "number" && typeof proposed === "string") {
    const n = parseFloat(proposed);
    return isNaN(n) ? existing : n;
  }

  // If existing is an array and proposed is a single item (string/object) → wrap in array
  if (Array.isArray(existing) && !Array.isArray(proposed)) {
    // For ADD operations, the proposed should be a single item
    // For SET operations on array fields, wrap it
    if (typeof proposed === "string") {
      // If existing array has objects, try to wrap string into expected object format
      if (existing.length > 0 && typeof existing[0] === "object" && existing[0] !== null) {
        const firstKeys = Object.keys(existing[0] as Record<string, unknown>);
        const nameKey = firstKeys.find((k) => ["name", "nom", "value", "title", "action"].includes(k)) ?? firstKeys[0];
        if (nameKey) {
          return { [nameKey]: proposed };
        }
      }
    }
    return proposed; // Trust it — ADD operation will append
  }

  // If field doesn't exist yet (new field), trust the proposed value
  if (existing === undefined || existing === null || existing === "") return proposed;

  return proposed;
}

export interface ResolvedRecoOp {
  field: string;
  operation: string;
  proposedValue: unknown;
  targetMatch?: { key: string; value: string };
  recoId: string;
}

export interface ApplyResolvedResult {
  content: Record<string, unknown>;
  appliedCount: number;
  warnings: string[];
}

/** true si le `field` vise une feuille profonde (`a.b` ou `arr[0]`). */
function isDeepField(field: string): boolean {
  return field.includes(".") || /\[\d+\]/.test(field);
}

/**
 * Applique un lot d'opérations Notoria PRÉ-RÉSOLUES à un contenu pilier.
 * Profondeur-consciente : SET/EXTEND écrivent à la feuille (`setNestedValue`),
 * ADD/MODIFY/REMOVE ciblent le tableau à la feuille (`resolvePillarPath`). Un
 * champ top-level garde l'écriture directe (parité stricte avec l'ancien code).
 *
 * `base` n'est JAMAIS muté (clone profond) — la PillarVersion pré-écriture reste
 * intacte (l'ancien `{...base}` partageait les tableaux imbriqués : une op ADD sur
 * une matrice mutait aussi le snapshot « précédent »).
 */
export function applyResolvedRecoOps(
  base: Record<string, unknown>,
  ops: ResolvedRecoOp[],
): ApplyResolvedResult {
  const newContent = structuredClone(base) as Record<string, unknown>;
  const warnings: string[] = [];

  // Order: EXTEND → MODIFY → ADD → REMOVE → SET (prevent index shift)
  const opOrder: Record<string, number> = { EXTEND: 0, MODIFY: 1, ADD: 2, REMOVE: 3, SET: 4 };
  const sorted = [...ops].sort((a, b) => (opOrder[a.operation] ?? 5) - (opOrder[b.operation] ?? 5));

  let appliedCount = 0;
  for (const op of sorted) {
    const deep = isDeepField(op.field);
    const existing = deep ? resolvePillarPath(newContent, op.field) : newContent[op.field];
    const writeBack = (v: unknown) => {
      if (deep) setNestedValue(newContent, op.field, v);
      else newContent[op.field] = v;
    };

    switch (op.operation) {
      case "SET":
        writeBack(coerceValue(existing, op.proposedValue));
        appliedCount++;
        break;

      case "ADD":
        if (Array.isArray(existing)) {
          existing.push(coerceValue(undefined, op.proposedValue));
          appliedCount++;
        } else if (existing == null) {
          writeBack([coerceValue(undefined, op.proposedValue)]);
          appliedCount++;
        } else {
          warnings.push(`ADD: field "${op.field}" is not an array (type=${typeof existing}) — skipped (reco ${op.recoId})`);
        }
        break;

      case "MODIFY": {
        if (!Array.isArray(existing)) {
          warnings.push(`MODIFY: field "${op.field}" is not an array — skipped (reco ${op.recoId})`);
          break;
        }
        let idx = -1;
        if (op.targetMatch) {
          idx = existing.findIndex(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item as Record<string, unknown>)[op.targetMatch!.key] === op.targetMatch!.value,
          );
        }
        if (idx < 0) {
          warnings.push(`MODIFY: target not found for "${op.field}" match=${JSON.stringify(op.targetMatch)} — skipped (reco ${op.recoId})`);
        } else {
          existing[idx] = coerceValue(existing[idx], op.proposedValue);
          appliedCount++;
        }
        break;
      }

      case "REMOVE": {
        if (!Array.isArray(existing)) {
          warnings.push(`REMOVE: field "${op.field}" is not an array — skipped (reco ${op.recoId})`);
          break;
        }
        let ridx = -1;
        if (op.targetMatch) {
          ridx = existing.findIndex(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item as Record<string, unknown>)[op.targetMatch!.key] === op.targetMatch!.value,
          );
        }
        if (ridx < 0) {
          warnings.push(`REMOVE: target not found for "${op.field}" match=${JSON.stringify(op.targetMatch)} — skipped (reco ${op.recoId})`);
        } else {
          existing.splice(ridx, 1);
          appliedCount++;
        }
        break;
      }

      case "EXTEND": {
        if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
          writeBack({ ...(existing as Record<string, unknown>), ...(op.proposedValue as Record<string, unknown>) });
          appliedCount++;
        } else if (existing == null) {
          writeBack(op.proposedValue);
          appliedCount++;
        } else {
          warnings.push(`EXTEND: field "${op.field}" is not an object — skipped (reco ${op.recoId})`);
        }
        break;
      }

      default:
        warnings.push(`Opération inconnue "${op.operation}" pour "${op.field}" — ignorée (reco ${op.recoId})`);
    }
  }

  return { content: newContent, appliedCount, warnings };
}
