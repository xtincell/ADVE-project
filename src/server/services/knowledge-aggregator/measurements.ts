import { ADVE_COMPOSITE_MAX } from "@/domain/brand-scores";
import { MarketScaleSchema, type MarketScale } from "@/domain/market-scale";
import { PILLAR_STORAGE_KEYS, type PillarStorageKey } from "@/domain/pillars";
import { classifyCanonicalSector } from "@/domain/sector-taxonomy";

/** Numeric measurements only: a missing, malformed or negative count is not zero. */
export function measuredNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function measuredComposite(value: unknown): number | null {
  const score = measuredNumber(value);
  return score !== null && score <= ADVE_COMPOSITE_MAX ? score : null;
}

/** The taxonomy's fallback AUTRE is not evidence of a declared sector. */
export function benchmarkSector(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const sector = classifyCanonicalSector(value);
  return sector.code === "AUTRE" && value.trim().toUpperCase() !== "AUTRE" ? null : sector.slug;
}

export type BenchmarkCohort = {
  sector: string | null;
  countryCode: string | null;
  marketScale: MarketScale | null;
  qualified: boolean;
};

/** Canonical strategy coordinates only; never fall back to an arbitrary intake. */
export function benchmarkCohort(sectorValue: unknown, countryValue: unknown, scaleValue: unknown): BenchmarkCohort {
  const sector = benchmarkSector(sectorValue);
  const countryCode = typeof countryValue === "string" && /^[A-Z]{2}$/.test(countryValue) ? countryValue : null;
  const scale = MarketScaleSchema.safeParse(scaleValue);
  const marketScale = scale.success ? scale.data : null;
  return { sector, countryCode, marketScale, qualified: sector !== null && countryCode !== null && marketScale !== null };
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
  const vectors = strategies.map(s => measurementRecord(s.advertis_vector));
  const values = vectors.map(v => measuredComposite(v.composite)).filter((v): v is number => v !== null);
  const pillarBenchmarks = Object.fromEntries(PILLAR_STORAGE_KEYS.map(key => {
    // AdvertisVectorSchema: each stored axis is a finite number in [0, 25].
    const scores = vectors.map(v => measuredNumber(v[key])).filter((v): v is number => v !== null && v <= 25);
    return [key, {
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      coverage: measurementCoverage(scores.length, strategies.length),
    }];
  })) as Record<PillarStorageKey, { average: number | null; coverage: MeasurementCoverage }>;
  return {
    count: strategies.length,
    avgComposite: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    coverage: measurementCoverage(values.length, strategies.length),
    benchmarks: {},
    pillarBenchmarks,
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
  const coverage = data.metricsVersion === 1 || data.metricsVersion === 2 ? readMeasurementCoverage(data.coverage) : null;
  const rawCohort = measurementRecord(data.cohort);
  const cohort = data.metricsVersion === 2 ? benchmarkCohort(rawCohort.sector, rawCohort.countryCode, rawCohort.marketScale) : null;
  const verifiedAggregate = cohort?.qualified === true && coverage !== null && coverage.observedCount >= 2;
  return {
    avgComposite: aggregate && !verifiedAggregate ? null : measuredComposite(data.avgComposite),
    topQuartile: aggregate && !verifiedAggregate ? null : measuredComposite(data.topQuartile),
    coverage,
    cohort,
    basis: !aggregate ? "DECLARED" : !cohort ? "UNVERIFIED_AGGREGATE" : !cohort.qualified ? "UNQUALIFIED_COHORT" : verifiedAggregate ? "AGGREGATED" : "INSUFFICIENT_MEASUREMENTS",
  };
}

export function sectorBenchmarkExcerpt(value: unknown, aggregate: boolean): string {
  const data = measurementRecord(value);
  const projection = readSectorMeasurements(data, aggregate);
  if (projection.basis === "UNVERIFIED_AGGREGATE") {
    return "Agrégat historique à recalculer ; cohorte canonique non établie.";
  }
  if (projection.basis === "UNQUALIFIED_COHORT") {
    return "Repère indisponible : secteur, pays ou échelle de marché non renseigné.";
  }
  const coverage = projection.coverage;
  const label = projection.basis === "DECLARED" ? "Score moyen déclaré" : "Score moyen";
  return `${label}: ${projection.avgComposite ?? "non mesuré"}/200. Top quartile: ${projection.topQuartile ?? "non mesuré"}/200.`
    + (projection.cohort ? ` Cohorte : ${projection.cohort.sector}, ${projection.cohort.countryCode}, ${projection.cohort.marketScale}.` : "")
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
