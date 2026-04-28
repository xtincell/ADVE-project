import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as bootSequence from "@/server/services/boot-sequence";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "onboarding");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const onboardingRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => bootSequence.start(input.strategyId)),

  advance: protectedProcedure
    .input(z.object({ strategyId: z.string(), step: z.number(), responses: z.record(z.unknown()) }))
    .mutation(async ({ input }) => bootSequence.advance(input.strategyId, input.step, input.responses)),

  complete: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => bootSequence.complete(input.strategyId)),
});
