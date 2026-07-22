/**
 * Mobile Money Router — Payment integration for African market
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from "../init";
import * as mobileMoney from "@/server/services/mobile-money";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const mobileMoneyRouter = createTRPCRouter({
  // Primitive de PAIEMENT brute (envoi d'argent, montant+destinataire libres) :
  // réservée au STAFF (audit round-4 — était `governedProcedure` sans gate ⇒ tout
  // compte authentifié initiait un virement momo arbitraire). Miroir du gate
  // arbitre/ADMIN d'`escrow-arbitration.capturePayout`.
  initiatePayment: governedProcedure({

    kind: "LEGACY_MOBILE_MONEY_INITIATE_PAYMENT",
    requireOperator: true,

    inputSchema: z.object({
      amount: z.number(),
      currency: z.string().default("XAF"),
      recipientPhone: z.string(),
      recipientName: z.string(),
      provider: z.enum(["ORANGE", "MTN", "WAVE"]),
      reference: z.string(),
    }),

    caller: "mobile-money:initiatePayment",

  })
    .mutation(({ input }) => mobileMoney.initiatePayment(input)),

  // Payout d'une commission : STAFF uniquement (était ouvert à tout authentifié
  // → un créateur payait sa propre commission sans opérateur dans la boucle).
  payCommission: governedProcedure({


    kind: "LEGACY_MOBILE_MONEY_PAY_COMMISSION",
    requireOperator: true,


    inputSchema: z.object({ commissionId: z.string() }),


    caller: "mobile-money:payCommission",


  })
    .mutation(({ input }) => mobileMoney.payCommission(input.commissionId)),

  detectProvider: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => mobileMoney.detectProvider(input.phone)),

  webhook: publicProcedure
    .input(z.object({ provider: z.enum(["ORANGE", "MTN", "WAVE"]), payload: z.record(z.string(), z.unknown()) }))
    .mutation(({ input }) => mobileMoney.handleWebhook(input.provider, input.payload as Record<string, unknown>)),
});
