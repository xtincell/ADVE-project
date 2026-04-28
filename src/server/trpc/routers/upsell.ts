import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { detect } from "@/server/services/upsell-detector";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedAdmin = auditedProcedure(adminProcedure, "upsell");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const upsellRouter = createTRPCRouter({
  detect: adminProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => { return detect(input.strategyId); }),

  list: adminProcedure.query(async ({ ctx }) => {
    const strategies = await ctx.db.strategy.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    const all = await Promise.all(strategies.map((s) => detect(s.id)));
    return all.flat();
  }),

  dismiss: adminProcedure
    .input(z.object({ strategyId: z.string(), type: z.string() }))
    .mutation(async () => { return { dismissed: true }; }),
});
