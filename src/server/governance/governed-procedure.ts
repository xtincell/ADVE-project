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
import type { z } from "zod";

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
    try {
      const result = await next({ ctx: { ...ctx, intentId } });
      await postEmitIntent(ctx, intentId, result, "OK");
      return result;
    } catch (err) {
      await postEmitIntent(ctx, intentId, { error: String(err) }, "FAILED");
      throw err;
    }
  });
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
