/**
 * Manifest — Artemis (protocol + execution + GLORY tools + diagnostic frameworks).
 *
 * Thrust controller : reçoit un plan de Mestor, exécute les frameworks de
 * diagnostic ADVERTIS, déclenche les Glory tools en topologie séquentielle,
 * persiste l'historique de diagnostic pour différentiation temporelle.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { PillarKeySchema } from "@/domain/pillars";

const StringId = z.string().min(1);

const FrameworkExecutionResult = z.object({
  success: z.boolean(),
  outputs: z.array(z.unknown()),
  costUsd: z.number().optional(),
}).passthrough();

const DiagnosticResultSchema = z.object({
  pillarKey: PillarKeySchema,
  score: z.number(),
  findings: z.array(z.string()),
}).passthrough();

export const manifest = defineManifest({
  service: "artemis",
  governor: "ARTEMIS",
  version: "2.0.0",
  // Phase 17 (ADR-0039) — Sequence devient l'unité publique unique d'Artemis.
  // `EXECUTE_FRAMEWORK` retiré ; appels framework legacy passent par
  // `wrapFrameworkAsSequence` + `EXECUTE_GLORY_SEQUENCE` avec sequenceKey
  // `WRAP-FW-<slug>`.
  acceptsIntents: ["EXECUTE_GLORY_SEQUENCE"],
  emits: ["INTENT_PROGRESS", "GLORY_TOOL_INVOKED"],
  capabilities: [
    {
      name: "execute",
      inputSchema: z.object({
        intentId: StringId,
        plan: z.array(z.object({ tool: z.string(), inputs: z.unknown() })),
      }).passthrough(),
      outputSchema: FrameworkExecutionResult,
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      qualityTier: "S",
      latencyBudgetMs: 60000,
      missionContribution: "CHAIN_VIA:notoria",
    },
    {
      name: "executeFramework",
      inputSchema: z.object({
        strategyId: StringId,
        frameworkSlug: z.string().min(1),
        inputs: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: FrameworkExecutionResult,
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      qualityTier: "S",
      latencyBudgetMs: 45000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composant interne d'une sequence — wrappé via WRAP-FW-* quand appelé isolément. Pas d'API publique (ADR-0039).",
      internal: true,
    },
    {
      name: "topologicalSort",
      inputSchema: z.object({
        slugs: z.array(z.string().min(1)).min(1),
      }),
      outputSchema: z.array(z.string()),
      sideEffects: [],
      idempotent: true,
      latencyBudgetMs: 100,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Tri topologique des frameworks par dépendances — garantit l'ordre d'exécution correct sans réinvention par chaque caller.",
    },
    {
      name: "runDiagnosticBatch",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKeys: z.array(PillarKeySchema).min(1),
      }),
      outputSchema: z.object({
        results: z.array(DiagnosticResultSchema),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      qualityTier: "A",
      latencyBudgetMs: 90000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Helper interne — exécute une batterie de frameworks via leur wrap WRAP-FW-*. Pas d'API publique (ADR-0039).",
      internal: true,
    },
    {
      name: "runPillarDiagnostic",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarKeySchema,
      }),
      outputSchema: DiagnosticResultSchema,
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      qualityTier: "A",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Helper interne — exécute tous les frameworks d'un pilier via leurs wraps. Pas d'API publique (ADR-0039).",
      internal: true,
    },
    {
      name: "getDiagnosticHistory",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.array(z.object({
        executedAt: z.date(),
        pillarKey: PillarKeySchema,
        score: z.number(),
      }).passthrough()),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Historique requis pour différentiation temporelle (differentialDiagnosis) et UI cockpit qui montre l'évolution des scores par pilier.",
    },
    {
      name: "differentialDiagnosis",
      inputSchema: z.object({
        strategyId: StringId,
        fromDate: z.date(),
        toDate: z.date(),
      }),
      outputSchema: z.object({
        deltas: z.array(z.object({
          pillarKey: PillarKeySchema,
          scoreDelta: z.number(),
          driftDirection: z.enum(["UP", "DOWN", "STABLE"]),
        })),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "triggerNextStageSequences",
      inputSchema: z.object({
        strategyId: StringId,
        currentStage: z.string(),
      }),
      outputSchema: z.object({
        triggeredSequences: z.array(z.string()),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "CHAIN_VIA:mestor",
    },
  ],
  dependencies: ["llm-gateway", "glory-tools", "advertis-scorer"],
  docs: {
    summary:
      "Receives a plan from Mestor and executes it through frameworks / GLORY tools, streaming progress events along the way. Maintains diagnostic history for temporal differentiation.",
  },
  missionContribution: "CHAIN_VIA:notoria",
  missionStep: 2,
});
