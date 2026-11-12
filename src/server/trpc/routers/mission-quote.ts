/**
 * Mission quote — tRPC router (ADR-0118). Devis structuré prestataire → marque.
 *
 * Le prestataire soumet (gouverné) ; la marque, propriétaire de la stratégie de
 * la mission, décide. Lectures tenant-scopées. Zéro LLM.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import * as quote from "@/server/services/mission-quote";
import { accessible, entityNotFound } from "../entity-access";
/* lafusee:governed-active */

/** IN1 : une mission ou un devis inconnus, ou hors d'atteinte, reçoivent le même 404. */
const MISSION_NOT_FOUND = "Mission introuvable.";

const lineSchema = z.object({ label: z.string().min(1).max(300), qty: z.number().positive(), unitPrice: z.number().nonnegative() });

function operatorIdOf(user: { id: string }): string | null {
  return ((user as unknown as Record<string, unknown>).operatorId as string | undefined) ?? null;
}

export const missionQuoteRouter = createTRPCRouter({
  /** Devis d'une mission (côté marque). */
  byMission: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await accessible(ctx.db.mission.findUnique({ where: { id: input.missionId }, select: { strategyId: true } }), MISSION_NOT_FOUND,
        (mission) => canAccessStrategy(mission.strategyId, {
          operatorId: operatorIdOf(ctx.session.user), userId: ctx.session.user.id, role: ctx.session.user.role ?? "USER",
        }));
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
    // IDOR round-10 : `submitQuote` ne résolvait que le talentProfile du caller —
    // aucune vérification que la mission existe / est PUBLIÉE. Un prestataire
    // injectait des devis dans n'importe quelle mission (interne incluse) par id.
    // Gate = mission ouverte sur le mur de la Guilde (mirroir mission-applications.submit).
    // IN1 : inconnue ou non publiée, la même réponse 404.
    const mission = await ctx.db.mission.findUnique({
      where: { id: input.missionId },
      select: { guildPublished: true },
    });
    if (!mission || !mission.guildPublished) {
      throw entityNotFound("Cette mission n'est pas ouverte aux devis.");
    }
    return quote.submitQuote({ userId: ctx.session.user.id, ...input });
  }),

  /** Décision marque (accepté/rejeté). */
  decide: governedProcedure({
    kind: "LEGACY_MISSION_QUOTE_DECIDE",
    inputSchema: z.object({ quoteId: z.string(), decision: z.enum(["ACCEPTED", "REJECTED"]) }),
    caller: "mission-quote:decide",
  }).mutation(async ({ ctx, input }) => {
    await accessible(ctx.db.missionQuote.findUnique({ where: { id: input.quoteId }, select: { mission: { select: { strategyId: true } } } }),
      "Devis introuvable.", (q) => canAccessStrategy(q.mission.strategyId, {
        operatorId: operatorIdOf(ctx.session.user), userId: ctx.session.user.id, role: ctx.session.user.role ?? "USER",
      }));
    return quote.decideQuote(input);
  }),
});
