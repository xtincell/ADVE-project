/**
 * Manifest — operator-action (Phase 18-A1-γ, audit MATANGA V4 sheet ACTIONS).
 *
 * 4 capabilities CRUD + done toggle pour `OperatorAction` (sub-tâches transverses
 * jour-le-jour) gouvernées par MESTOR.
 *
 * Manual-first parity (ADR-0060) : routes tRPC `operatorAction.*` consommables
 * depuis `<OperatorActionForm />` UI standalone + UI "Actions du jour" dashboard.
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
  service: "operator-action",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "OPERATOR_CREATE_ACTION",
    "OPERATOR_UPDATE_ACTION",
    "OPERATOR_TOGGLE_ACTION_DONE",
    "OPERATOR_DELETE_ACTION",
  ],
  emits: [],
  capabilities: [
    {
      name: "createOperatorActionHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_ACTION"),
        operatorId: StringId,
        label: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans tracking des actions opérationnelles transverses (relances, prep avant départ, RH, production setup), l'agence perd la visibilité jour-le-jour. 19 rows actives V4 prouvent que c'est le quotidien Matanga.",
    },
    {
      name: "updateOperatorActionHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_UPDATE_ACTION"),
        operatorId: StringId,
        actionId: StringId,
        patches: z.record(z.string(), z.unknown()),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Modification label / context / priority / category / assignation / dueDate / deliverableIds.",
    },
    {
      name: "toggleActionDoneHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_TOGGLE_ACTION_DONE"),
        operatorId: StringId,
        actionId: StringId,
        done: z.boolean(),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Toggle FAIT/PAS FAIT (V4 colonne FAIT). Auto-stamp doneAt à la première mise à done=true.",
    },
    {
      name: "deleteOperatorActionHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_DELETE_ACTION"),
        operatorId: StringId,
        actionId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Hard delete d'une action (pas d'archive — les actions sont éphémères day-to-day).",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "CRUD OperatorAction (sub-tâches transverses) + toggle done. 4 Intents Mestor. Cf. ADR-0059 §audit MATANGA V4 sheet ACTIONS.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Sans tracking des 19+ actions opérationnelles transverses jour-le-jour (sheet ACTIONS V4), l'agence pilote sans visibilité sur ses TODOs cross-projets (relances client, briefs équipe, deadlines système, production setup).",
  missionStep: 4,
});
