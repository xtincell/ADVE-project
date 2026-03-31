import "@/lib/auth/types";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
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
