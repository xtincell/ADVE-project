/**
 * PTAH MCP Server — Neter de la Forge (Phase 9 résidu 5).
 *
 * Expose les 3 intents Ptah aux agents externes (autres LLMs / orchestrateurs)
 * en passant **systématiquement** par `mestor.emitIntent()` — zéro bypass
 * governance. Toutes les pre-conditions APOGEE (pillar source, manipulation
 * coherence, ROI gate Thot) s'appliquent.
 *
 * Cf. ADR-0009, PANTHEON.md §2.5, MANIPULATION-MATRIX.md.
 */

import { z } from "zod";
import { emitIntent } from "@/server/services/mestor/intents";
import { PILLAR_KEYS } from "@/domain/pillars";

export const serverName = "ptah";
export const serverDescription =
  "Serveur MCP PTAH — Neter de la Forge. Matérialise les briefs Artemis en assets concrets via les providers externes (Magnific/Adobe/Figma/Canva). Tous les calls passent par mestor.emitIntent — pas de bypass governance.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

const forgeKindEnum = z.enum([
  "image",
  "video",
  "audio",
  "icon",
  "refine",
  "transform",
  "classify",
  "stock",
  "design",
]);
const providerEnum = z.enum(["magnific", "adobe", "figma", "canva"]);
const pillarEnum = z.enum(PILLAR_KEYS);
const manipulationModeEnum = z.enum(["peddler", "dealer", "facilitator", "entertainer"]);

const materializeBriefSchema = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  sourceIntentId: z.string().describe("IntentEmission ID du INVOKE_GLORY_TOOL Artemis qui a produit ce brief — lineage hash-chain"),
  briefText: z.string(),
  forgeKind: forgeKindEnum,
  providerHint: providerEnum.optional(),
  modelHint: z.string().optional(),
  parameters: z.record(z.unknown()).default({}),
  pillarSource: pillarEnum.describe("Pilier ADVE/RTIS qui justifie cette forge — obligatoire (téléologie PANTHEON.md §2.5)"),
  manipulationMode: manipulationModeEnum.describe("Mode dans lequel l'asset transforme l'audience — doit être dans Strategy.manipulationMix"),
  overrideMixViolation: z.boolean().optional(),
});

const reconcileTaskSchema = z.object({
  strategyId: z.string(),
  taskId: z.string(),
  webhookPayload: z.unknown(),
});

const regenerateFadingAssetSchema = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  assetVersionId: z.string(),
});

export const tools: ToolDefinition[] = [
  {
    name: "ptah_materialize_brief",
    description:
      "Matérialise un ForgeBrief en asset concret via Ptah. Émet l'intent PTAH_MATERIALIZE_BRIEF par mestor.emitIntent — pre-flight pillar source + manipulation coherence + ROI gate Thot. Async : task créé synchrone, asset livré via webhook.",
    inputSchema: materializeBriefSchema,
    handler: async (input) => {
      const parsed = materializeBriefSchema.parse(input);
      return emitIntent(
        {
          kind: "PTAH_MATERIALIZE_BRIEF",
          strategyId: parsed.strategyId,
          operatorId: parsed.operatorId,
          sourceIntentId: parsed.sourceIntentId,
          brief: {
            briefText: parsed.briefText,
            forgeSpec: {
              kind: parsed.forgeKind,
              providerHint: parsed.providerHint,
              modelHint: parsed.modelHint,
              parameters: parsed.parameters,
            },
            pillarSource: parsed.pillarSource,
            manipulationMode: parsed.manipulationMode,
          },
          overrideMixViolation: parsed.overrideMixViolation,
        },
        { caller: "mcp:ptah" },
      );
    },
  },
  {
    name: "ptah_reconcile_task",
    description:
      "Réconcilie un GenerativeTask depuis un webhook provider — download URLs vers CDN, crée AssetVersion, track cost réalisé, emit ASSET_FORGED. Sync.",
    inputSchema: reconcileTaskSchema,
    handler: async (input) => {
      const parsed = reconcileTaskSchema.parse(input);
      return emitIntent(
        {
          kind: "PTAH_RECONCILE_TASK",
          strategyId: parsed.strategyId,
          taskId: parsed.taskId,
          webhookPayload: parsed.webhookPayload,
        },
        { caller: "mcp:ptah" },
      );
    },
  },
  {
    name: "ptah_regenerate_fading_asset",
    description:
      "Sentinel régime apogée (APOGEE Loi 4) — régénère un AssetVersion dont l'engagement a chuté >30% vs peak. Réservé aux brands ICONE.",
    inputSchema: regenerateFadingAssetSchema,
    handler: async (input) => {
      const parsed = regenerateFadingAssetSchema.parse(input);
      return emitIntent(
        {
          kind: "PTAH_REGENERATE_FADING_ASSET",
          strategyId: parsed.strategyId,
          operatorId: parsed.operatorId,
          assetVersionId: parsed.assetVersionId,
        },
        { caller: "mcp:ptah" },
      );
    },
  },
];
