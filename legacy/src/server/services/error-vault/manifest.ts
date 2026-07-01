/**
 * Manifest — error-vault (collecteur d'erreurs runtime centralisé, Phase 11).
 *
 * Capture serveur + client + Prisma + NSP + Ptah + stress-test + cron + webhook
 * avec déduplication par signature sha256 (window 1h). Triage admin via
 * /console/governance/error-vault.
 *
 * Sous tutelle SESHAT (observation runtime des erreurs comme weak signals système).
 * Cf. ADR-0013, EXPERT-PROTOCOL.md.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

const ErrorSourceEnum = z.enum([
  "SERVER",
  "CLIENT",
  "PRISMA",
  "NSP",
  "PTAH",
  "CRON",
  "WEBHOOK",
  "STRESS_TEST",
  "TRPC",
]);

const ErrorSeverityEnum = z.enum(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]);

const CaptureInput = z.object({
  source: ErrorSourceEnum,
  severity: ErrorSeverityEnum.optional(),
  code: z.string().optional(),
  message: z.string(),
  stack: z.string().optional(),
  route: z.string().optional(),
  userId: z.string().optional(),
  operatorId: z.string().optional(),
  strategyId: z.string().optional(),
  campaignId: z.string().optional(),
  intentId: z.string().optional(),
  trpcProcedure: z.string().optional(),
  componentPath: z.string().optional(),
  userAgent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const manifest = defineManifest({
  service: "error-vault",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "capture",
      inputSchema: CaptureInput,
      outputSchema: z.string().nullable(),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Sans collecteur d'erreurs runtime centralisé, les bugs Ptah/NSP/cron/Prisma passent silencieusement et dégradent la trajectoire APOGEE sans signal d'auto-correction. La déduplication par signature évite la noyade et permet le triage admin.",
    },
    {
      name: "captureError",
      inputSchema: z.object({
        error: z.unknown(),
        source: ErrorSourceEnum,
        context: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: z.string().nullable(),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Wrapper typesafe pour capturer un Error/unknown depuis n'importe quel try/catch sans avoir à reconstruire le payload CaptureInput.",
    },
    {
      name: "markResolved",
      inputSchema: z.object({
        errorId: StringId,
        resolvedById: StringId,
        resolution: z.string().optional(),
      }),
      outputSchema: z.object({ id: StringId, resolvedAt: z.date() }),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Triage admin nécessite une action explicite de résolution pour distinguer les erreurs traitées des oubliées. Sans markResolved, le vault devient un cimetière.",
    },
    {
      name: "batchMarkResolved",
      inputSchema: z.object({
        errorIds: z.array(StringId).min(1),
        resolvedById: StringId,
        resolution: z.string().optional(),
      }),
      outputSchema: z.object({ count: z.number().int().nonnegative() }),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Batch resolve pour clusters d'erreurs (même signature × N occurrences) — sans cela le triage admin devient O(N) et inutilisable sur les vagues d'erreurs.",
    },
    {
      name: "getStats",
      inputSchema: z.object({
        operatorId: z.string().optional(),
        sinceHours: z.number().int().positive().optional(),
      }),
      outputSchema: z.object({
        total: z.number().int().nonnegative(),
        bySource: z.record(z.string(), z.number()),
        bySeverity: z.record(z.string(), z.number()),
        unresolved: z.number().int().nonnegative(),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Stats agrégées pour dashboard admin et alerting — sans cela impossible de voir si un déploiement déclenche une régression.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Collecteur runtime errors (Phase 11). Dédup signature sha256 + triage admin /console/governance/error-vault. Best-effort capture (ne throw jamais pour éviter récursion infinie).",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "L'OS ne peut pas s'auto-corriger sans visibilité sur ses erreurs runtime ; sans error-vault, les bugs production-only restent invisibles et la trajectoire APOGEE dérive sans signal.",
  missionStep: 4,
});
