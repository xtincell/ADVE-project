/**
 * src/server/governance/governed-procedure.ts — tRPC procedure builder that
 * routes through Mestor.
 *
 * Layer 2.
 *
 * Two surfaces:
 *
 *   1. `governedProcedure({ kind, input })` — explicit. Use this for new
 *      mutations. The handler receives the validated input + a `mestor`
 *      handle whose `emitIntent` is the only allowed write path.
 *
 *   2. `auditedProcedure(base)` — strangler middleware. Wraps an existing
 *      `protectedProcedure`/`adminProcedure` so that *every* mutation that
 *      flows through it gets a synthetic IntentEmission row — without
 *      refactoring the 70 existing routers. Severity downgrades over time
 *      as routers migrate to `governedProcedure`.
 *
 * The synthetic row caller is `"strangler:<router>:<procedure>"` so the
 * dashboard can show the migration progress.
 */

import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/trpc/context";
import { protectedProcedure, adminProcedure } from "@/server/trpc/init";
import { eventBus } from "./event-bus";
import { computeSelfHash } from "./hash-chain";
import { assertReadyFor, ReadinessVetoError } from "./pillar-readiness";
import { assertCostGate, CostVetoError, type CostDecisionResult } from "./cost-gate";
import { makeDefaultCapacityReader } from "./default-capacity-reader";
import { findCapability, getManifest } from "./registry";
import type { Capability, NeteruManifest, ReadinessGateName } from "./manifest";
import {
  OracleError,
  toOracleError,
} from "@/server/services/strategy-presentation/error-codes";
import { captureOracleErrorPublic } from "@/server/services/strategy-presentation/error-capture";
import type { z } from "zod";

/**
 * tRPC v11 returns a MiddlewareResult from `next()` — a discriminated union
 * { ok: true, data, marker, ctx } | { ok: false, error, marker }. The wrapper
 * `ctx` reference contains PrismaClient and other deep proxies — passing it
 * verbatim to a Prisma JSON column triggers V8 stack-overflow during
 * JSON.stringify (cf. ORACLE-901). Always extract `.data` before persisting.
 */
type MiddlewareResultLike =
  | { ok: true; data: unknown }
  | { ok: false; error: unknown };

function unwrapMiddlewareResult(result: unknown): unknown {
  if (result && typeof result === "object" && "ok" in result) {
    const r = result as MiddlewareResultLike;
    return r.ok ? r.data : { error: String(r.error) };
  }
  // Defensive — if shape ever changes, log a primitive instead of the proxy.
  return { kind: "unknown-middleware-result" };
}

type AnyZod = z.ZodTypeAny;

interface GovernedOptions<I extends AnyZod, O extends AnyZod> {
  kind: string;
  inputSchema: I;
  outputSchema?: O;
  caller?: string;
  /**
   * Set to true to require the user to be linked to an Operator. Defaults
   * to true (governance is multi-tenant by default).
   */
  requireOperator?: boolean;
  /**
   * Readiness gates evaluated before the handler runs. Mirror of the
   * Capability.preconditions field on the manifest — duplicated here
   * because not every governedProcedure call has a manifest yet during
   * the migration. New code should leave this empty and rely on the
   * manifest.
   */
  preconditions?: readonly ReadinessGateName[];
}

/**
 * Build a tRPC mutation that traverses Mestor.
 *
 * Usage:
 *   export const myMutation = governedProcedure({
 *     kind: "RANK_PEERS",
 *     inputSchema: z.object({ strategyId: z.string() }),
 *   }).mutation(async ({ ctx, input }) => {
 *     // ctx.mestor is auto-injected.
 *     return ctx.mestor.dispatch(input);
 *   });
 */
