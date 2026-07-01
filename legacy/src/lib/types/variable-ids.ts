/**
 * VARIABLE IDS — stable, unique identifier for EVERY ADVERTIS variable.
 *
 * The 1-letter pillar keys + the partial `canonicalCode` coverage (only some
 * fields carried a code) caused ambiguity bugs. This registry gives **every**
 * variable in the bible a deterministic, namespaced, renumbered id:
 *
 *   variableId : "pillar-a-001"   (pillar slug + zero-padded sequential)
 *   code       : "A1"             (human cross-reference, letter + number)
 *
 * Pure (Layer: lib) — derived from VARIABLE_BIBLE insertion order, so ids are
 * stable as long as the bible field order is. Surfaced as a badge in the
 * cockpit pillar editor and consumable anywhere a stable variable handle is
 * needed (telemetry, exports, deep-links).
 */

import { VARIABLE_BIBLE } from "./variable-bible";
import { PILLAR_STORAGE_KEYS, toSlug } from "@/domain";

export interface VariableId {
  /** Stable unique id: "pillar-a-001". */
  variableId: string;
  /** Pillar slug: "pillar-a". */
  pillarSlug: string;
  /** Lowercase storage key of the owning pillar ("a" … "s"). */
  pillarKey: string;
  /** 1-based sequential position within the pillar. */
  num: number;
  /** Human cross-reference code: "A1", "D7", … */
  code: string;
  /** Field key in the pillar content / bible. */
  fieldKey: string;
}

function build(): Record<string, Record<string, VariableId>> {
  const out: Record<string, Record<string, VariableId>> = {};
  for (const storageKey of PILLAR_STORAGE_KEYS) {
    const bible = VARIABLE_BIBLE[storageKey] ?? {};
    const slug = toSlug(storageKey); // "pillar-a"
    const letter = storageKey.toUpperCase(); // "A"
    out[storageKey] = {};
    let n = 0;
    for (const fieldKey of Object.keys(bible)) {
      n += 1;
      out[storageKey][fieldKey] = {
        variableId: `${slug}-${String(n).padStart(3, "0")}`,
        pillarSlug: slug,
        pillarKey: storageKey,
        num: n,
        code: `${letter}${n}`,
        fieldKey,
      };
    }
  }
  return out;
}

/** `Record<storageKey, Record<fieldKey, VariableId>>`. */
export const VARIABLE_IDS: Record<string, Record<string, VariableId>> = build();

/** Stable id for one variable (accepts canonical or storage pillar key). */
export function getVariableId(pillarKey: string, fieldKey: string): VariableId | undefined {
  return VARIABLE_IDS[pillarKey.toLowerCase()]?.[fieldKey];
}

/** Flat registry of every variable id (e.g. for a variable directory / export). */
export const ALL_VARIABLE_IDS: VariableId[] = Object.values(VARIABLE_IDS).flatMap((m) => Object.values(m));
