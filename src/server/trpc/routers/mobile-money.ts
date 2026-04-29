/**
 * Mobile Money Router — Payment integration for African market
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure, publicProcedure } from "../init";
import * as mobileMoney from "@/server/services/mobile-money";
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "mobile-money");
const auditedAdmin = auditedProcedure(adminProcedure, "mobile-money");
/* lafusee:strangler-active */

export const mobileMoneyRouter = createTRPCRouter({
  initiatePayment: auditedAdmin
    .input(z.object({
      amount: z.number(),
      currency: z.string().default("XAF"),
      recipientPhone: z.string(),
      recipientName: z.string(),
      provider: z.enum(["ORANGE", "MTN", "WAVE"]),
      reference: z.string(),
    }))
    .mutation(({ input }) => mobileMoney.initiatePayment(input)),

  payCommission: auditedAdmin
    .input(z.object({ commissionId: z.string() }))
    .mutation(({ input }) => mobileMoney.payCommission(input.commissionId)),

  detectProvider: auditedProtected
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => mobileMoney.detectProvider(input.phone)),

  webhook: publicProcedure
    .input(z.object({ provider: z.enum(["ORANGE", "MTN", "WAVE"]), payload: z.record(z.unknown()) }))
    .mutation(({ input }) => mobileMoney.handleWebhook(input.provider, input.payload as Record<string, unknown>)),
});
