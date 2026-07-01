/**
 * Manifest — brand-node (Phase 18, ADR-0059).
 *
 * 6 capabilities CRUD + structurelles pour BrandNode (arbre de marque
 * multi-archétype) gouvernées par MESTOR. Validation runtime
 * `NATURE_TRANSITION_VALIDITY` invoquée à chaque CREATE/MOVE pour refuser
 * les transitions absurdes (cf. BRAND_NATURE_ARCHETYPES const TS).
 *
 * Manual-first parity (ADR-0060) : les 6 Intents sont aussi exposés via
 * routes tRPC `brandNode.*` consommables depuis `<BrandNodeForm />` UI
 * standalone. Le LLM (wizard portfolio-bulk-import, brief-resolver) appelle
 * les mêmes endpoints qu'un opérateur humain.
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
  service: "brand-node",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "OPERATOR_CREATE_BRAND_NODE",
    "OPERATOR_UPDATE_BRAND_NODE",
    "OPERATOR_DELETE_BRAND_NODE",
    "OPERATOR_MOVE_BRAND_NODE",
    "OPERATOR_ATTACH_STRATEGY_TO_NODE",
    "OPERATOR_TAG_NODE_ROLE",
  ],
  emits: [],
  capabilities: [
    {
      name: "createBrandNodeHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_BRAND_NODE"),
        operatorId: StringId,
        clientId: StringId.nullable().optional(),
        parentNodeId: StringId.nullable().optional(),
        name: z.string().min(1),
        slug: z.string().min(1),
        nodeKind: z.string().min(1),
        nodeNature: z.enum([
          "PRODUCT", "SERVICE", "CHARACTER_IP", "FESTIVAL_IP", "MEDIA_IP",
          "RETAIL_SPACE", "PLATFORM", "INSTITUTION", "PERSONAL",
        ]),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Création d'un nœud de l'arbre de marque (BrandNode). Sans cette capability, impossible de modéliser une hiérarchie portefeuille FMCG (CORPORATE → MASTER_BRAND → ... → SKU). C'est la fondation Phase 18.",
    },
    {
      name: "updateBrandNodeHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_UPDATE_BRAND_NODE"),
        operatorId: StringId,
        nodeId: StringId,
        patches: z.record(z.string(), z.unknown()),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Modification non-structurelle d'un BrandNode (renommage, slug, clusterTag, lifecycle). nodeKind et nodeNature restent immutables (utiliser MOVE pour changer la position).",
    },
    {
      name: "deleteBrandNodeHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_DELETE_BRAND_NODE"),
        operatorId: StringId,
        nodeId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Soft-delete via archivedAt. Refusé si descendants ACTIVE non-archivés (intégrité Loi 1 APOGEE). Réversible.",
    },
    {
      name: "moveBrandNodeHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_MOVE_BRAND_NODE"),
        operatorId: StringId,
        nodeId: StringId,
        newParentNodeId: StringId.nullable(),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Re-parent un BrandNode dans l'arbre. Vérifie BRAND_NODE_NO_CYCLE + NATURE_TRANSITION_VALIDITY contre nouveau parent. Phase 18-A0 : intra-CORPORATE seulement (cross-CORPORATE = TRANSFER_NODE_OWNERSHIP Phase 18-bis).",
    },
    {
      name: "attachStrategyToNodeHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_ATTACH_STRATEGY_TO_NODE"),
        strategyId: StringId,
        operatorId: StringId,
        nodeId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Lie une Strategy existante à un BrandNode opérationnel (REGIONAL_BRAND ou SKU déployé). Permet aux campagnes/scoring/RAG existants de bénéficier de la hiérarchie sans migration.",
    },
    {
      name: "tagNodeRoleHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_TAG_NODE_ROLE"),
        operatorId: StringId,
        nodeId: StringId,
        action: z.enum(["ADD", "REMOVE"]),
        role: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Ajoute/retire un tag orthogonal dans nodeRole[] (SEASONAL, LIMITED_EDITION, LICENSED, JV_PARTNER, LOCAL_VARIANT, PROMO_<saison>_<année>). Granularité fine sans corrompre la cascade.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Brand Tree CRUD multi-archétype. 6 Intents Mestor + helper validateNodeTransition (BRAND_NATURE_ARCHETYPES). Validation runtime NATURE_TRANSITION_VALIDITY. Cf. ADR-0059.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Sans Brand Tree, la modélisation de portefeuilles multi-marques (FrieslandCampina = 6 master brands × 4 clusters × 15 pays × N gammes × N SKU) est impossible et l'OS reste cantonné à du mono-marque/mono-marché.",
  missionStep: 1,
});
