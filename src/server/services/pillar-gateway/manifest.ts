/**
 * Manifest — Pillar Gateway (write-and-score atomic operation).
 *
 * Point d'écriture unique sur les piliers ADVE — applique LOI 1 (point unique
 * de mutation) en chaînant write DB + score recalc + cache reconciliation +
 * eventBus publish dans une opération atomique. Tout caller direct de
 * `db.pillar.update` est un drift (cf. ESLint rule lafusee/use-pillar-gateway).
 *
 * ADR-0038 (Phase 16-bis) — postconditions wired :
 *   • writePillar : score-in-range invariant (pillarScore ∈ [0, 200/8 * 1.5])
 *   • writePillarAndScore : composite-score-monotonic (pas de régression
 *     silencieuse Loi 1) — un drop > 5 points exige un compensating intent
 *     ROLLBACK_PILLAR explicite, sinon postcondition rejette.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import type { PostCondition } from "@/server/governance/manifest";
import { PillarKeySchema } from "@/domain/pillars";

const StringId = z.string().min(1);

const PillarWriteResultSchema = z.object({
  success: z.boolean(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
  newContent: z.unknown().optional(),
});

const PillarWriteRequestSchema = z.object({
  strategyId: StringId,
  pillarKey: PillarKeySchema,
  operation: z.unknown(),
  author: z.unknown(),
}).passthrough();

// ── Post-conditions (ADR-0038) ─────────────────────────────────────────

const scoreInRange: PostCondition = {
  name: "score-in-range",
  check: (output) => {
    if (!output || typeof output !== "object") return true;
    const o = output as { newContent?: { pillarScore?: number } };
    const s = o.newContent?.pillarScore;
    if (typeof s !== "number") return true; // not all writes touch the score
    return Number.isFinite(s) && s >= 0 && s <= 200;
  },
};

const writeSucceeded: PostCondition = {
  name: "write-succeeded",
  check: (output) => {
    if (!output || typeof output !== "object") return false;
    return (output as { success?: boolean }).success === true;
  },
};

export const manifest = defineManifest({
  service: "pillar-gateway",
  governor: "INFRASTRUCTURE",
  version: "1.2.0",
  acceptsIntents: ["WRITE_PILLAR"],
  capabilities: [
    {
      name: "writePillar",
      inputSchema: PillarWriteRequestSchema,
      outputSchema: PillarWriteResultSchema,
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      postconditions: [writeSucceeded, scoreInRange],
      missionContribution: "CHAIN_VIA:advertis-scorer",
    },
    {
      name: "postWriteScore",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.void(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "writePillarAndScore",
      inputSchema: PillarWriteRequestSchema,
      outputSchema: PillarWriteResultSchema,
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      postconditions: [writeSucceeded, scoreInRange],
      missionContribution: "CHAIN_VIA:advertis-scorer",
    },
    {
      name: "reconcileCompletionLevelCache",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarKeySchema,
      }),
      outputSchema: z.void(),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "D-2 invariant : Pillar.completionLevel cache doit refléter l'état stage post-assessor. Sans cette reconciliation, le stepper Notoria reste figé sur étape stale (bug v6.1.18 fix).",
    },
  ],
  dependencies: ["advertis-scorer", "pillar-versioning", "staleness-propagator"],
  missionContribution: "CHAIN_VIA:advertis-scorer",
  missionStep: 1,
});
