/**
 * Manifest — Ptah (Forge — matérialisation des briefs Artemis).
 *
 * 5ème Neter actif (ADR-0009). Sous-système APOGEE = Propulsion (downstream
 * Artemis). Cascade : Mestor → Artemis brief → Ptah forge → Seshat observe → Thot facture.
 *
 * Cf. PANTHEON.md §2.5, MANIPULATION-MATRIX.md.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { PILLAR_KEYS } from "@/domain/pillars";
import { FORGE_KINDS, MANIPULATION_MODES, PROVIDER_NAMES } from "./types";

const ForgeSpecSchema = z.object({
  kind: z.enum(FORGE_KINDS as readonly [string, ...string[]]),
  providerHint: z.enum(PROVIDER_NAMES as readonly [string, ...string[]]).optional(),
  modelHint: z.string().optional(),
  parameters: z.record(z.unknown()),
});

const ForgeBriefSchema = z.object({
  briefText: z.string().min(1),
  forgeSpec: ForgeSpecSchema,
  pillarSource: z.enum(PILLAR_KEYS as readonly [string, ...string[]]),
  manipulationMode: z.enum(MANIPULATION_MODES as readonly [string, ...string[]]),
});

export const manifest = defineManifest({
  service: "ptah",
  // Mestor reste dispatcher unique. BRAINS const inclut "PTAH" pour
  // d'éventuels sub-services Ptah auto-gouvernés futurs.
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "PTAH_MATERIALIZE_BRIEF",
    "PTAH_RECONCILE_TASK",
    "PTAH_REGENERATE_FADING_ASSET",
  ],
  emits: [
    "ASSET_FORGED",
    "ASSET_REFINED",
    "ASSET_CLASSIFIED",
    "FORGE_TASK_FAILED",
  ],
  capabilities: [
    {
      name: "materializeBrief",
      inputSchema: z.object({
        strategyId: z.string(),
        sourceIntentId: z.string(),
        brief: ForgeBriefSchema,
        overrideMixViolation: z.boolean().optional(),
      }),
      outputSchema: z.object({
        taskId: z.string(),
        provider: z.string(),
        providerModel: z.string(),
        estimatedCostUsd: z.number(),
        status: z.enum(["CREATED", "IN_PROGRESS"]),
      }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 5000,
      // Phase B : RTIS_CASCADE suffit. Phase C raffinement (BRAND_KIT_LOCKED).
      preconditions: ["RTIS_CASCADE"],
      idempotent: false,
    },
    {
      name: "reconcileTask",
      inputSchema: z.object({
        taskId: z.string(),
        webhookPayload: z.unknown().optional(),
      }),
      outputSchema: z.object({
        assetVersionIds: z.array(z.string()),
        realisedCostUsd: z.number(),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 30000,
      idempotent: true,
    },
    {
      name: "regenerateFadingAsset",
      inputSchema: z.object({
        strategyId: z.string(),
        assetVersionId: z.string(),
      }),
      outputSchema: z.object({ taskId: z.string() }),
      sideEffects: ["DB_WRITE", "EXTERNAL_API"],
      qualityTier: "A",
      latencyBudgetMs: 10000,
      preconditions: ["RTIS_CASCADE"],
      idempotent: false,
    },
  ],
  dependencies: [
    "ai-cost-tracker",
    "financial-brain",
    "oauth-integrations",
    "artemis",
  ],
  docs: {
    summary:
      "Forge des assets matériels (image/vidéo/audio/icône/design/stock/refine/transform/classify) via 4 providers externes : Magnific, Adobe Firefly Services, Figma, Canva. Downstream d'Artemis dans la cascade Glory→Brief→Forge.",
  },
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 2,
});
