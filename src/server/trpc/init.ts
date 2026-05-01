import "@/lib/auth/types";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Phase 11 — auto-capture dans error-vault (best-effort, non-blocking)
    if (error.code !== "UNAUTHORIZED" && error.code !== "FORBIDDEN") {
      void import("@/server/services/error-vault")
        .then(({ capture }) =>
          capture({
            source: "SERVER",
            severity: error.code === "INTERNAL_SERVER_ERROR" ? "ERROR" : "WARN",
            code: error.code,
            message: error.message,
            stack: error.stack,
            trpcProcedure: shape.data?.path,
          }),
        )
        .catch(() => {});
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/**
 * Operator procedure — requires the user to be an ADMIN or linked to an Operator.
 * Used for validation-sensitive operations (status transitions, applying tool outputs, etc.).
 */
export const operatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role === "ADMIN") {
    return next({ ctx });
  }

  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { operatorId: true },
  });

  if (!user?.operatorId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acces reserve aux operateurs et administrateurs",
    });
  }

  return next({ ctx });
});

/**
 * Phase 8+ — paid-media procedure. Engage des budgets concrets ; n'est
 * pas accessible à un simple operator. Exige role ADMIN OU role
 * ADMIN_PAID_MEDIA + MFA actif (mfaSecret enrolled).
 *
 * Côté code Anubis : `launchAdCampaign` doit utiliser cette procédure
 * (cf. ADR-0011 §6 — co-gouvernance Anubis × Thot, gate budget).
 */
export const paidMediaProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const role = ctx.session.user.role;
  if (role === "ADMIN") return next({ ctx });
  if (role === "ADMIN_PAID_MEDIA") {
    const mfa = await ctx.db.mfaSecret.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (mfa) return next({ ctx });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ADMIN_PAID_MEDIA requires MFA enrolment before launching paid campaigns.",
    });
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Paid media operations require ADMIN or ADMIN_PAID_MEDIA role (with MFA).",
  });
});

// Chantier 6 — Tier guard for Creator routes (server-side enforcement)
const TIER_ORDER: Record<string, number> = { APPRENTI: 0, COMPAGNON: 1, MAITRE: 2, ASSOCIE: 3 };

export function tierProcedure(minTier: "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE") {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.session.user.role === "ADMIN") return next({ ctx });

    const profile = await ctx.db.talentProfile.findUnique({
      where: { userId: ctx.session.user.id },
      select: { tier: true },
    });

    if (!profile || (TIER_ORDER[profile.tier] ?? -1) < (TIER_ORDER[minTier] ?? 0)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Tier minimum requis : ${minTier}. Votre tier : ${profile?.tier ?? "aucun"}.`,
      });
    }

    return next({ ctx });
  });
}
