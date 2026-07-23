/**
 * Mobile Money Router — Payment integration for African market
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from "../init";
import * as mobileMoney from "@/server/services/mobile-money";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/**
 * Le webhook momo mute le registre de payouts (`PaymentOrder.status`) — il DOIT
 * être authentifié. Sans secret il était `publicProcedure` ouvert : quiconque
 * connaît un `transactionRef`/`providerRef` pouvait basculer un payout à
 * COMPLETED/FAILED (audit round-8). Doctrine fail-closed identique à
 * `verifyCronSecret` : sans `MOBILE_MONEY_WEBHOOK_SECRET` configuré, le webhook
 * est REFUSÉ en production (pas d'écriture ledger anonyme), autorisé hors prod
 * (confort dev — aucun provider live, momo DEFERRED). Le vrai schéma de signature
 * par provider (Orange/MTN/Wave) remplacera ce secret partagé à l'intégration.
 */
function assertMomoWebhookSecret(provided?: string): void {
  const expected = process.env.MOBILE_MONEY_WEBHOOK_SECRET;
  const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (!expected) {
    if (isProd) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Webhook mobile money non configuré (MOBILE_MONEY_WEBHOOK_SECRET requis).",
      });
    }
    return; // dev : autorisé
  }
  if (!provided || provided !== expected) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Secret webhook mobile money invalide." });
  }
}

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
    .input(z.object({
      provider: z.enum(["ORANGE", "MTN", "WAVE"]),
      payload: z.record(z.string(), z.unknown()),
      secret: z.string().optional(),
    }))
    .mutation(({ input }) => {
      assertMomoWebhookSecret(input.secret);
      return mobileMoney.handleWebhook(input.provider, input.payload as Record<string, unknown>);
    }),
});
