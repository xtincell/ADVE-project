import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as bootSequence from "@/server/services/boot-sequence";
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "onboarding");
/* lafusee:strangler-active */

export const onboardingRouter = createTRPCRouter({
  start: auditedProtected
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => bootSequence.start(input.strategyId)),

  advance: auditedProtected
    .input(z.object({ strategyId: z.string(), step: z.number(), responses: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ input }) => bootSequence.advance(input.strategyId, input.step, input.responses)),

  complete: auditedProtected
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => bootSequence.complete(input.strategyId)),
});
