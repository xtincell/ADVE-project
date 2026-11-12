/**
 * ADR-0148 — Overton Graph : portes gouvernées (domaine SESHAT). Pas de PII →
 * `governedProcedure` classique (spine ADR-0124), requireOperator : les signaux
 * sont fournis par les feeds/Argos/opérateur, jamais fabriqués ici.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { db } from "@/lib/db";
import { assertStrategyRead } from "./_strategy-read-guard";
import {
  upsertOvertonPositionInputSchema,
  recordZoneTransitionInputSchema,
  linkActorToPositionInputSchema,
} from "@/domain/overton-graph";
import {
  upsertOvertonPosition,
  recordZoneTransition,
  linkActorToPosition,
  getOvertonSignalsForBrand,
} from "@/server/services/seshat/overton-graph";

async function assertPositionAccess(userId: string, role: string | undefined, positionId: string) {
  const position = await db.overtonPosition.findUnique({ where: { id: positionId }, select: { strategyId: true } });
  if (!position) throw new Error("Position introuvable.");
  if (position.strategyId) await assertStrategyRead(userId, position.strategyId);
  else if (role !== "ADMIN") throw new Error("Les positions sectorielles partagées sont réservées à l’administration.");
}

export const overtonRouter = createTRPCRouter({
  upsertPosition: governedProcedure({
    kind: "SESHAT_UPSERT_OVERTON_POSITION",
    requireOperator: true,
    inputSchema: upsertOvertonPositionInputSchema,
    caller: "overton:upsertPosition",
  }).mutation(async ({ input, ctx }) => {
    if (input.strategyId) await assertStrategyRead(ctx.session!.user.id, input.strategyId);
    else if (ctx.session!.user.role !== "ADMIN") throw new Error("Les positions sectorielles partagées sont réservées à l’administration.");
    return upsertOvertonPosition(db, input);
  }),

  recordTransition: governedProcedure({
    kind: "SESHAT_RECORD_ZONE_TRANSITION",
    requireOperator: true,
    inputSchema: recordZoneTransitionInputSchema,
    caller: "overton:recordTransition",
  }).mutation(async ({ input, ctx }) => {
    await assertPositionAccess(ctx.session!.user.id, ctx.session!.user.role, input.positionId);
    if (input.attributedActorKind === "BRAND" && input.attributedActorRef) await assertStrategyRead(ctx.session!.user.id, input.attributedActorRef);
    return recordZoneTransition(db, input);
  }),

  linkActor: governedProcedure({
    kind: "SESHAT_LINK_ACTOR_TO_POSITION",
    requireOperator: true,
    inputSchema: linkActorToPositionInputSchema,
    caller: "overton:linkActor",
  }).mutation(async ({ input, ctx }) => {
    await assertPositionAccess(ctx.session!.user.id, ctx.session!.user.role, input.positionId);
    if (input.actorKind === "BRAND" && input.actorRef) await assertStrategyRead(ctx.session!.user.id, input.actorRef);
    return linkActorToPosition(db, input);
  }),

  /** Lecture : signaux Overton d'une marque (positions tenues + transitions). */
  brandSignals: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      return getOvertonSignalsForBrand(db, input.strategyId);
    }),
});
