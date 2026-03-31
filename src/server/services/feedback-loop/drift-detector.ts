import type { PillarKey } from "@/lib/types/advertis-vector";

export interface DriftResult {
  isDrifting: boolean;
  delta: number;
  severity: "low" | "medium" | "high" | "critical";
}

// Configurable thresholds per pillar
const DRIFT_THRESHOLDS: Record<PillarKey, { low: number; medium: number; high: number; critical: number }> = {
  a: { low: 2, medium: 4, high: 6, critical: 8 },
  d: { low: 2, medium: 4, high: 6, critical: 8 },
  v: { low: 2, medium: 4, high: 6, critical: 8 },
  e: { low: 1.5, medium: 3, high: 5, critical: 7 },
  r: { low: 1.5, medium: 3, high: 5, critical: 7 },
  t: { low: 2, medium: 4, high: 6, critical: 8 },
  i: { low: 2, medium: 4, high: 6, critical: 8 },
  s: { low: 2, medium: 4, high: 6, critical: 8 },
};

/**
 * Detects score drift on a pillar.
 * Only negative drift (score decrease) triggers alerts.
 */
export function detectDrift(pillar: PillarKey, previous: number, current: number): DriftResult {
  const delta = current - previous;
  const absDelta = Math.abs(delta);
  const thresholds = DRIFT_THRESHOLDS[pillar];

  // Only alert on negative drift (score drops)
  if (delta >= 0) {
    return { isDrifting: false, delta, severity: "low" };
  }

  let severity: DriftResult["severity"] = "low";
  if (absDelta >= thresholds.critical) severity = "critical";
  else if (absDelta >= thresholds.high) severity = "high";
  else if (absDelta >= thresholds.medium) severity = "medium";
  else if (absDelta >= thresholds.low) severity = "low";
  else return { isDrifting: false, delta, severity: "low" };

  return { isDrifting: true, delta, severity };
}
