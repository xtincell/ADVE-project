/**
 * Staleness Propagator Router — Cascade recalculation, audit, config.
 *
 * Phase 3 wave 1 (PR-D refonte foundation v6.1.x): all 3 mutations promoted
 * from strangler `auditedProcedure` to `governedProcedure`. Each mutation
 * now carries a dedicated Intent kind + SLO (cf. intent-kinds.ts +
 * slos.ts entries STALENESS_*).
 *
 * Queries (`getDependencies`, `getConfig`) remain `protectedProcedure` —
 * no governance needed for read-only, no IntentEmission row produced.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  propagateFromPillar,
  auditAllStrategies,
  getTransitiveDependencies,
} from "@/server/services/staleness-propagator";
import { governedProcedure } from "@/server/governance/governed-procedure";

export const stalenessRouter = createTRPCRouter({
  propagate: governedProcedure({
    kind: "STALENESS_PROPAGATE",
    inputSchema: z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
    }),
  }).mutation(async ({ input }) => {
    return propagateFromPillar(input.strategyId, input.pillarKey);
  }),

  auditAll: governedProcedure({
    kind: "STALENESS_AUDIT_ALL",
    inputSchema: z.object({}),
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
    kind: "STALENESS_UPDATE_CONFIG",
    inputSchema: z.object({
      strategyId: z.string(),
      stalenessThresholdDays: z.number().optional(),
      propagationRules: z.record(z.string(), z.unknown()).optional(),
      autoRecalculate: z.boolean().optional(),
    }),
  }).mutation(async ({ ctx, input }) => {
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