export function governedProcedure<I extends AnyZod, O extends AnyZod>(
  opts: GovernedOptions<I, O>,
) {
  const base = opts.requireOperator === false ? protectedProcedure : protectedProcedure;
  return base.input(opts.inputSchema).use(async ({ ctx, input, next }) => {
    const intentId = await preEmitIntent(ctx, opts.kind, input, opts.caller ?? "governed");

    // Pre-condition gates — evaluated AFTER the IntentEmission row exists
    // so the veto is recorded in the audit trail with a clear reason.
    if (opts.preconditions && opts.preconditions.length > 0) {
      const strategyId = extractStrategyId(input);
      if (!strategyId) {
        // Manifest preconditions configured but the input does not carry
        // a strategyId — fail loud, don't silently bypass.
        await postEmitIntent(ctx, intentId, { error: "preconditions configured but no strategyId in input" }, "FAILED");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Capability '${opts.kind}' declares preconditions ${opts.preconditions.join(",")} but input has no strategyId.`,
        });
      }
      for (const gate of opts.preconditions) {
        try {
          await assertReadyFor(strategyId, gate, intentId);
        } catch (err) {
          if (err instanceof ReadinessVetoError) {
            const oracleErr = new OracleError(
              "ORACLE-101",
              { blockers: err.blockers, gate, strategyId },
              { cause: err },
            );
            await postEmitIntent(
              ctx,
              intentId,
              { code: oracleErr.code, message: oracleErr.message, blockers: err.blockers },
              "VETOED",
            );
            void captureOracleErrorPublic(oracleErr, {
              intentId,
              strategyId,
              trpcProcedure: `governed:${opts.kind}`,
            });
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: oracleErr.message,
              cause: oracleErr.toCausePayload(),
            });
          }
          throw err;
        }
      }
    }

    // Pillar 6 — Thot cost-gate. Looked up against the manifest registry
    // so legacy callers without a manifest are skipped silently.
    const costDecision = await evaluateCostGateForIntent(ctx, opts.kind, intentId);
    if (costDecision?.decision === "VETO") {
      const oracleErr = new OracleError(
        "ORACLE-102",
        { decision: costDecision, kind: opts.kind },
      );
      await postEmitIntent(
        ctx,
        intentId,
        { code: oracleErr.code, message: oracleErr.message, costDecision },
        "VETOED",
      );
      void captureOracleErrorPublic(oracleErr, {
        intentId,
        trpcProcedure: `governed:${opts.kind}`,
      });
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: oracleErr.message,
        cause: oracleErr.toCausePayload(),
      });
    }

    try {
      const childCtx = costDecision
        ? { ...ctx, intentId, costDecision }
        : { ...ctx, intentId };
      const result = await next({ ctx: childCtx });
      const finalStatus = costDecision?.decision === "DOWNGRADE" ? "DOWNGRADED" : "OK";
      // ORACLE-901 fix: never persist the raw MiddlewareResult — it carries
      // ctx (PrismaClient proxies). Always unwrap to .data first.
      const loggablePayload = unwrapMiddlewareResult(result);
      await postEmitIntent(ctx, intentId, loggablePayload, finalStatus);
      return result;
    } catch (err) {
      const oracleErr = toOracleError(err);
      const strategyId = extractStrategyId(input) ?? undefined;
      await postEmitIntent(
        ctx,
        intentId,
        { code: oracleErr.code, message: oracleErr.message, context: oracleErr.context },
        "FAILED",
      );
      void captureOracleErrorPublic(oracleErr, {
        intentId,
        strategyId,
        trpcProcedure: `governed:${opts.kind}`,
      });

      // If the underlying error was already a TRPCError, preserve its code.
      if (err instanceof TRPCError) throw err;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: oracleErr.message,
        cause: oracleErr.toCausePayload(),
      });
    }
  });
}

async function evaluateCostGateForIntent(
  ctx: Context,
  intentKind: string,
  intentId: string,
): Promise<CostDecisionResult | null> {
  const handler = findCapability(intentKind);
  if (!handler) return null;
  const manifest: NeteruManifest | undefined = getManifest(handler.service);
  if (!manifest) return null;
  const capability: Capability | undefined = manifest.capabilities.find(
    (c) => c.name === handler.capability,
  );
  if (!capability) return null;
  if (!capability.costEstimateUsd || capability.costEstimateUsd <= 0) return null;

  const operatorId = await resolveOperatorId(ctx).catch(() => null);
  if (!operatorId) return null;

  const reader = makeDefaultCapacityReader(ctx.db);
  try {
    const decision = await assertCostGate(
      { intentId, intentKind, operatorId, capability, manifest },
      reader,
    );
    await persistCostDecision(ctx, intentId, intentKind, operatorId, decision, capability);
    return decision;
  } catch (err) {
    if (err instanceof CostVetoError) {
      await persistCostDecision(ctx, intentId, intentKind, operatorId, err.result, capability);
      return err.result;
    }
    throw err;
  }
}

async function persistCostDecision(
  ctx: Context,
  intentEmissionId: string,
  intentKind: string,
  operatorId: string,
  decision: CostDecisionResult,
  capability: Capability,
): Promise<void> {
  await ctx.db.costDecision
    .create({
      data: {
        intentEmissionId,
        intentKind,
        operatorId,
        decision: decision.decision,
        estimatedUsd: decision.estimatedUsd,
        remainingBudgetUsd: decision.remainingBudgetUsd,
        downgradeFromTier: decision.downgradeTo ? capability.qualityTier ?? null : null,
        downgradeToTier: decision.downgradeTo?.qualityTier ?? null,
        reason: decision.reason,
      },
    })
    .catch(() => {
      // Don't fail the request if the audit row can't be written —
      // the IntentEmission row already records the gate outcome.
    });
}

function extractStrategyId(input: unknown): string | null {
  if (input && typeof input === "object" && "strategyId" in input) {
    const v = (input as { strategyId: unknown }).strategyId;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/**
 * Strangler wrapper — applied to any existing procedure builder so that
 * every mutation creates an IntentEmission row without code change.
 *
 * Apply once at router level:
 *   const audited = auditedProcedure(protectedProcedure, "pillar");
 *   export const pillarRouter = createTRPCRouter({
 *     update: audited.mutation(async ({ ... }) => ...),
 *   });
 */
export function auditedProcedure<P extends typeof protectedProcedure>(
  baseProcedure: P,
  routerName: string,
) {
  return baseProcedure.use(async ({ ctx, type, path, next }) => {
    if (type !== "mutation") return next();
    const caller = `strangler:${routerName}:${path ?? "?"}`;
    const intentId = await preEmitIntent(ctx, "LEGACY_MUTATION", {}, caller);
    try {
      const result = await next();
      if (result.ok) {
        await postEmitIntent(ctx, intentId, result.data, "OK");
      } else {
        await postEmitIntent(ctx, intentId, { error: String(result.error) }, "FAILED");
      }
      return result;
    } catch (err) {
      await postEmitIntent(ctx, intentId, { error: String(err) }, "FAILED");
      throw err;
    }
  });
}

// ── Internal: write IntentEmission rows ───────────────────────────────

async function preEmitIntent(
  ctx: Context,
  kind: string,
  payload: unknown,
  caller: string,
): Promise<string> {
  const operatorId = await resolveOperatorId(ctx).catch(() => null);
  if (!operatorId && kind !== "LEGACY_MUTATION") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot emit intent without operator binding",
    });
  }
  const strategyId =
    (payload && typeof payload === "object" && "strategyId" in payload && typeof (payload as { strategyId: unknown }).strategyId === "string"
      ? (payload as { strategyId: string }).strategyId
      : undefined) ?? "(none)";

  // Last hash for this strategy, to chain.
  const last = await ctx.db.intentEmission.findFirst({
    where: { strategyId },
    orderBy: { emittedAt: "desc" },
    select: { selfHash: true },
  } as never).catch(() => null);
  const prevHash = (last as { selfHash?: string | null } | null)?.selfHash ?? null;

  const id = cryptoRandomId();
  const emittedAt = new Date();
  const selfHash = computeSelfHash({
    id,
    intentKind: kind,
    strategyId,
    payload,
    result: null,
    caller,
    emittedAt,
    prevHash,
  });

  await ctx.db.intentEmission.create({
    data: {
      id,
      intentKind: kind,
      strategyId,
      payload: payload as never,
      caller,
      emittedAt,
      // The new columns from the Phase-3 migration:
      ...({
        prevHash,
        selfHash,
        status: "PENDING",
        startedAt: emittedAt,
      } as Record<string, unknown>),
    } as never,
  });

  eventBus.publish("intent.proposed", { intentId: id, kind, ctx: { caller, strategyId } });
  return id;
}

async function postEmitIntent(
  ctx: Context,
  intentId: string,
  result: unknown,
  status: "OK" | "FAILED" | "VETOED" | "DOWNGRADED" | "QUEUED",
): Promise<void> {
  const completedAt = new Date();
  await ctx.db.intentEmission.update({
    where: { id: intentId },
    data: {
      result: result as never,
      completedAt,
      ...({ status, completedAt } as Record<string, unknown>),
    } as never,
  });
  if (status === "OK") {
    eventBus.publish("intent.completed", { intentId, result });
  } else if (status === "FAILED") {
    eventBus.publish("intent.failed", { intentId, error: String(result) });
  } else if (status === "VETOED") {
    eventBus.publish("intent.vetoed", { intentId, reason: String(result) });
  } else if (status === "DOWNGRADED") {
    eventBus.publish("intent.downgraded", { intentId, reason: String(result) });
  }
}

async function resolveOperatorId(ctx: Context): Promise<string | null> {
  if (!ctx.session?.user) return null;
  if (ctx.session.user.role === "ADMIN") return "ADMIN";
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { operatorId: true },
  });
  return user?.operatorId ?? null;
}

function cryptoRandomId(): string {
  const a = "0123456789abcdef";
  let out = "c";
  for (let i = 0; i < 24; i++)
    out += a[Math.floor(Math.random() * 16)];
  return out;
}
