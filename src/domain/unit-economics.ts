/** The ratio is a calculation over the displayed inputs, never a cached claim. */
export function unitEconomicsRatio(cac: unknown, ltv: unknown, recordedRatio?: unknown): number | null {
  if (typeof cac !== "number" || !Number.isFinite(cac) || cac <= 0
    || typeof ltv !== "number" || !Number.isFinite(ltv) || ltv < 0) return null;
  // null is an explicit refusal in an assembled section, not a missing cached input.
  if (recordedRatio === null) return null;
  const ratio = ltv / cac;
  const rounded = Math.round(ratio * 100) / 100;
  if (!Number.isFinite(rounded)) return null;
  // A contradictory saved ratio may describe another client cohort or period.
  // Refuse that economic claim instead of silently replacing it with a quotient.
  if (typeof recordedRatio === "number" && (!Number.isFinite(recordedRatio) || Math.abs(recordedRatio - rounded) > 0.01)) return null;
  return rounded;
}

/** Carry the source's customer/period qualification into every output reader. */
export function unitEconomicsNote(ue: { cac?: unknown; ltv?: unknown; ltvCacRatio?: unknown; commentaire?: unknown }): string | null {
  const inconsistent = typeof ue.ltvCacRatio === "number"
    && unitEconomicsRatio(ue.cac, ue.ltv, ue.ltvCacRatio) === null;
  const source = typeof ue.commentaire === "string" ? ue.commentaire.trim() : "";
  const warning = inconsistent
    ? "Ratio à requalifier : les montants et le ratio enregistré ne correspondent pas. Vérifiez que CAC et LTV portent sur le même type de client et la même période."
    : "";
  return [warning, source].filter(Boolean).join("\n\n") || null;
}
