/**
 * Staleness Propagator Router — Cascade recalculation, audit, config
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import {
  propagateFromPillar,
  auditAllStrategies,
  getTransitiveDependencies,
} from "@/server/services/staleness-propagator";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const stalenessRouter = createTRPCRouter({
  propagate: governedProcedure({

    kind: "LEGACY_STALENESS_PROPAGATE",

    inputSchema: z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
    }),

    caller: "staleness:propagate",

  })
    .mutation(async ({ input }) => {
      return propagateFromPillar(input.strategyId, input.pillarKey);
    }),

  auditAll: governedProcedure({
    kind: "LEGACY_STALENESS_AUDIT_ALL",
    inputSchema: z.object({}),
    caller: "staleness:auditAll",
  }).mutation(async () => {
    return auditAllStrategies();
  }),

  getDependencies: protectedProcedure
    .input(z.object({ pillarKey: z.string() }))
    .query(({ input }) => {
      return getTransitiveDependencies(input.pillarKey);
    }),

  getConfig: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.variableStoreConfig.findUnique({
        where: { strategyId: input.strategyId },
      });
    }),

  updateConfig: governedProcedure({


    kind: "LEGACY_STALENESS_UPDATE_CONFIG",


    inputSchema: z.object({
      strategyId: z.string(),
      stalenessThresholdDays: z.number().optional(),
      propagationRules: z.record(z.string(), z.unknown()).optional(),
      autoRecalculate: z.boolean().optional(),
    }),


    caller: "staleness:updateConfig",


  })
    .mutation(async ({ ctx, input }) => {
      const { strategyId, propagationRules, ...rest } = input;
      return ctx.db.variableStoreConfig.upsert({
        where: { strategyId },
        create: {
          strategyId,
          ...rest,
          propagationRules: propagationRules as Prisma.InputJsonValue,
        },
        update: {
          ...rest,
          ...(propagationRules ? { propagationRules: propagationRules as Prisma.InputJsonValue } : {}),
        },
      });
    }),
});
