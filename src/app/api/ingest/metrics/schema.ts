/**
 * Contrat d'entrée de l'ingestion de métriques externes (ADR-0146).
 *
 * Isolé de `route.ts` pour être testable sans tirer la chaîne d'auth
 * (NextAuth / next-server) dans le graphe du test.
 */
import { z } from "zod";

export const MetricCell = z.object({
  stage: z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]).nullish(),
  metric: z.string().min(1).max(120),
  value: z.number().finite(),
  target: z.number().finite().nullish(),
  kpiActivityId: z.string().min(1).max(60).nullish(),
});

export const IngestSchema = z.object({
  strategyId: z.string().min(1).max(60),
  sourceType: z.enum(["QUIZ", "APP", "CRM", "EMAIL", "FIELD", "WEBHOOK", "MANUAL"]),
  sourceLabel: z.string().max(120).nullish(),
  campaignId: z.string().min(1).max(60).nullish(),
  missionId: z.string().min(1).max(60).nullish(),
  period: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
  metrics: z.array(MetricCell).min(1).max(200),
});

export type IngestPayload = z.infer<typeof IngestSchema>;
