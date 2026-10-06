import { z } from "zod";
import { createTRPCRouter, operatorProcedure, publicProcedure } from "../init";
import { strategyScopedProcedure, assertRawStrategyScope } from "../middleware/strategy-scope";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */
import { specimenInputSchema, metricInputSchema, analysisInputSchema, recipeInputSchema, watchlistSchema } from "@/domain/creative-intelligence";
import { importSpecimen, recordMetric, annotateSpecimen, discoverRecipe, reviewRecipe, corpusOverview, listRecipes, saveWatchlist, applyRecipeSchema, applyRecipe, resolveApplication, creativeOpportunities } from "@/server/services/seshat/creative-intelligence";

const brandInput = z.object({ strategyId: z.string().min(1) });
const optionalBrandInput = z.object({ strategyId: z.string().min(1).optional() });

export const creativeIntelligenceRouter = createTRPCRouter({
  corpus: operatorProcedure.input(optionalBrandInput).query(async ({ ctx, input }) => {
    await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
    return corpusOverview(input.strategyId, ctx.db);
  }),
  brandCorpus: strategyScopedProcedure.input(brandInput).query(({ ctx, input }) => corpusOverview(input.strategyId, ctx.db)),
  recipes: operatorProcedure.input(optionalBrandInput).query(async ({ ctx, input }) => {
    await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
    return listRecipes(input.strategyId, ctx.db);
  }),
  brandRecipes: strategyScopedProcedure.input(brandInput).query(({ ctx, input }) => listRecipes(input.strategyId, ctx.db)),
  opportunities: strategyScopedProcedure.input(brandInput).query(({ ctx, input }) => creativeOpportunities(input.strategyId, ctx.db)),
  publicRecipes: publicProcedure.query(({ ctx }) => listRecipes(undefined, ctx.db, true)),
  applications: strategyScopedProcedure.input(brandInput).query(({ ctx, input }) => ctx.db.recipeApplication.findMany({ where: { strategyId: input.strategyId }, orderBy: { createdAt: "desc" }, take: 100 })),
  watchlist: strategyScopedProcedure.input(brandInput).query(async ({ ctx, input }) => {
    const strategy = await ctx.db.strategy.findUnique({ where: { id: input.strategyId }, select: { businessContext: true } });
    const data = watchlistSchema.safeParse((strategy?.businessContext as Record<string, unknown> | null)?.creativeWatchlist ?? []);
    return data.success ? data.data : [];
  }),
  brandRefs: operatorProcedure.query(({ ctx }) => ctx.db.brandRef.findMany({ select: { id: true, name: true, countryCode: true, sectorSlug: true }, take: 200, orderBy: { name: "asc" } })),
  importSpecimen: governedProcedure({ kind: "SESHAT_IMPORT_SPECIMEN", inputSchema: specimenInputSchema, requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => importSpecimen(input, ctx.db)),
  recordMetric: governedProcedure({ kind: "SESHAT_RECORD_CONTENT_METRIC", inputSchema: metricInputSchema, requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => recordMetric(input, ctx.db)),
  annotate: governedProcedure({ kind: "SESHAT_ANNOTATE_CREATIVE", inputSchema: analysisInputSchema, requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => annotateSpecimen(input, ctx.session.user.id, ctx.db)),
  discover: governedProcedure({ kind: "SESHAT_DISCOVER_RECIPE", inputSchema: recipeInputSchema, requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => discoverRecipe(input, ctx.db)),
  review: governedProcedure({ kind: "SESHAT_REVIEW_RECIPE", inputSchema: optionalBrandInput.extend({ recipeId: z.string().min(1), publish: z.boolean() }), requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => reviewRecipe(input.recipeId, input.strategyId, input.publish, ctx.session.user.id, ctx.db)),
  saveWatchlist: governedProcedure({ kind: "SESHAT_SAVE_CREATIVE_WATCHLIST", inputSchema: brandInput.extend({ watchlist: watchlistSchema }), requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => saveWatchlist(input.strategyId, input.watchlist, ctx.db)),
  startTrial: governedProcedure({ kind: "SESHAT_APPLY_RECIPE", inputSchema: applyRecipeSchema, requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => applyRecipe(input, ctx.db)),
  resolve: governedProcedure({ kind: "SESHAT_RESOLVE_RECIPE_APPLICATION", inputSchema: brandInput.extend({ applicationId: z.string().min(1), specimenId: z.string().min(1), metricId: z.string().min(1) }), requireOperator: true, caller: "argos:creative-intelligence" }).mutation(({ ctx, input }) => resolveApplication(input, ctx.db)),
});
