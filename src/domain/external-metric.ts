/**
 * ADR-0146 ingress contract for external metrics and observations, shared by HTTP and governed admission.
 */
import { z } from "zod";

const ObservationTime = z.iso.datetime({ offset: true });

/** Provenance of one cell. All optional: absent keys keep a legacy receipt's hash. */
const CellProvenance = {
  /** Source that produced the value inside the producer (e.g. one collector). */
  source: z.string().min(1).max(120).optional(),
  /** Observed object: URL, keyword, account… */
  subject: z.string().min(1).max(1000).optional(),
  unit: z.string().min(1).max(40).optional(),
  /** Observation time of this cell, distinct from the receipt and from delivery. */
  observedAt: ObservationTime.optional(),
  note: z.string().min(1).max(1000).optional(),
};

export const MetricCell = z.object({
  stage: z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]).nullish(),
  metric: z.string().min(1).max(120),
  value: z.number().finite(),
  target: z.number().finite().nullish(),
  kpiActivityId: z.string().min(1).max(60).nullish(),
  ...CellProvenance,
}).strict();

/**
 * A declared measure without a value (ADR-0146 amendment, 2026-11-11). It is kept
 * as provenance only: never written to AARRR/KPI, never read as zero.
 */
export const UnobservedCell = z.object({
  metric: z.string().min(1).max(120),
  /** NOT_PUBLISHED: source answered without this value. FAILED: source failed. */
  state: z.enum(["NOT_PUBLISHED", "FAILED", "NOT_REQUESTED"]),
  errorCode: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).optional(),
  ...CellProvenance,
}).strict();

export const EXTERNAL_METRIC_SOURCE_TYPES = ["QUIZ", "APP", "CRM", "EMAIL", "FIELD", "WEBHOOK", "MANUAL", "COLLECTOR"] as const;

export const IngestSchema = z.object({
  strategyId: z.string().min(1).max(60),
  /** COLLECTOR: public-indicator collector receipt deposited by an operator (DataCollector). */
  sourceType: z.enum(EXTERNAL_METRIC_SOURCE_TYPES),
  sourceLabel: z.string().max(120).nullish(),
  campaignId: z.string().min(1).max(60).nullish(),
  missionId: z.string().min(1).max(60).nullish(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullish(),
  observationId: z.string().min(1).max(200).optional(),
  sourceVersion: z.string().min(1).max(120).optional(),
  observedAt: ObservationTime.optional(),
  /** Producer's own SHA-256 of its canonical content, verified before admission when its format is known. */
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  metrics: z.array(MetricCell).max(200),
  unobserved: z.array(UnobservedCell).max(200).optional(),
}).strict().superRefine((value, ctx) => {
  const present = [value.observationId, value.sourceVersion, value.observedAt].filter((v) => v !== undefined).length;
  if (present !== 0 && present !== 3) {
    ctx.addIssue({ code: "custom", path: ["observationId"], message: "observationId, sourceVersion et observedAt sont requis ensemble." });
  }
  if (value.sourceDigest !== undefined && present !== 3) {
    ctx.addIssue({ code: "custom", path: ["sourceDigest"], message: "Une empreinte de source exige une observation identifiée." });
  }
  if (value.metrics.length + (value.unobserved?.length ?? 0) === 0) {
    ctx.addIssue({ code: "custom", path: ["metrics"], message: "Au moins une mesure, ou une mesure déclarée sans valeur." });
  }
  const routes = new Set<string>();
  for (const [i, cell] of value.metrics.entries()) {
    // Two values for one destination in one snapshot have no unambiguous order.
    const destinations = [
      cell.stage ? `aarr:${cell.stage}:${cell.metric}` : null,
      cell.kpiActivityId ? `kpi:${cell.kpiActivityId}` : null,
    ].filter((key): key is string => key !== null);
    for (const key of destinations) {
      if (routes.has(key)) ctx.addIssue({ code: "custom", path: ["metrics", i], message: "Destination de mesure dupliquée dans cette observation." });
      routes.add(key);
    }
  }
});
export type IngestPayload = z.infer<typeof IngestSchema>;
export type UnobservedMetric = z.infer<typeof UnobservedCell>;

/** Observation time is never inferred from delivery time for a legacy payload. */
export function metricObservationTime(data: unknown): Date | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>).observedAt;
  if (typeof value !== "string" || !z.iso.datetime({ offset: true }).safeParse(value).success) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
