/**
 * Mission quote — tRPC router (ADR-0118). Devis structuré prestataire → marque.
 *
 * Le prestataire soumet (gouverné) ; la marque, propriétaire de la stratégie de
 * la mission, décide. Lectures tenant-scopées. Zéro LLM.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import * as quote from "@/server/services/mission-quote";
/* lafusee:governed-active */

const lineSchema = z.object({ label: z.string().min(1).max(300), qty: z.number().positive(), unitPrice: z.number().nonnegative() });

function operatorIdOf(user: { id: string }): string | null {
  return ((user as unknown as Record<string, unknown>).operatorId as string | undefined) ?? null;
}

export const missionQuoteRouter = createTRPCRouter({
  /** Devis d'une mission (côté marque). */
  byMission: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const mission = await ctx.db.mission.findUniqueOrThrow({ where: { id: input.missionId }, select: { strategyId: true } });
      const ok = await canAccessStrategy(mission.strategyId, {
        operatorId: operatorIdOf(ctx.session.user), userId: ctx.session.user.id, role: ctx.session.user.role ?? "USER",
      });
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });
      return quote.listQuotesByMission(input.missionId);
    }),

  /** Mes devis (prestataire). */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return quote.listMyQuotes(ctx.session.user.id);
  }),

  /** Soumet un devis structuré (lignes + TVA, totaux calculés). */
  submit: governedProcedure({
    kind: "LEGACY_MISSION_QUOTE_SUBMIT",
    inputSchema: z.object({
      missionId: z.string(),
      lines: z.array(lineSchema).min(1),
      taxRatePct: z.number().min(0).max(100).optional(),
      currency: z.string().max(8).optional(),
      validUntil: z.date().optional(),
      notes: z.string().max(2000).optional(),
    }),
    caller: "mission-quote:submit",
  }).mutation(async ({ ctx, input }) => {
    return quote.submitQuote({ userId: ctx.session.user.id, ...input });
  }),

  /** Décision marque (accepté/rejeté). */
  decide: governedProcedure({
    kind: "LEGACY_MISSION_QUOTE_DECIDE",
    inputSchema: z.object({ quoteId: z.string(), decision: z.enum(["ACCEPTED", "REJECTED"]) }),
    caller: "mission-quote:decide",
  }).mutation(async ({ ctx, input }) => {
    const q = await ctx.db.missionQuote.findUniqueOrThrow({ where: { id: input.quoteId }, select: { mission: { select: { strategyId: true } } } });
    const ok = await canAccessStrategy(q.mission.strategyId, {
      operatorId: operatorIdOf(ctx.session.user), userId: ctx.session.user.id, role: ctx.session.user.role ?? "USER",
    });
    if (!ok) throw new TRPCError({ code: "FORBIDDEN" });
    return quote.decideQuote(input);
  }),
});
