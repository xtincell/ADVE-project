import { TRPCError } from "@trpc/server";
import type { Context } from "../context";

/**
 * Middleware that ensures users can only access data from their own operator.
 * Applied to strategy-related queries to enforce multi-tenant isolation.
 */
export function enforceOperatorIsolation(ctx: Context, targetOperatorId: string | null) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // ADMIN can access everything
  if (ctx.session.user.role === "ADMIN") return;

  // Check operator match
  const userOperatorId = (ctx.session.user as { operatorId?: string }).operatorId;
  if (targetOperatorId && userOperatorId !== targetOperatorId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied: operator isolation violation",
    });
  }
}

/**
 * Returns a where clause filter for operator isolation.
 */
export function operatorFilter(ctx: Context): { operatorId?: string } {
  if (!ctx.session?.user) return {};
  if (ctx.session.user.role === "ADMIN") return {};

  const operatorId = (ctx.session.user as { operatorId?: string }).operatorId;
  return operatorId ? { operatorId } : {};
}
