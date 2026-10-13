/** Existing ADR-0146 ingress contract, shared by HTTP and governed admission. */
import { z } from "zod";

export const MetricCell = z.object({
  stage: z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]).nullish(),
  metric: z.string().min(1).max(120),
  value: z.number().finite(),
  target: z.number().finite().nullish(),
  kpiActivityId: z.string().min(1).max(60).nullish(),
}).strict();

export const IngestSchema = z.object({
  strategyId: z.string().min(1).max(60),
  sourceType: z.enum(["QUIZ", "APP", "CRM", "EMAIL", "FIELD", "WEBHOOK", "MANUAL"]),
  sourceLabel: z.string().max(120).nullish(),
  campaignId: z.string().min(1).max(60).nullish(),
  missionId: z.string().min(1).max(60).nullish(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullish(),
  observationId: z.string().min(1).max(200).optional(),
  sourceVersion: z.string().min(1).max(120).optional(),
  observedAt: z.iso.datetime({ offset: true }).optional(),
  metrics: z.array(MetricCell).min(1).max(200),
}).strict().superRefine((value, ctx) => {
  const present = [value.observationId, value.sourceVersion, value.observedAt].filter((v) => v !== undefined).length;
  if (present !== 0 && present !== 3) {
    ctx.addIssue({ code: "custom", path: ["observationId"], message: "observationId, sourceVersion et observedAt sont requis ensemble." });
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

/** Observation time is never inferred from delivery time for a legacy payload. */
export function metricObservationTime(data: unknown): Date | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>).observedAt;
  if (typeof value !== "string" || !z.iso.datetime({ offset: true }).safeParse(value).success) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
