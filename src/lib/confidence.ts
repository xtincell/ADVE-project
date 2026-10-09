/** A missing or invalid measurement is unknown. Zero is a real measurement. */
export function measuredConfidence(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value : null;
}
