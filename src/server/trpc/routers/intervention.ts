import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { interventionState, readInterventionRequest } from "@/domain/intervention-request";
import { canAccessStrategy, getOperatorContext, scopeStrategies } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/** Anti-IDOR (audit round-4) : convert/dismiss keyés `signalId` → résout signal→marque. */
async function assertSignalStrategyAccess(
  ctx: { session: { user: { id: string } }; db: typeof import("@/lib/db").db },
  signalStrategyId: string,
): Promise<void> {
  const opCtx = await getOperatorContext(ctx.session.user.id);
  if (!(await canAccessStrategy(signalStrategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette marque." });
  }
}

const requestCommand = z.object({
  signalId: z.string().min(1), strategyId: z.string().min(1),
  expectedUpdatedAt: z.string().datetime(),
});
const conflict = () => new TRPCError({ code: "CONFLICT",
  message: "Cette demande a changé ou a déjà été traitée. Rechargez-la avant de continuer." });

async function pendingRequest(tx: Prisma.TransactionClient, input: z.infer<typeof requestCommand>) {
  const signal = await tx.signal.findUnique({ where: { id: input.signalId }, include: { strategy: true } });
  if (!signal) throw new TRPCError({ code: "NOT_FOUND", message: "Demande introuvable." });
  if (signal.strategyId !== input.strategyId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette demande n'appartient pas à cette marque." });
  }
  if (signal.type !== "INTERVENTION_REQUEST") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ce signal n'est pas une demande d'intervention." });
  }
  if (signal.updatedAt.toISOString() !== input.expectedUpdatedAt || readInterventionRequest(signal.data).status !== "PENDING") {
    throw conflict();
  }
  return signal;
}

async function finishRequest(tx: Prisma.TransactionClient,
  signal: { id: string; strategyId: string; updatedAt: Date; data: Prisma.JsonValue },
  receipt: Prisma.InputJsonObject,
) {
  const data = signal.data as Prisma.InputJsonObject; // pendingRequest checked a real pending object.
  const changed = await tx.signal.updateMany({
    where: { id: signal.id, strategyId: signal.strategyId, type: "INTERVENTION_REQUEST", updatedAt: signal.updatedAt },
    data: { data: { ...data, ...receipt }, updatedAt: new Date(Math.max(Date.now(), signal.updatedAt.getTime() + 1)) },
  });
  if (changed.count !== 1) throw conflict();
  return tx.signal.findUniqueOrThrow({ where: { id: signal.id } });
}

export const interventionRouter = createTRPCRouter({
  // Create an intervention request (client-facing)
  create: governedProcedure({

    kind: "LEGACY_INTERVENTION_CREATE",

    inputSchema: z.object({
      strategyId: z.string().min(1),
      title: z.string().trim().min(1).max(500),
      description: z.string().trim().min(1).max(20_000),
      urgency: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      type: z.enum(["one_off", "recurring", "emergency"]).default("one_off"),
    }),

    caller: "intervention:create",

  })
    .mutation(async ({ ctx, input }) => {
      // Store as a special Signal
      return ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "INTERVENTION_REQUEST",
          data: {
            title: input.title,
            description: input.description,
            urgency: input.urgency,
            requestType: input.type,
            requestedBy: ctx.session.user.id,
            requestedAt: new Date().toISOString(),
            status: "PENDING",
          } as Prisma.InputJsonValue,
        },
      });
    }),

  // List intervention requests
  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // ADR-0166 — scope ownership : jamais de liste cross-marques.
      const opCtx = await getOperatorContext(ctx.session.user.id);
      const requests = await ctx.db.signal.findMany({
        where: {
          type: "INTERVENTION_REQUEST",
          strategy: scopeStrategies(opCtx),
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { strategy: { select: { name: true, userId: true, operatorId: true } } },
      });
      const visible = input.status ? requests.filter((request) =>
        readInterventionRequest(request.data).status === interventionState(input.status)) : requests;
      return visible.map(({ strategy, ...request }) => ({ ...request, strategyName: strategy.name,
        canProcess: opCtx.role === "ADMIN" || (!!opCtx.operatorId &&
          (strategy.userId === opCtx.userId || strategy.operatorId === opCtx.operatorId)),
      }));
    }),

  // Convert intervention request to a Mission
  convertToMission: governedProcedure({

    kind: "LEGACY_INTERVENTION_CONVERT_TO_MISSION",
    requireOperator: true,

    inputSchema: requestCommand.extend({
      driverId: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).default("DISPATCH"),
    }),

    caller: "intervention:convertToMission",

  })
    .mutation(async ({ ctx, input }) => {
      await assertSignalStrategyAccess(ctx, input.strategyId); // anti-IDOR + spine brand scope.
      return ctx.db.$transaction(async (tx) => {
        const signal = await pendingRequest(tx, input);
        const data = readInterventionRequest(signal.data);
        if (!data.title || !data.description) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Le titre et le besoin doivent être renseignés." });
        }
        if (input.driverId && !(await tx.driver.findFirst({ where: {
          id: input.driverId, strategyId: input.strategyId, status: "ACTIVE", deletedAt: null,
        } }))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ce canal n'est pas actif dans cette marque." });
        }
        const mission = await tx.mission.create({ data: {
          title: data.title, description: data.description, strategyId: signal.strategyId,
          driverId: input.driverId, mode: input.mode, status: "DRAFT",
          advertis_vector: signal.strategy.advertis_vector ?? undefined,
        } });
        await finishRequest(tx, signal, { status: "CONVERTED", missionId: mission.id,
          convertedAt: new Date().toISOString(), convertedBy: ctx.session.user.id });
        return mission;
      });
    }),

  // Dismiss an intervention request
  dismiss: governedProcedure({

    kind: "LEGACY_INTERVENTION_DISMISS",
    requireOperator: true,

    inputSchema: requestCommand.extend({ reason: z.string().trim().min(1).max(20_000) }),

    caller: "intervention:dismiss",

  })
    .mutation(async ({ ctx, input }) => {
      await assertSignalStrategyAccess(ctx, input.strategyId); // anti-IDOR + spine brand scope.
      return ctx.db.$transaction(async (tx) => {
        const signal = await pendingRequest(tx, input);
        return finishRequest(tx, signal, { status: "DISMISSED", dismissReason: input.reason,
          dismissedAt: new Date().toISOString(), dismissedBy: ctx.session.user.id });
      });
    }),
});
