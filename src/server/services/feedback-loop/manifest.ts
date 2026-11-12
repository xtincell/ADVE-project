/**
 * Manifest — Feedback Loop (mission outcomes → tier evolution + Tarsis seed).
 *
 * Boucle de feedback qui transforme observations terrain (signals, metrics
 * sociales, media performance, press clippings) en signaux Tarsis exploitables
 * et tier evolution. Détecte le strategy drift et recalibre les piliers quand
 * les outcomes divergent du modèle.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { PillarKeySchema, PillarStorageKeySchema } from "@/domain/pillars";

const StringId = z.string().min(1);

const FeedbackAlertSchema = z.object({
  signalId: StringId,
  strategyId: StringId,
  pillar: PillarStorageKeySchema,
  previousScore: z.number(),
  currentScore: z.number(),
  driftPercent: z.number(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  diagnostic: z.null(),
  prescriptionId: z.null(),
});

const FeedbackThresholdsSchema = z.object({
  socialEngagementMin: z.number().optional(),
  mediaImpressionMin: z.number().optional(),
  pressClippingMin: z.number().optional(),
}).passthrough();

export const manifest = defineManifest({
  service: "feedback-loop",
  governor: "SESHAT",
  version: "1.2.0",
  acceptsIntents: [],
  emits: ["TIER_EVALUATION_REQUESTED", "TARSIS_SIGNAL_DETECTED"],
  capabilities: [
    {
      name: "processSignal",
      inputSchema: z.object({ signalId: StringId }),
      outputSchema: z.array(FeedbackAlertSchema),
      sideEffects: ["DB_READ", "DB_WRITE", "EVENT_EMIT"],
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "recalibrate",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarKeySchema,
      }),
      outputSchema: z.void(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "detectStrategyDrift",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarStorageKeySchema,
      }),
      outputSchema: z.object({
        status: z.enum(["COMPARABLE", "INSUFFICIENT_DATA", "ZERO_BASELINE"]),
        driftPercent: z.number().nullable(),
        current: z.number().nullable(),
        previous: z.number().nullable(),
        baselineId: z.string().nullable(),
        baselineAt: z.date().nullable(),
      }),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "processSocialMetrics",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.number().int().nonnegative(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "processMediaPerformance",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.number().int().nonnegative(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "processPressClippings",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.number().int().nonnegative(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "getThresholds",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: FeedbackThresholdsSchema,
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Thresholds par strategy pilotent les détections de drift — sans config exposée, l'opérateur ne peut pas ajuster la sensibilité.",
    },
  ],
  dependencies: ["seshat"],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
