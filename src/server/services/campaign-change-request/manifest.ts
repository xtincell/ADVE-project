/**
 * Manifest — campaign-change-request (Phase 18-A1-β, audit MATANGA V4 sheet TICKETS MODIFS).
 *
 * 4 capabilities CRUD + workflow escalation pour `CampaignChangeRequest` (tickets de
 * modif client) gouvernées par MESTOR.
 *
 * Impact qualifié par l'opérateur ; arbitrage enregistré localement.
 * Aucun message externe ni validation/livraison automatique (ADR-0202).
 *
 * Manual-first parity (ADR-0060) : routes tRPC `campaignChangeRequest.*`
 * consommables depuis `<CampaignChangeRequestForm />` UI standalone.
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
  service: "campaign-change-request",
  governor: "MESTOR",
  version: "1.0.1",
  acceptsIntents: [
    "OPERATOR_CREATE_CHANGE_REQUEST",
    "OPERATOR_UPDATE_CHANGE_REQUEST",
    "OPERATOR_RESOLVE_CHANGE_REQUEST",
    "OPERATOR_ESCALATE_CHANGE_REQUEST",
  ],
  emits: [],
  capabilities: [
    {
      name: "createChangeRequestHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_CHANGE_REQUEST"),
        operatorId: StringId,
        strategyId: StringId,
        campaignDeliverableId: StringId,
        requestId: z.string().uuid().optional(),
        requestedByName: z.string().trim().min(1),
        description: z.string().trim().min(1),
        impact: z.enum(["COSMETIC", "MINOR", "MAJOR", "OUT_OF_SCOPE"]),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Conserve le besoin de reprise, sa tâche et son reçu avant production. La même identité explicite retrouve son reçu ; sans identité, les demandes restent distinctes.",
    },
    {
      name: "updateChangeRequestHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_UPDATE_CHANGE_REQUEST"),
        operatorId: StringId,
        strategyId: StringId,
        ticketId: StringId,
        patches: z.record(z.string(), z.unknown()),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Modification status / assignation / resolutionNotes pendant le workflow. Auto-stamp resolvedAt si status devient RESOLVED.",
    },
    {
      name: "resolveChangeRequestHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_RESOLVE_CHANGE_REQUEST"),
        operatorId: StringId,
        strategyId: StringId,
        ticketId: StringId,
        resolutionNotes: z.string().min(1),
        newBriefVersionId: StringId.nullable().optional(),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Marque le ticket comme RESOLVED + notes obligatoires. Lien optionnel vers nouveau CampaignBrief.version créé pour la modif.",
    },
    {
      name: "escalateChangeRequestHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_ESCALATE_CHANGE_REQUEST"),
        operatorId: StringId,
        strategyId: StringId,
        ticketId: StringId,
        escalationNotes: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Enregistre un arbitrage motivé et son état ESCALATED ; aucun message externe. Un reçu terminal n'est pas rouvert.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "CRUD CampaignChangeRequest + workflow escalation. 4 Intents Mestor. Cf. ADR-0059 §audit MATANGA V4 sheet TICKETS MODIFS.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "La traçabilité des reprises relie besoin, tâche et décision à la production sans réécrire les reçus terminaux ni dépendre d'un agent.",
  missionStep: 4,
});
