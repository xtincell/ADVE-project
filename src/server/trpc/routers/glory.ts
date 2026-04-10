/**
 * GLORY Tools Router — 91 tools + 31 sequences + 9 calculators
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
      executionType: t.executionType,
      pillarKeys: t.pillarKeys,
      requiredDrivers: t.requiredDrivers,
      pillarBindings: t.pillarBindings,
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

  // ── Sequences ──

  listSequences: protectedProcedure
    .input(z.object({ family: z.string().optional() }).optional())
    .query(({ input }) => {
      const seqs = input?.family
        ? gloryTools.getSequencesByFamily(input.family as gloryTools.GlorySequenceFamily)
        : gloryTools.ALL_SEQUENCES;
      return seqs.map((s) => ({
        key: s.key,
        family: s.family,
        name: s.name,
        description: s.description,
        pillar: s.pillar,
        aiPowered: s.aiPowered,
        refined: s.refined,
        steps: s.steps.map((st) => ({ type: st.type, ref: st.ref, name: st.name, status: st.status })),
      }));
    }),

  executeSequence: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .mutation(async ({ input }) => {
      return gloryTools.executeSequence(input.sequenceKey as gloryTools.GlorySequenceKey, input.strategyId);
    }),

  // ── Scan (pre-flight readiness, passive DB read) ──

  scanSequence: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.scanSequence(input.sequenceKey as gloryTools.GlorySequenceKey, input.strategyId);
    }),

  scanAll: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.scanAllSequences(input.strategyId);
    }),

  // ── Auto-complete (Mestor-powered gap filling) ──

  autoComplete: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .mutation(async ({ input }) => {
      return gloryTools.autoCompleteGaps(input.strategyId, input.sequenceKey as gloryTools.GlorySequenceKey);
    }),

  recommendSequences: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return gloryTools.getNextSequences(input.strategyId, input.limit ?? 5);
    }),

  // ── Pillar Health ──

  pillarHealth: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.assessAllPillarsHealth(input.strategyId);
    }),

  // ── Queue (séquences prêtes à lancer) ──

  queue: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.buildQueue(input.strategyId);
    }),

  readySequences: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.getReadySequences(input.strategyId);
    }),

  // ── Deliverables (livrables prêts à compiler) ──

  compilableDeliverables: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.listCompilableDeliverables(input.strategyId);
    }),

  compileDeliverable: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .query(async ({ input }) => {
      return gloryTools.compileDeliverable(input.strategyId, input.sequenceKey as gloryTools.GlorySequenceKey);
    }),

  exportDeliverable: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .mutation(async ({ input }) => {
      return gloryTools.exportDeliverable(input.strategyId, input.sequenceKey as gloryTools.GlorySequenceKey);
    }),

  // ── Stats ──

  stats: protectedProcedure.query(() => {
    const tools = gloryTools.ALL_GLORY_TOOLS;
    const seqs = gloryTools.ALL_SEQUENCES;
    return {
      totalTools: tools.length,
      totalSequences: seqs.length,
      byExecutionType: {
        LLM: tools.filter((t) => t.executionType === "LLM").length,
        COMPOSE: tools.filter((t) => t.executionType === "COMPOSE").length,
        CALC: tools.filter((t) => t.executionType === "CALC").length,
      },
      byLayer: {
        CR: tools.filter((t) => t.layer === "CR").length,
        DC: tools.filter((t) => t.layer === "DC").length,
        HYBRID: tools.filter((t) => t.layer === "HYBRID").length,
        BRAND: tools.filter((t) => t.layer === "BRAND").length,
      },
      byFamily: {
        PILLAR: seqs.filter((s) => s.family === "PILLAR").length,
        PRODUCTION: seqs.filter((s) => s.family === "PRODUCTION").length,
        STRATEGIC: seqs.filter((s) => s.family === "STRATEGIC").length,
        OPERATIONAL: seqs.filter((s) => s.family === "OPERATIONAL").length,
      },
      plannedSteps: gloryTools.getAllPlannedSteps().length,
    };
  }),

  // ── Individual Output Viewing ──

  /** Get a single GloryOutput by ID — full content */
  getOutput: protectedProcedure
    .input(z.object({ outputId: z.string() }))
    .query(async ({ ctx, input }) => {
      const output = await ctx.db.gloryOutput.findUnique({
        where: { id: input.outputId },
        select: {
          id: true,
          toolSlug: true,
          output: true,
          createdAt: true,
          strategyId: true,
        },
      });
      if (!output) return null;

      // Resolve the tool name from registry
      const tool = gloryTools.getGloryTool(output.toolSlug);
      return {
        id: output.id,
        toolSlug: output.toolSlug,
        toolName: tool?.name ?? output.toolSlug,
        layer: tool?.layer ?? "UNKNOWN",
        output: output.output as Record<string, unknown>,
        createdAt: output.createdAt.toISOString(),
      };
    }),

  /** Get all outputs for a specific sequence execution */
  getSequenceOutputs: protectedProcedure
    .input(z.object({ strategyId: z.string(), sequenceKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const seq = gloryTools.getSequence(input.sequenceKey as gloryTools.GlorySequenceKey);
      if (!seq) return { sequenceKey: input.sequenceKey, outputs: [] };

      // Get all glory steps in this sequence
      const gloryStepSlugs = seq.steps
        .filter(s => s.type === "GLORY" || s.type === "ARTEMIS")
        .map(s => s.ref);

      // Fetch the latest output for each tool slug
      const outputs = await ctx.db.gloryOutput.findMany({
        where: {
          strategyId: input.strategyId,
          toolSlug: { in: gloryStepSlugs },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          toolSlug: true,
          output: true,
          createdAt: true,
        },
      });

      // Deduplicate: keep only the latest per toolSlug
      const seen = new Set<string>();
      const unique = outputs.filter(o => {
        if (seen.has(o.toolSlug)) return false;
        seen.add(o.toolSlug);
        return true;
      });

      return {
        sequenceKey: input.sequenceKey,
        sequenceName: seq.name,
        outputs: unique.map(o => {
          const tool = gloryTools.getGloryTool(o.toolSlug);
          return {
            id: o.id,
            toolSlug: o.toolSlug,
            toolName: tool?.name ?? o.toolSlug,
            layer: tool?.layer ?? "UNKNOWN",
            output: o.output as Record<string, unknown>,
            createdAt: o.createdAt.toISOString(),
          };
        }),
      };
    }),
});
