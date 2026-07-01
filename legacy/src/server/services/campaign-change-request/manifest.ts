/**
 * Manifest — campaign-change-request (Phase 18-A1-β, audit MATANGA V4 sheet TICKETS MODIFS).
 *
 * 4 capabilities CRUD + workflow escalation pour `CampaignChangeRequest` (tickets de
 * modif client) gouvernées par MESTOR.
 *
 * Workflow décisionnel V4 (sheet PROTOCOLE ABSENCE) :
 * - COSMETIC → traiter directement (pas de ticket nécessaire)
 * - MINOR → ticket + traiter si direction claire
 * - MAJOR → ticket + STOP production + escalade Slack Alex+Nelson
 * - OUT_OF_SCOPE → REJETÉ + redirection Nelson
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
  version: "1.0.0",
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
        campaignDeliverableId: StringId,
        requestedByName: z.string().min(1),
        description: z.string().min(1),
        impact: z.enum(["COSMETIC", "MINOR", "MAJOR", "OUT_OF_SCOPE"]),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans tracking des change requests client, le workflow PROTOCOLE ABSENCE V4 (cosmétique → mineur → majeur → escalade) reste tribal et perd l'audit. Indispensable pour réagir aux 10-30 modifs/mois en flow normal Matanga.",
    },
    {
      name: "updateChangeRequestHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_UPDATE_CHANGE_REQUEST"),
        operatorId: StringId,
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
        ticketId: StringId,
        escalationNotes: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Workflow MAJOR : STOP production + escalade Slack. Status passe à ESCALATED, audit trail Mestor obligatoire.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "CRUD CampaignChangeRequest + workflow escalation. 4 Intents Mestor. Cf. ADR-0059 §audit MATANGA V4 sheet TICKETS MODIFS.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Sans tracking des change requests, l'agence perd la traçabilité des modifs client (10-30/mois en flow normal Matanga). Le workflow PROTOCOLE ABSENCE V4 (cosmétique → escalade Slack) devient tribal sans ce model.",
  missionStep: 4,
});
