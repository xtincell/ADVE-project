/**
 * src/server/services/artemis/tools/quality-gate.ts
 *
 * Phase 17 (ADR-0041) — Quality gate post-sequence. Ferme F7 (sequence
 * considérée OK si `completed > 0`, sans validation du payload final).
 *
 * Avant ce gate : une sequence qui produit `{ mckinsey7s: {} }` (objet vide
 * après LLM raté) était promue en BrandAsset DRAFT → pollution du vault avec
 * assets vides. Compteur 35/35 "vert" alors que des sections sont vides.
 *
 * Après : le gate vérifie au minimum que le payload n'est pas structurellement
 * vide ; un schéma Zod optionnel peut être passé pour validation stricte.
 *
 * Mode soft 1 semaine post-merge (warn only) → mode hard (throw). Pendant
 * le mode soft, les compteurs « auraient été flagged » sont collectés via
 * `console.warn` pour calibrage.
 */

import type { ZodSchema } from "zod";

export type QualityGateResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

/**
 * Profondeur récursive : retourne true si `v` est null, undefined, "",
 * tableau vide, ou objet avec toutes les feuilles vides.
 */
function isEmptyDeep(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number" || typeof v === "boolean") return false;
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmptyDeep);
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return true;
    // Skip clés internes préfixées `_` (metadata sequence-executor)
    return entries
      .filter(([k]) => !k.startsWith("_"))
      .every(([, val]) => isEmptyDeep(val));
  }
  return false;
}

/**
 * Applique le quality gate sur l'output final d'une sequence.
 *
 * @param sequenceKey — pour journalisation
 * @param output — finalContext de la sequence
 * @param schema — Zod schema optionnel pour validation stricte
 * @returns { ok: true } ou { ok: false, reasons: string[] }
 */
export async function applySequenceQualityGate(
  sequenceKey: string,
  output: Record<string, unknown>,
  schema?: ZodSchema,
): Promise<QualityGateResult> {
  const reasons: string[] = [];

  if (schema) {
    const r = schema.safeParse(output);
    if (!r.success) {
      for (const issue of r.error.issues) {
        reasons.push(`schema:${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
    }
  }

  if (isEmptyDeep(output)) {
    reasons.push("output payload structurally empty");
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

export class SequenceQualityError extends Error {
  constructor(
    public readonly sequenceKey: string,
    public readonly reasons: string[],
  ) {
    super(`Quality gate failed for ${sequenceKey}: ${reasons.join("; ")}`);
    this.name = "SequenceQualityError";
  }
}

/**
 * Mode soft : log warn uniquement, ne throw pas. Utilisé pendant 1 semaine
 * post-merge (Phase 17, ADR-0041 §4) pour collecter les false positives
 * sur les sequences legacy avant de basculer en mode hard.
 */
export function runQualityGateSoft(
  sequenceKey: string,
  result: QualityGateResult,
): void {
  if (!result.ok) {
    console.warn(
      `[quality-gate:soft] sequence=${sequenceKey} reasons=${result.reasons.join("|")}`,
    );
  }
}

/**
 * Mode hard : throw `SequenceQualityError` si fail. Activable post-bake-in
 * (Phase 17, ADR-0041 §4).
 */
export function runQualityGateHard(
  sequenceKey: string,
  result: QualityGateResult,
): void {
  if (!result.ok) {
    throw new SequenceQualityError(sequenceKey, result.reasons);
  }
}
