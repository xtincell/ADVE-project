/**
 * Governance Router — admin surface for IntentEmission audit trail and
 * compensating intents (Tier 3.8 of the residual debt).
 *
 * Endpoints:
 *  - listIntents: query the audit trail with kind/status/strategy filters
 *  - compensate: emit a reverse intent for a completed reversible mutation
 *  - statsByKind: rolling 7-day stats grouped by kind
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../init";
import { auditedProcedure, governedProcedure } from "@/server/governance/governed-procedure";
import {
  buildCompensatingIntent,
  isReversible,
  IRREVERSIBLE_KINDS,
  COMPENSATING_MAP,
} from "@/server/governance/compensating-intents";

const auditedAdmin = auditedProcedure(adminProcedure, "governance");
/* lafusee:governance-router */

export const governanceRouter = createTRPCRouter({
  listIntents: adminProcedure
    .input(
      z.object({
        kind: z.string().optional(),
        status: z.enum(["PENDING", "EXECUTING", "OK", "VETOED", "DOWNGRADED", "FAILED"]).optional(),
        strategyId: z.string().optional(),
        sinceDays: z.number().int().min(1).max(90).default(7),
        limit: z.number().int().min(1).max(200).default(100),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);
      const where = {
        emittedAt: { gte: since },
        ...(input.kind ? { intentKind: input.kind } : {}),
        ...(input.strategyId ? { strategyId: input.strategyId } : {}),
        ...(input.status ? ({ status: input.status } as Record<string, unknown>) : {}),
      };
      const rows = await ctx.db.intentEmission.findMany({
        where,
        orderBy: { emittedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > input.limit;
      const items = (hasMore ? rows.slice(0, input.limit) : rows).map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          id: r.id,
          intentKind: r.intentKind,
          strategyId: r.strategyId,
          caller: r.caller,
          status: (rec.status as string) ?? "OK",
          emittedAt: r.emittedAt,
          completedAt: (rec.completedAt as Date | null) ?? null,
          payloadSummary: summarizePayload(r.payload),
          reversible: isReversible(r.intentKind),
          irreversible: IRREVERSIBLE_KINDS.has(r.intentKind),
          prevHash: (rec.prevHash as string | null) ?? null,
          selfHash: (rec.selfHash as string | null) ?? null,
        };
      });
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      };
    }),

  statsByKind: adminProcedure
    .input(z.object({ sinceDays: z.number().int().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);
      const grouped = await ctx.db.intentEmission.groupBy({
        by: ["intentKind"],
        where: { emittedAt: { gte: since } },
        _count: true,
      });
      return grouped
        .map((g) => ({
          kind: g.intentKind,
          count: g._count,
          reversible: isReversible(g.intentKind),
        }))
        .sort((a, b) => b.count - a.count);
    }),

  compensate: governedProcedure({
    kind: "CORRECT_INTENT",
    inputSchema: z.object({
      originalIntentId: z.string(),
      reason: z.string().min(3).max(500),
    }),
  }).mutation(async ({ ctx, input }) => {
    try {
      const built = await buildCompensatingIntent({
        originalIntentId: input.originalIntentId,
        reason: input.reason,
      });
      const reverseIntent = built.reverseIntent as Record<string, unknown>;
      const reverseStrategyId = typeof reverseIntent.strategyId === "string"
        ? reverseIntent.strategyId
        : "(none)";
      // Record the compensating action as a first-class IntentEmission row.
      // Downstream services subscribing to `intent.compensated` events will
      // perform the actual reversal (rollback DB writes, etc.).
      await ctx.db.intentEmission.create({
        data: {
          id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          intentKind: built.reverseKind,
          strategyId: reverseStrategyId,
          payload: {
            compensatedFrom: input.originalIntentId,
            originalKind: built.originalKind,
            reason: input.reason,
          } as never,
          caller: "console:governance:compensate",
          ...({ status: "OK" } as Record<string, unknown>),
        } as never,
      });
      return { ok: true, reverseKind: built.reverseKind, originalKind: built.originalKind };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to compensate intent",
      });
    }
  }),

  reversibleMap: adminProcedure.query(() => {
    return {
      compensating: COMPENSATING_MAP,
      irreversible: Array.from(IRREVERSIBLE_KINDS),
    };
  }),

  // ── ModelPolicy — governed `purpose → model` registry ─────────────────
  // Every read goes through the policy service (cached). The write path is
  // a `governedProcedure({ kind: "UPDATE_MODEL_POLICY" })` so each change
  // creates a hash-chained IntentEmission row. Artemis Commandant routes
  // the intent to model-policy.updatePolicy.
  modelPolicyList: adminProcedure.query(async () => {
    const { listAllPolicies } = await import("@/server/services/model-policy");
    return listAllPolicies();
  }),

  modelPolicyUpdate: governedProcedure({
    kind: "UPDATE_MODEL_POLICY",
    inputSchema: z.object({
      purpose: z.enum(["final-report", "agent", "intermediate", "intake-followup", "extraction"]),
      anthropicModel: z.string().min(1),
      ollamaModel: z.string().nullable(),
      allowOllamaSubstitution: z.boolean(),
      pipelineVersion: z.enum(["V1", "V2", "V3"]).optional(),
      notes: z.string().nullable().optional(),
    }),
  }).mutation(async ({ ctx, input }) => {
    // governedProcedure already created the IntentEmission row + ran
    // pre-conditions + cost-gate. We now invoke the handler exactly as
    // Artemis would — emitting through mestor would double-write, so we
    // call updatePolicy() directly here. The audit trail is preserved
    // through the IntentEmission row that governedProcedure created.
    const { updatePolicy } = await import("@/server/services/model-policy");
    return updatePolicy({
      purpose: input.purpose,
      anthropicModel: input.anthropicModel,
      ollamaModel: input.ollamaModel,
      allowOllamaSubstitution: input.allowOllamaSubstitution,
      pipelineVersion: input.pipelineVersion,
      notes: input.notes ?? null,
      updatedBy: ctx.session?.user?.id ?? null,
    });
  }),

  // Audited dummy mutation to engage the strangler middleware on this router
  // (registered for completeness even though all real mutations use governedProcedure).
  _strangler: auditedAdmin
    .input(z.object({ noop: z.boolean().default(true) }))
    .mutation(async ({ input }) => ({ ok: input.noop })),

  /**
   * listRecentSentinels — read-only query for the cockpit
   * `<ApogeeMaintenanceDashboard>` (ADR-0038, Phase 16-bis).
   *
   * Returns the recent IntentEmission rows for the 3 sentinel kinds
   * (MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT_SECTOR) for a
   * given strategy + the current composite ADVERTIS score. Used by the
   * founder-facing apogee-maintenance page.
   */
  listRecentSentinels: adminProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        sinceDays: z.number().int().min(1).max(120).default(60),
        limit: z.number().int().min(1).max(60).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);
      const SENTINEL_KINDS = [
        "MAINTAIN_APOGEE",
        "DEFEND_OVERTON",
        "EXPAND_TO_ADJACENT_SECTOR",
      ] as const;
      const [emissions, strategy] = await Promise.all([
        ctx.db.intentEmission.findMany({
          where: {
            strategyId: input.strategyId,
            intentKind: { in: SENTINEL_KINDS as unknown as string[] },
            emittedAt: { gte: since },
          },
          orderBy: { emittedAt: "desc" },
          take: input.limit,
        }),
        ctx.db.strategy.findUnique({
          where: { id: input.strategyId },
          select: { advertis_vector: true },
        }),
      ]);
      const compositeScore =
        (strategy?.advertis_vector as Record<string, number> | null)?.composite ?? 0;
      return {
        compositeScore,
        emissions: emissions.map((r) => ({
          id: r.id,
          intentKind: r.intentKind,
          strategyId: r.strategyId,
          status: (r as unknown as { status?: string }).status ?? "OK",
          emittedAt: r.emittedAt,
          completedAt: r.completedAt,
          result: r.result,
        })),
      };
    }),
});

function summarizePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const keys = Object.keys(payload as Record<string, unknown>).slice(0, 4);
  return keys.join(", ");
}
