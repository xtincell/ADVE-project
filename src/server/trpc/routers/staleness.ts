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
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "staleness");
const auditedAdmin = auditedProcedure(adminProcedure, "staleness");
/* lafusee:strangler-active */

export const stalenessRouter = createTRPCRouter({
  propagate: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
    }))
    .mutation(async ({ input }) => {
      return propagateFromPillar(input.strategyId, input.pillarKey);
    }),

  auditAll: auditedAdmin.mutation(async () => {
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

  updateConfig: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      stalenessThresholdDays: z.number().optional(),
      propagationRules: z.record(z.unknown()).optional(),
      autoRecalculate: z.boolean().optional(),
    }))
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
