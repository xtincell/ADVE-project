/** Presence is evidence of a supplied value, not proof of its real-world truth. */
export function socialMetricEvidence(
  input: Record<string, unknown>,
  keys: readonly string[],
  source: "DECLARED" | "SIGNED_WEBHOOK",
) {
  const values: Record<string, number> = {};
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) values[key] = value;
  }
  return {
    values,
    receipt: { measurementVersion: 1 as const, measurementSource: source, observedMetricKeys: Object.keys(values) },
  };
}
