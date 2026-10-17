import { FIELD_PROVENANCE_LABEL, fieldStatusFor, isFieldProvenance } from "@/domain/field-provenance";
import { wrapUntrusted } from "./untrusted-content";

/** Shorten prose leaves; retain every record, identifier and numeric value. */
export function projectForContext(value: unknown, leafMax: number): unknown {
  if (typeof value === "string") return value.length > leafMax ? value.slice(0, leafMax) + "…" : value;
  if (Array.isArray(value)) return value.map(v => projectForContext(v, leafMax));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, projectForContext(v, leafMax)]));
  }
  return value;
}

/** The same bounded, authority-qualified context for individual and sequenced readers. */
export function serializePillar(key: string, content: unknown, fieldStatus?: (field: string) => string | undefined): string {
  if (!content || typeof content !== "object") return `[${key}] Vide`;
  const projected = projectForContext(content, 400);
  const status = fieldStatus ?? fieldStatusFor(undefined, key, (content as Record<string, unknown>)._fieldProvenance);
  const qualified = projected && !Array.isArray(projected)
    ? Object.fromEntries(Object.entries(projected as Record<string, unknown>)
      .filter(([field]) => !field.startsWith("_"))
      .map(([field, valeur]) => {
        const statut = status(field) ?? "UNKNOWN";
        return [field, { statut, origine: isFieldProvenance(statut) ? FIELD_PROVENANCE_LABEL[statut]
          : "Qualification héritée — provenance de champ non établie", valeur }];
      }))
    : projected;
  const json = JSON.stringify(qualified, null, 2);
  // Never hand a reader half a JSON object or silently discard its last personas.
  // The former 8K/1.1K summaries also removed all nested foreign-key targets.
  // A complete I catalogue is larger than the former 64K per-pillar guard.
  // Keep admission bounded and lossless at the record level; model-window
  // compression, routing and cost remain the existing gateway's responsibility.
  const max = 128_000;
  if (json.length > max) throw new Error(`PILLAR_CONTEXT_TOO_LARGE: ${key} dépasse la fenêtre structurée (${json.length}/${max}).`);
  return wrapUntrusted(`PILIER ${key}`, json, { max });
}
