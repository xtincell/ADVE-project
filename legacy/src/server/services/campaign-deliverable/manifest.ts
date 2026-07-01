/**
 * Manifest — campaign-deliverable (Phase 18, ADR-0059).
 *
 * 4 capabilities CRUD + RAG override pour `CampaignDeliverable` matrice 6D
 * gouvernées par MESTOR.
 *
 * Manual-first parity (ADR-0060) : 4 routes tRPC `campaignDeliverable.*`
 * consommables depuis `<CampaignDeliverableForm />` UI standalone.
 * Le wizard d'import RAMADAN.xlsx (portfolio-bulk-import J5) appelle ces
 * mêmes endpoints en boucle (193 deliverables × 1 batch upload).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

const HandlerResult = z.object({
  status: z.enum(["OK", "FAILED", "VETOED"]),
  summary: z.string(),
  tool: z.string(),
  output: z.unknown(),
  reason: z.string().optional(),
  estimatedCost: z.object({
    amount: z.number().nonnegative(),
    currency: z.string(),
  }),
});

export const manifest = defineManifest({
  service: "campaign-deliverable",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE",
    "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE",
    "OPERATOR_DELETE_CAMPAIGN_DELIVERABLE",
    "OPERATOR_OVERRIDE_RAG",
  ],
  emits: [],
  capabilities: [
    {
      name: "createCampaignDeliverableHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_CAMPAIGN_DELIVERABLE"),
        operatorId: StringId,
        campaignId: StringId,
        targetNodeId: StringId,
        deliverableType: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Crée 1 livrable matrice 6D (SKU × pays × format × langue × promo). Sans cette capability, la granularité de production révélée par RAMADAN.xlsx (193 livrables saisonniers) n'est pas modélisable.",
    },
    {
      name: "updateCampaignDeliverableHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE"),
        operatorId: StringId,
        deliverableId: StringId,
        patches: z.record(z.string(), z.unknown()),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Modification status / dueDate / brandAssetId / delegatedToOperatorId d'un deliverable. Auto-recompute RAG sauf manualRagOverride non-null.",
    },
    {
      name: "deleteCampaignDeliverableHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_DELETE_CAMPAIGN_DELIVERABLE"),
        operatorId: StringId,
        deliverableId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Hard delete d'un deliverable non-matérialisé. Les deliverables avec brandAssetId non-null doivent être archivés via la cascade BrandAsset standard, pas supprimés direct.",
    },
    {
      name: "overrideRagHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_OVERRIDE_RAG"),
        operatorId: StringId,
        ragOverride: z.enum(["GREEN", "AMBER", "RED"]).nullable(),
        reason: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Override manuel du RAG par opérateur sur Campaign ou CampaignDeliverable (computeRAG ignoré). Audit trail Mestor obligatoire avec raison.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "CRUD CampaignDeliverable matrice 6D + RAG override. 4 Intents Mestor. Cf. ADR-0059 §8.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Sans CampaignDeliverable, la granularité production agence (193 livrables Ramadan distincts SKU × pays × format) n'est pas trackable. Le dashboard agence cross-clients Afrique reste vide de données opérationnelles utilisables.",
  missionStep: 4,
});
