/**
 * GLORY Tools Router — 39 creative tools across 4 layers
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as gloryTools from "@/server/services/glory-tools";

export const gloryRouter = createTRPCRouter({
  listAll: protectedProcedure.query(() => {
    return gloryTools.ALL_GLORY_TOOLS.map((t) => ({
      slug: t.slug,
      name: t.name,
      layer: t.layer,
      order: t.order,
      pillarKeys: t.pillarKeys,
      requiredDrivers: t.requiredDrivers,
      description: t.description,
    }));
  }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const tool = gloryTools.getGloryTool(input.slug);
      if (!tool) throw new Error(`GLORY tool inconnu: ${input.slug}`);
      return tool;
    }),

  getByLayer: protectedProcedure
    .input(z.object({ layer: z.enum(["CR", "DC", "HYBRID", "BRAND"]) }))
    .query(({ input }) => gloryTools.getToolsByLayer(input.layer)),

  getByPillar: protectedProcedure
    .input(z.object({ pillarKey: z.string() }))
    .query(({ input }) => gloryTools.getToolsByPillar(input.pillarKey)),

  getByDriver: protectedProcedure
    .input(z.object({ driver: z.string() }))
    .query(({ input }) => gloryTools.getToolsByDriver(input.driver)),

  getBrandPipeline: protectedProcedure.query(() => gloryTools.getBrandPipeline()),

  execute: protectedProcedure
    .input(z.object({
      toolSlug: z.string(),
      strategyId: z.string(),
      input: z.record(z.string()),
    }))
    .mutation(async ({ input }) => {
      return gloryTools.executeTool(input.toolSlug, input.strategyId, input.input);
    }),

  executeBrandPipeline: protectedProcedure
    .input(z.object({ strategyId: z.string(), initialInput: z.record(z.string()) }))
    .mutation(async ({ input }) => {
      return gloryTools.executeBrandPipeline(input.strategyId, input.initialInput);
    }),

  history: protectedProcedure
    .input(z.object({ strategyId: z.string(), toolSlug: z.string().optional() }))
    .query(({ input }) => gloryTools.getToolHistory(input.strategyId, input.toolSlug)),

  suggest: protectedProcedure
    .input(z.object({
      pillarWeaknesses: z.array(z.string()),
      activeDrivers: z.array(z.string()),
      phase: z.enum(["QUICK_INTAKE", "BOOT", "ACTIVE", "GROWTH"]),
    }))
    .query(({ input }) => gloryTools.suggestTools(input.pillarWeaknesses, input.activeDrivers, input.phase)),
});
