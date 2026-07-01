/**
 * Manifest — strategy-archive (2-phase soft archive + hard purge, ADR-0028).
 *
 * Phase 1 : Strategy.archivedAt = now (réversible, caché des queries default).
 * Phase 2 : DELETE row + BFS cascade sur 30+ tables enfants via information_schema
 *           FK discovery (irréversible, exige archive préalable anti-foot-gun).
 *
 * Sous tutelle MESTOR — les 3 mutations passent par Intent kinds gouvernés
 * (OPERATOR_ARCHIVE_STRATEGY, OPERATOR_RESTORE_STRATEGY, OPERATOR_PURGE_ARCHIVED_STRATEGY).
 * Refuse les Wakanda dummies (anti-foot-gun protection seed data).
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
  service: "strategy-archive",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "OPERATOR_ARCHIVE_STRATEGY",
    "OPERATOR_RESTORE_STRATEGY",
    "OPERATOR_PURGE_ARCHIVED_STRATEGY",
  ],
  emits: [],
  capabilities: [
    {
      name: "archiveStrategyHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_ARCHIVE_STRATEGY"),
        strategyId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans soft archive, les Strategies de tests/clients sortis polluent les requêtes opérateur ; la console devient illisible et bloque l'onboarding. Réversible = pas de risque d'erreur.",
    },
    {
      name: "restoreStrategyHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_RESTORE_STRATEGY"),
        strategyId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Réversibilité du soft archive : sans restore, l'archive devient une mort silencieuse — l'opérateur n'archive plus par peur. La possibilité de retour rend l'action sans risque.",
    },
    {
      name: "purgeArchivedStrategyHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_PURGE_ARCHIVED_STRATEGY"),
        strategyId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      latencyBudgetMs: 30000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Hard purge avec BFS cascade information_schema — sans cela, les Strategies abandonnées s'accumulent indéfiniment et la DB grossit sans bornes. Exige archive préalable (anti-foot-gun) pour éviter destruction accidentelle.",
    },
    {
      name: "listArchivedStrategies",
      inputSchema: z.object({
        operatorId: z.string().nullable().optional(),
      }),
      outputSchema: z.array(z.object({
        id: StringId,
        archivedAt: z.date(),
      }).passthrough()),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans liste des archives, impossible de purger ou restaurer en connaissance de cause — l'opérateur navigue à l'aveugle.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "2-phase soft archive (Strategy.archivedAt) + hard purge (BFS cascade information_schema FK discovery). 3 Intent kinds gouvernés MESTOR. Anti-foot-gun : purge exige archive préalable. Cf. ADR-0028.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Sans nettoyage Strategy lifecycle, la console se sature de Strategies tests/clients sortis ; la pipeline d'onboarding devient inutilisable et l'OS perd sa capacité opérationnelle.",
  missionStep: 4,
});
