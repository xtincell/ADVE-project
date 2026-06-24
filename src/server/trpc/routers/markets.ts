/**
 * Markets router (ADR-0105) — market kill-switch admin surface.
 *
 * Lecture de tous les marchés (ADMIN — voit aussi les neutralisés, car le Proxy
 * `marketScopedDb` bypasse en mode ADMIN) + 3 mutations gouvernées via
 * `mestor.emitIntent` (NEUTRALIZE / REINSTATE / PURGE_MARKET → commandant).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../init";
/* lafusee:governed-active */
import { emitIntent } from "@/server/services/mestor/intents";
import { listMarkets } from "@/server/services/market-lifecycle";

const codeSchema = z.string().regex(/^[A-Z]{2}$/, "Code pays ISO-2 (2 lettres majuscules)");

export const marketsRouter = createTRPCRouter({
  /** Tous les marchés + statut + nombre de stratégies (ADMIN). */
  list: adminProcedure.query(() => listMarkets()),

  /** Neutralise un marché : FREEZE (visible read-only) ou SHADOWBAN (invisible). */
  neutralize: adminProcedure
    .input(
      z.object({
        countryCode: codeSchema,
        mode: z.enum(["FREEZE", "SHADOWBAN"]),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      emitIntent(
        {
          kind: "NEUTRALIZE_MARKET",
          strategyId: `MARKET:${input.countryCode}`,
          operatorId: ctx.session.user.id,
          countryCode: input.countryCode,
          mode: input.mode,
          reason: input.reason,
        },
        { caller: "markets:neutralize" },
      ),
    ),

  /** Réintègre un marché (→ ACTIVE). Refusé si PURGED. */
  reinstate: adminProcedure
    .input(z.object({ countryCode: codeSchema }))
    .mutation(({ ctx, input }) =>
      emitIntent(
        {
          kind: "REINSTATE_MARKET",
          strategyId: `MARKET:${input.countryCode}`,
          operatorId: ctx.session.user.id,
          countryCode: input.countryCode,
        },
        { caller: "markets:reinstate" },
      ),
    ),

  /** Purge définitive (cascade). Anti-foot-gun : exige SHADOWBANNED + echo du code. */
  purge: adminProcedure
    .input(z.object({ countryCode: codeSchema, confirmCode: z.string() }))
    .mutation(({ ctx, input }) => {
      if (input.confirmCode !== input.countryCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le code de confirmation doit correspondre au code pays.",
        });
      }
      return emitIntent(
        {
          kind: "PURGE_MARKET",
          strategyId: `MARKET:${input.countryCode}`,
          operatorId: ctx.session.user.id,
          countryCode: input.countryCode,
          confirmCode: input.confirmCode,
        },
        { caller: "markets:purge" },
      );
    }),
});
