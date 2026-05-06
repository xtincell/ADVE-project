/**
 * Mobile Money Router — Payment integration for African market
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from "../init";
import * as mobileMoney from "@/server/services/mobile-money";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const mobileMoneyRouter = createTRPCRouter({
  initiatePayment: governedProcedure({

    kind: "LEGACY_MOBILE_MONEY_INITIATE_PAYMENT",

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

  payCommission: governedProcedure({


    kind: "LEGACY_MOBILE_MONEY_PAY_COMMISSION",


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
