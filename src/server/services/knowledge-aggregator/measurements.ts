/** Numeric measurements only: a missing, malformed or negative count is not zero. */
export function measuredNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function measurementRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export type MeasurementCoverage = {
  observedCount: number;
  missingCount: number;
  totalCount: number;
};

export function signalMeasurement(data: Record<string, unknown>, key: string) {
  const value = measuredNumber(data[key]);
  if (value === null) return null;
  if (data.measurementVersion === 1) {
    if (!Array.isArray(data.observedMetricKeys) || !data.observedMetricKeys.includes(key)) return null;
    if (data.measurementSource !== "DECLARED" && data.measurementSource !== "SIGNED_WEBHOOK") return null;
    return { value, source: data.measurementSource } as const;
  }
  if (data.measurementVersion !== undefined) return null;
  // Old producers inserted zeroes for missing fields. Positive values were not
  // created by that fallback, but remain reported history, not native evidence.
  return value > 0 ? { value, source: "LEGACY_REPORTED" as const } : null;
}

export function readMeasurementSources(value: unknown, coverage: MeasurementCoverage) {
  const sources = measurementRecord(value);
  const declared = measuredNumber(sources.DECLARED);
  const signedWebhook = measuredNumber(sources.SIGNED_WEBHOOK);
  const legacyReported = measuredNumber(sources.LEGACY_REPORTED);
  if (declared === null || signedWebhook === null || legacyReported === null
    || ![declared, signedWebhook, legacyReported].every(Number.isSafeInteger)
    || declared + signedWebhook + legacyReported !== coverage.observedCount) return null;
  return { DECLARED: declared, SIGNED_WEBHOOK: signedWebhook, LEGACY_REPORTED: legacyReported };
}

export function compositeSummary(strategies: { advertis_vector: unknown }[]) {
  const values = strategies.map(s => measuredNumber(measurementRecord(s.advertis_vector).composite)).filter((v): v is number => v !== null);
  return {
    count: strategies.length,
    avgComposite: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    coverage: measurementCoverage(values.length, strategies.length),
    benchmarks: {},
  };
}

export function measurementCoverage(observedCount: number, totalCount: number): MeasurementCoverage {
  return { observedCount, missingCount: totalCount - observedCount, totalCount };
}

export function readMeasurementCoverage(value: unknown): MeasurementCoverage | null {
  const data = measurementRecord(value);
  const { observedCount, missingCount, totalCount } = data;
  if (![observedCount, missingCount, totalCount].every(v => typeof v === "number" && Number.isSafeInteger(v) && v >= 0)) return null;
  if ((observedCount as number) + (missingCount as number) !== totalCount) return null;
  return { observedCount: observedCount as number, missingCount: missingCount as number, totalCount: totalCount as number };
}

/** Older aggregates cannot distinguish real zeroes from the former zero fallback. */
export function readBriefMeasurements(data: Record<string, unknown>) {
  const counts = measurementRecord(data.coverage);
  const engagement = data.metricsVersion === 1 ? readMeasurementCoverage(counts.engagement) : null;
  const clicks = data.metricsVersion === 1 ? readMeasurementCoverage(counts.clicks) : null;
  const coverage = engagement && clicks && engagement.totalCount === clicks.totalCount ? { engagement, clicks } : null;
  const sources = measurementRecord(data.measurementSources);
  return {
    avgEngagement: coverage && coverage.engagement.observedCount >= 3 ? measuredNumber(data.avgEngagement) : null,
    avgClicks: coverage && coverage.clicks.observedCount >= 3 ? measuredNumber(data.avgClicks) : null,
    coverage,
    measurementSources: coverage ? {
      engagement: readMeasurementSources(sources.engagement, coverage.engagement),
      clicks: readMeasurementSources(sources.clicks, coverage.clicks),
    } : null,
  };
}

export function readSectorMeasurements(data: Record<string, unknown>, aggregate: boolean) {
  const coverage = data.metricsVersion === 1 ? readMeasurementCoverage(data.coverage) : null;
  const verifiedAggregate = coverage !== null && coverage.observedCount >= 2;
  return {
    avgComposite: aggregate && !verifiedAggregate ? null : measuredNumber(data.avgComposite),
    topQuartile: aggregate && !verifiedAggregate ? null : measuredNumber(data.topQuartile),
    coverage,
    basis: verifiedAggregate ? "AGGREGATED" : aggregate ? "UNVERIFIED_AGGREGATE" : "DECLARED",
  };
}

export function sectorBenchmarkExcerpt(value: unknown, aggregate: boolean): string {
  const data = measurementRecord(value);
  const projection = readSectorMeasurements(data, aggregate);
  if (projection.basis === "UNVERIFIED_AGGREGATE" && !projection.coverage) {
    return "Agrégat historique à recalculer ; couverture des mesures inconnue.";
  }
  const coverage = projection.coverage;
  const label = projection.basis === "DECLARED" ? "Score moyen déclaré" : "Score moyen";
  return `${label}: ${projection.avgComposite ?? "non mesuré"}/200. Top quartile: ${projection.topQuartile ?? "non mesuré"}/200.`
    + (coverage ? ` ${coverage.observedCount}/${coverage.totalCount} scores renseignés.` : " Couverture des mesures inconnue.");
}

/** Whitelisted numeric fields only; never expose arbitrary knowledge-entry payloads. */
export function briefPatternExcerpt(value: unknown): string {
  const data = measurementRecord(value);
  const { avgEngagement, avgClicks, coverage } = readBriefMeasurements(data);
  if (coverage) {
    const describe = (label: string, mean: number | null, counts: MeasurementCoverage) => {
      const value = mean !== null ? String(mean) : counts.observedCount === 0 ? "non mesuré" : "mesures insuffisantes";
      return `${label}: ${value} (${counts.observedCount}/${counts.totalCount} valeurs renseignées)`;
    };
    return `${describe("Engagement moyen", avgEngagement, coverage.engagement)}. ${describe("Clics moyens", avgClicks, coverage.clicks)}.`;
  }
  const rate = measuredNumber(data.successRate);
  const revisions = measuredNumber(data.avgRevisions);
  return `Taux de succès: ${rate === null ? "non mesuré" : `${rate * 100}%`}. Révisions moyennes: ${revisions ?? "non mesurées"}.`;
}
