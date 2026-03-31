/**
 * ARTEMIS Framework Router — 24 diagnostic frameworks
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as artemis from "@/server/services/artemis";

export const frameworkRouter = createTRPCRouter({
  list: protectedProcedure.query(() => {
    return artemis.FRAMEWORKS.map((f) => ({
      slug: f.slug,
      name: f.name,
      layer: f.layer,
      pillarKeys: f.pillarKeys,
      dependencies: f.dependencies,
      description: f.description,
    }));
  }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const fw = artemis.getFramework(input.slug);
      if (!fw) throw new Error(`Framework inconnu: ${input.slug}`);
      return fw;
    }),

  getByLayer: protectedProcedure
    .input(z.object({ layer: z.string() }))
    .query(({ input }) => artemis.getFrameworksByLayer(input.layer as never)),

  getByPillar: protectedProcedure
    .input(z.object({ pillarKey: z.string() }))
    .query(({ input }) => artemis.getFrameworksByPillar(input.pillarKey)),

  execute: protectedProcedure
    .input(z.object({
      frameworkSlug: z.string(),
      strategyId: z.string(),
      input: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      return artemis.executeFramework(input.frameworkSlug, input.strategyId, input.input as Record<string, unknown>);
    }),

  runBatch: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      frameworkSlugs: z.array(z.string()),
      inputs: z.record(z.record(z.unknown())),
    }))
    .mutation(async ({ input }) => {
      return artemis.runDiagnosticBatch(input.strategyId, input.frameworkSlugs, input.inputs as Record<string, Record<string, unknown>>);
    }),

  runPillarDiagnostic: protectedProcedure
    .input(z.object({ strategyId: z.string(), pillarKey: z.string(), inputs: z.record(z.record(z.unknown())) }))
    .mutation(async ({ input }) => {
      return artemis.runPillarDiagnostic(input.strategyId, input.pillarKey, input.inputs as Record<string, Record<string, unknown>>);
    }),

  history: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => artemis.getDiagnosticHistory(input.strategyId)),

  differential: protectedProcedure
    .input(z.object({ strategyId: z.string(), fromDate: z.date(), toDate: z.date() }))
    .query(({ input }) => artemis.differentialDiagnosis(input.strategyId, input.fromDate, input.toDate)),

  getDependencyOrder: protectedProcedure
    .input(z.object({ slugs: z.array(z.string()) }))
    .query(({ input }) => artemis.topologicalSort(input.slugs)),
});
