/**
 * Manifest — brand-vault (BrandAsset CRUD engine, Phase 10 ADR-0012).
 *
 * Vault unifié pour tous les actifs de marque (intellectuels + matériels).
 * State machine DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED
 * avec lineage hash-chain via IntentEmission.
 *
 * Sous tutelle MESTOR — toute mutation respecte LOI 1 (point unique de mutation
 * via Intent kinds CREATE_BRAND_ASSET / SELECT_BRAND_ASSET / SUPERSEDE_BRAND_ASSET
 * traités par mestor.commandant). Les capabilities listées ici sont les helpers
 * de bas niveau exposés aux handlers Mestor + Ptah pour matérialisation post-forge.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { PillarKeySchema } from "@/domain/pillars";

const StringId = z.string().min(1);

const PillarSourceEnum = PillarKeySchema;
const ManipulationModeEnum = z.enum(["peddler", "dealer", "facilitator", "entertainer"]);
const FamilyEnum = z.enum(["INTELLECTUAL", "MATERIAL", "HYBRID"]);

const CreateBrandAssetInput = z.object({
  strategyId: StringId,
  operatorId: StringId,
  name: z.string().min(1),
  kind: z.string().min(1),
  format: z.string().optional(),
  family: FamilyEnum.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  fileUrl: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  summary: z.string().optional(),
  pillarSource: PillarSourceEnum.optional(),
  manipulationMode: ManipulationModeEnum.optional(),
  state: z.string().optional(),
  sourceIntentId: z.string().optional(),
  sourceGloryOutputId: z.string().optional(),
  sourceAssetVersionId: z.string().optional(),
  sourceExecutionId: z.string().optional(),
  batchId: z.string().optional(),
  batchSize: z.number().int().positive().optional(),
  batchIndex: z.number().int().nonnegative().optional(),
  campaignId: z.string().optional(),
  briefId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const BrandAssetOutput = z.object({
  id: StringId,
  strategyId: StringId,
  kind: z.string(),
  state: z.string(),
}).passthrough();

export const manifest = defineManifest({
  service: "brand-vault",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "createBrandAsset",
      inputSchema: CreateBrandAssetInput,
      outputSchema: BrandAssetOutput,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "createCandidateBatch",
      inputSchema: z.object({
        strategyId: StringId,
        operatorId: StringId,
        kind: z.string().min(1),
        format: z.string().optional(),
        candidates: z.array(z.object({
          name: z.string().min(1),
          content: z.record(z.string(), z.unknown()).optional(),
          summary: z.string().optional(),
        })).min(1),
        pillarSource: PillarSourceEnum.optional(),
        manipulationMode: ManipulationModeEnum.optional(),
        sourceIntentId: z.string().optional(),
        sourceGloryOutputId: z.string().optional(),
        sourceExecutionId: z.string().optional(),
        campaignId: z.string().optional(),
        briefId: z.string().optional(),
      }),
      outputSchema: z.object({
        batchId: StringId,
        candidates: z.array(BrandAssetOutput),
      }),
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "selectFromBatch",
      inputSchema: z.object({
        batchId: StringId,
        selectedAssetId: StringId,
        selectedById: StringId,
        selectedReason: z.string().optional(),
        promoteToActive: z.boolean().optional(),
      }),
      outputSchema: BrandAssetOutput,
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      idempotent: false,
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "promoteToActive",
      inputSchema: z.object({
        brandAssetId: StringId,
        promotedById: StringId,
      }),
      outputSchema: BrandAssetOutput,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "supersede",
      inputSchema: z.object({
        previousAssetId: StringId,
        supersededById: StringId,
        reason: z.string().optional(),
      }),
      outputSchema: BrandAssetOutput,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "archive",
      inputSchema: z.object({
        brandAssetId: StringId,
        archivedById: StringId,
        reason: z.string().optional(),
      }),
      outputSchema: BrandAssetOutput,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "DIRECT_BOTH",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Vault unifié BrandAsset (Phase 10, ADR-0012). State machine + lineage hash-chain + batch selection + supersession pour actifs intellectuels et matériels.",
  },
  missionContribution: "DIRECT_BOTH",
  missionStep: 3,
});
