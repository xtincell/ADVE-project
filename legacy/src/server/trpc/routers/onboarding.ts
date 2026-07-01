import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as bootSequence from "@/server/services/boot-sequence";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const onboardingRouter = createTRPCRouter({
  start: governedProcedure({

    kind: "LEGACY_ONBOARDING_START",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "onboarding:start",

  })
    .mutation(async ({ input }) => bootSequence.start(input.strategyId)),

  advance: governedProcedure({


    kind: "LEGACY_ONBOARDING_ADVANCE",


    inputSchema: z.object({ strategyId: z.string(), step: z.number(), responses: z.record(z.string(), z.unknown()) }),


    caller: "onboarding:advance",


  })
    .mutation(async ({ input }) => bootSequence.advance(input.strategyId, input.step, input.responses)),

  complete: governedProcedure({


    kind: "LEGACY_ONBOARDING_COMPLETE",


    inputSchema: z.object({ strategyId: z.string() }),


    caller: "onboarding:complete",


  })
    .mutation(async ({ input }) => bootSequence.complete(input.strategyId)),
});
