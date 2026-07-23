import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessMission, getOperatorContext } from "@/server/services/operator-isolation";
/* lafusee:governed-active */

/**
 * Anti-IDOR (audit adversarial 2026-07-22, round-3) : les procédures sont keyées
 * sur `deliverableId`/`trackingId` (pas strategyId) → gardes ADR-0175 inertes.
 * On remonte `deliverable → mission → strategy` et on passe `canAccessMission`
 * (owner / opérateur / assigné). Sans ça : lecture/écriture cross-tenant des
 * suivis de livrables (comptes de signaux, injection de faux signaux).
 */
async function assertDeliverableAccess(
  ctx: { session: { user: { id: string } }; db: typeof import("@/lib/db").db },
  missionId: string,
): Promise<void> {
  const opCtx = await getOperatorContext(ctx.session.user.id);
  if (!(await canAccessMission(missionId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à ce livrable." });
  }
}

async function missionIdOfDeliverable(
  ctx: { db: typeof import("@/lib/db").db },
  deliverableId: string,
): Promise<string> {
  const d = await ctx.db.missionDeliverable.findUnique({
    where: { id: deliverableId },
    select: { missionId: true },
  });
  if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Livrable introuvable" });
  return d.missionId;
}

async function missionIdOfTracking(
  ctx: { db: typeof import("@/lib/db").db },
  trackingId: string,
): Promise<string> {
  const t = await ctx.db.deliverableTracking.findUnique({
    where: { id: trackingId },
    select: { deliverable: { select: { missionId: true } } },
  });
  if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Suivi introuvable" });
  return t.deliverable.missionId;
}

export const deliverableTrackingRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_DELIVERABLE_TRACKING_CREATE",

    inputSchema: z.object({
      deliverableId: z.string(),
      expectedSignals: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "deliverable-tracking:create",

  })
    .mutation(async ({ ctx, input }) => {
      await assertDeliverableAccess(ctx, await missionIdOfDeliverable(ctx, input.deliverableId));
      return ctx.db.deliverableTracking.create({
        data: {
          deliverableId: input.deliverableId,
          expectedSignals: (input.expectedSignals ?? {}) as Prisma.InputJsonValue,
          status: "AWAITING_SIGNALS",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }),

  addSignal: governedProcedure({


    kind: "LEGACY_DELIVERABLE_TRACKING_ADD_SIGNAL",


    inputSchema: z.object({
      trackingId: z.string(),
      signal: z.record(z.string(), z.unknown()),
    }),


    caller: "deliverable-tracking:addSignal",


  })
    .mutation(async ({ ctx, input }) => {
      await assertDeliverableAccess(ctx, await missionIdOfTracking(ctx, input.trackingId));
      const tracking = await ctx.db.deliverableTracking.findUniqueOrThrow({
        where: { id: input.trackingId },
      });
      const receivedSignals = Array.isArray(tracking.receivedSignals) ? tracking.receivedSignals : [];
      receivedSignals.push(input.signal as unknown as Prisma.JsonValue);
      return ctx.db.deliverableTracking.update({
        where: { id: input.trackingId },
        data: { receivedSignals: receivedSignals as Prisma.InputJsonValue, status: "PARTIAL" },
      });
    }),

  getByDeliverable: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertDeliverableAccess(ctx, await missionIdOfDeliverable(ctx, input.deliverableId));
      return ctx.db.deliverableTracking.findMany({
        where: { deliverableId: input.deliverableId },
      });
    }),

  getImpact: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertDeliverableAccess(ctx, await missionIdOfDeliverable(ctx, input.deliverableId));
      const trackings = await ctx.db.deliverableTracking.findMany({
        where: { deliverableId: input.deliverableId },
      });
      const totalSignals = trackings.reduce((sum, t) => {
        const received = Array.isArray(t.receivedSignals) ? t.receivedSignals : [];
        return sum + received.length;
      }, 0);
      return {
        deliverableId: input.deliverableId,
        trackingCount: trackings.length,
        totalSignals,
      };
    }),

  expire: governedProcedure({


    kind: "LEGACY_DELIVERABLE_TRACKING_EXPIRE",


    inputSchema: z.object({ trackingId: z.string() }),


    caller: "deliverable-tracking:expire",


  })
    .mutation(async ({ ctx, input }) => {
      await assertDeliverableAccess(ctx, await missionIdOfTracking(ctx, input.trackingId));
      return ctx.db.deliverableTracking.update({
        where: { id: input.trackingId },
        data: { status: "EXPIRED" },
      });
    }),
});
