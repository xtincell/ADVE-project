/**
 * GLORY Tools Router — 91 tools + 31 sequences + 9 calculators
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import * as gloryTools from "@/server/services/glory-tools";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { parseLaunchTimeline, parseContentCalendar, parseSocialNaming, parseSocialCopy, deriveDatedPosts } from "@/lib/types/launch-calendar";
import { estimateSequenceCost } from "@/server/services/artemis/tools/sequence-cost";
/* lafusee:governed-active */

export const gloryRouter = createTRPCRouter({
  listAll: protectedProcedure.query(() => {
    return gloryTools.EXTENDED_GLORY_TOOLS.map((t) => ({
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
      // Strip Zod instances (outputSchema / manualFormSchema) — not serializable
      // over tRPC. HYBRID tools expose their manual form via `getManualForm`
      // (JSON-Schema projection). Cf. Phase 23 Story 5.5.
      const { outputSchema: _o, manualFormSchema: _m, ...serializable } = tool;
      void _o;
      void _m;
      return serializable;
    }),

  getByLayer: protectedProcedure
    .input(z.object({ layer: z.enum(["CR", "DC", "HYBRID", "BRAND"]) }))
    .query(({ input }) => gloryTools.getToolsByLayer(input.layer)),

  // ── Phase 23 (Story 5.5) — HYBRID peer-toggle surface ──
  //
  // `getManualForm` projette le `manualFormSchema` Zod d'un tool HYBRID en JSON
  // Schema sérialisable, consommé par le formulaire schema-driven (UX-DR9). Read
  // via operatorProcedure. Retourne null si le slug n'est pas HYBRID.
  getManualForm: operatorProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => gloryTools.getHybridManualForm(input.slug)),

  // `executeHybrid` route un tool HYBRID via le dispatcher unifié `executeHybridTool`
  // (jamais `executeStructuredLLMCall` direct — invariant HARD Story 5.6). `preferManual`
  // sélectionne explicitement le chemin manuel ; `manualEntry` porte la saisie opérateur
  // à valider contre `manualFormSchema` ; `fullAuto` (3ᵉ mode « à mes risques ») bypasse
  // la bascule manuelle sur sortie LLM invalide → résultat at-risk flaggé. Mutation via
  // governedProcedure.
  executeHybrid: governedProcedure({
    kind: "LEGACY_GLORY_EXECUTE",
    inputSchema: z.object({
      toolSlug: z.string(),
      strategyId: z.string(),
      input: z.record(z.string(), z.string()).default({}),
      preferManual: z.boolean().optional(),
      manualEntry: z.record(z.string(), z.unknown()).optional(),
      fullAuto: z.boolean().optional(),
    }),
    caller: "glory:executeHybrid",
  })
    .mutation(async ({ input }) => {
      return gloryTools.executeHybridTool(input.toolSlug, input.strategyId, input.input, {
        preferManual: input.preferManual,
        manualEntry: input.manualEntry,
        fullAuto: input.fullAuto,
      });
    }),

  getByPillar: protectedProcedure
    .input(z.object({ pillarKey: z.string() }))
    .query(({ input }) => gloryTools.getToolsByPillar(input.pillarKey)),

  getByDriver: protectedProcedure
    .input(z.object({ driver: z.string() }))
    .query(({ input }) => gloryTools.getToolsByDriver(input.driver)),

  getBrandPipeline: protectedProcedure.query(() => gloryTools.getBrandPipeline()),

  execute: governedProcedure({


    kind: "LEGACY_GLORY_EXECUTE",


    inputSchema: z.object({
      toolSlug: z.string(),
      strategyId: z.string(),
      input: z.record(z.string(), z.string()),
    }),


    caller: "glory:execute",


  })
    .mutation(async ({ input }) => {
      return gloryTools.executeTool(input.toolSlug, input.strategyId, input.input);
    }),

  executeBrandPipeline: governedProcedure({


    kind: "LEGACY_GLORY_EXECUTE_BRAND_PIPELINE",


    inputSchema: z.object({ strategyId: z.string(), initialInput: z.record(z.string(), z.string()) }),


    caller: "glory:executeBrandPipeline",


  })
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
        refined: s.lifecycle === "STABLE",
        steps: s.steps.map((st) => ({ type: st.type, ref: st.ref, name: st.name, status: st.status })),
      }));
    }),

  // ── Launchable sequences (Phase 24) — sequence list enriched with a
  //    deterministic cost estimate, for the Cockpit brand-side launcher.
  //    Cost is shown + confirmed before any LLM-billed run.
  launchableSequences: protectedProcedure
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
        pillar: s.pillar ?? null,
        aiPowered: s.aiPowered,
        lifecycle: s.lifecycle ?? "DRAFT",
        tier: s.tier,
        stepCount: s.steps.filter((st) => st.status === "ACTIVE").length,
        cost: estimateSequenceCost(s),
      }));
    }),

  executeSequence: governedProcedure({


    kind: "LEGACY_GLORY_EXECUTE_SEQUENCE",


    inputSchema: z.object({
      strategyId: z.string(),
      sequenceKey: z.string(),
      briefContext: z.record(z.string(), z.unknown()).optional(),
      campaignId: z.string().optional(),
    }),


    caller: "glory:executeSequence",


  })
    .mutation(async ({ input }) => {
      const key = input.sequenceKey as gloryTools.GlorySequenceKey;

      // Server-side pre-flight: check vault prerequisites
      const seq = gloryTools.getSequence(key);
      if (seq) {
        const requires = (seq as { requires?: Array<{ type: string; key?: string; tier?: number; count?: number; maturity?: string }> }).requires ?? [];
        if (requires.length > 0) {
          const { checkPrerequisites } = await import("@/server/services/sequence-vault");
          const check = await checkPrerequisites(input.strategyId, requires as Parameters<typeof checkPrerequisites>[1]);
          if (check.blocked) {
            const unmetDesc = check.unmet.map((u: { type: string; key?: string; count?: number; tier?: number; maturity?: string }) =>
              u.type === "SEQUENCE" ? `${u.key} accepted`
              : u.type === "SEQUENCE_ANY" ? `${u.count}x tier ${u.tier} accepted`
              : `pillar ${u.key} ${u.maturity}`
            ).join(", ");
            throw new Error(`Pre-flight bloque: prerequis non remplis — ${unmetDesc}`);
          }
        }
      }

      return gloryTools.executeSequence(
        key,
        input.strategyId,
        {},
        undefined,
        input.briefContext || input.campaignId
          ? { briefContext: input.briefContext, campaignId: input.campaignId }
          : undefined,
      );
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

  autoComplete: governedProcedure({


    kind: "LEGACY_GLORY_AUTO_COMPLETE",


    inputSchema: z.object({ strategyId: z.string(), sequenceKey: z.string() }),


    caller: "glory:autoComplete",


  })
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

  exportDeliverable: governedProcedure({


    kind: "LEGACY_GLORY_EXPORT_DELIVERABLE",


    inputSchema: z.object({ strategyId: z.string(), sequenceKey: z.string() }),


    caller: "glory:exportDeliverable",


  })
    .mutation(async ({ input }) => {
      return gloryTools.exportDeliverable(input.strategyId, input.sequenceKey as gloryTools.GlorySequenceKey);
    }),

  // ── Stats ──

  stats: protectedProcedure.query(() => {
    const tools = gloryTools.EXTENDED_GLORY_TOOLS;
    const seqs = gloryTools.ALL_SEQUENCES;
    return {
      totalTools: tools.length,
      totalSequences: seqs.length,
      byExecutionType: {
        LLM: tools.filter((t) => t.executionType === "LLM").length,
        COMPOSE: tools.filter((t) => t.executionType === "COMPOSE").length,
        CALC: tools.filter((t) => t.executionType === "CALC").length,
        HYBRID: tools.filter((t) => t.executionType === "HYBRID").length,
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

  // ── Launch kit (Phase 24) — surface the launch/social GloryOutputs as a
  //    typed, renderable plan instead of dormant vault JSON. Four standalone
  //    deliverables (GTM timeline, editorial calendar, recommended handles,
  //    per-platform social copy) consumed by both the launch-calendar surface
  //    and the operational deliverables hub. Pure read, tenant-scoped via ctx.db.
  launchCalendar: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.gloryOutput.findMany({
        where: {
          strategyId: input.strategyId,
          toolSlug: {
            in: [
              "launch-timeline-planner",
              "content-calendar-strategist",
              "naming-generator",
              "social-copy-engine",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        select: { toolSlug: true, output: true, createdAt: true },
      });
      const pick = (slug: string) => rows.find((r) => r.toolSlug === slug);
      const timelineRow = pick("launch-timeline-planner");
      const calendarRow = pick("content-calendar-strategist");
      const namingRow = pick("naming-generator");
      const socialRow = pick("social-copy-engine");
      const generatedAt = [timelineRow?.createdAt, calendarRow?.createdAt, namingRow?.createdAt, socialRow?.createdAt]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      const timeline = parseLaunchTimeline(timelineRow?.output ?? null);
      const calendar = parseContentCalendar(calendarRow?.output ?? null);
      // Read-side fallback: outputs predating the posts[] field (or hand-written
      // deterministic seeds) get a dated post-by-post calendar derived from their
      // cadence, anchored on the launch timeline J1. Pure + deterministic.
      if (calendar && calendar.posts.length === 0) {
        calendar.posts = deriveDatedPosts(calendar, timeline?.anchorJ1 ?? null, 4);
      }

      return {
        timeline,
        calendar,
        naming: parseSocialNaming(namingRow?.output ?? null),
        social: parseSocialCopy(socialRow?.output ?? null),
        generatedAt: generatedAt ? generatedAt.toISOString() : null,
      };
    }),
});
