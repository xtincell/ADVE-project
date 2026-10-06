import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { annotationSchema } from "@/domain/creative-intelligence";
import { conditionalPerformance, patternTrajectory } from "@/domain/creative-models";
import { embed } from "@/server/services/llm-gateway";
import { checkBudget } from "@/server/services/ai-cost-tracker";
import { cosineSimilarity } from "@/server/services/seshat/context-store/embedder";
import { registerDelegateHandler, getDelegateHandler } from "@/server/services/artemis/tools/delegate-registry";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { listRecipes, observations, assertWritableSpecimen, assertActiveMarket } from ".";

export const patternIndexInput = z.object({ strategyId: z.string().min(1).optional(), recipeIds: z.array(z.string().min(1)).min(1).max(10) });
registerDelegateHandler("creative-intelligence:index-patterns", async (input, ctx) => {
  const parsed = patternIndexInput.parse(JSON.parse(input.pattern_input ?? "{}"));
  if ((parsed.strategyId ?? "(global)") !== ctx.strategyId) throw new Error("Le périmètre d'indexation doit correspondre au contexte gouverné.");
  const allowed = (await listRecipes(parsed.strategyId)).filter(r => r.reviewed && parsed.recipeIds.includes(r.id));
  if (allowed.length !== new Set(parsed.recipeIds).size) throw new Error("Toutes les recettes doivent être revues et accessibles.");
  if (!parsed.strategyId && allowed.some(r => !r.published)) throw new Error("L'index partagé accepte seulement les recettes publiques publiées.");
  if (parsed.strategyId) {
    const budget = await checkBudget(parsed.strategyId);
    if (!budget.allowed || budget.remaining < 0.05) return { state: "DEGRADED", reason: "BUDGET_EXCEEDED" };
  }
  const descriptions = await Promise.all(allowed.map(async recipe => {
    const evidence = await db.patternEvidence.findMany({ where: { recipeId: recipe.id, role: "EXAMPLE", analysis: { method: "MANUAL" } }, take: 8, include: { analysis: { select: { annotation: true } } } });
    return JSON.stringify({ mechanism: [recipe.context.hook, recipe.context.narrative, recipe.context.visual], observations: evidence.flatMap(e => { const a = annotationSchema.safeParse(e.analysis.annotation); return a.success ? a.data.evidence.map(p => p.observation) : []; }) }).slice(0, 16000);
  }));
  const result = await embed({ input: descriptions, caller: "creative-intelligence:patterns" });
  if (result.provider === "none" || result.dim === 0) return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "embedding-gateway" };
  // Embedding transports expose tokens, not billing receipts. Mark the SLO reserve as estimated.
  if (parsed.strategyId) await db.aICostLog.create({ data: { strategyId: parsed.strategyId, provider: result.provider, model: result.model, inputTokens: result.inputTokens, outputTokens: 0, cost: 0.05, context: "creative-intelligence:patterns:estimated-cost" } });
  if (result.embeddings.length !== allowed.length || result.embeddings.some(v => v.length !== result.dim || !v.every(Number.isFinite) || !v.some(x => x !== 0))) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  await db.$transaction(async tx => {
    for (const [i, r] of allowed.entries()) {
      const metadata = { recipeId: r.id, embeddingDim: result.dim, embeddingModel: result.model, embeddingProvider: result.provider };
      const payload = { recipeId: r.id, revision: r.revision };
      if (parsed.strategyId) {
        const nodeId = createHash("sha256").update(JSON.stringify(["CREATIVE_RECIPE", parsed.strategyId, r.id])).digest("hex");
        const data = { embedding: result.embeddings[i]!, embeddingDim: result.dim, embeddingModel: result.model, embeddingProvider: result.provider, metadata, payload, embeddedAt: new Date() };
        await tx.brandContextNode.upsert({ where: { id: nodeId }, create: { id: nodeId, kind: "CREATIVE_RECIPE", strategyId: parsed.strategyId, sourceId: r.id, ...data }, update: data });
      } else {
        if (!r.published) throw new Error("L'index partagé accepte seulement les recettes publiques publiées.");
        const data = { embedding: result.embeddings[i]!, metadata, payload, embeddedAt: new Date() };
        await tx.marketContextNode.upsert({ where: { kind_refId: { kind: "CREATIVE_RECIPE", refId: r.id } }, create: { kind: "CREATIVE_RECIPE", refId: r.id, ...data }, update: data });
      }
    }
  });
  return { state: "LIVE", indexed: allowed.length, model: result.model };
});

export async function indexCreativePatterns(input: z.infer<typeof patternIndexInput>) {
  const tool = getGloryTool("creative-pattern-indexer"), handler = tool?.delegateDescriptor && getDelegateHandler(tool.delegateDescriptor.handlerKey);
  if (!handler) throw new Error("Outil de rapprochement indisponible.");
  return handler({ pattern_input: JSON.stringify(patternIndexInput.parse(input)) }, { strategyId: input.strategyId ?? "(global)" });
}

export async function similarCreativeRecipes(strategyId: string, recipeId: string) {
  const recipes = (await listRecipes(strategyId)).filter(r => r.reviewed);
  const target = recipes.find(r => r.id === recipeId);
  if (!target) throw new Error("Recette revue indisponible.");
  // Semantics proposes neighbours within a compatible mechanism; never merges evidence/revisions.
  const compatible = recipes.filter(r => r.id !== recipeId && r.context.hook === target.context.hook && r.context.narrative === target.context.narrative && r.context.format === target.context.format);
  const ids = [recipeId, ...compatible.map(r => r.id)];
  const [brand, shared] = await Promise.all([
    db.brandContextNode.findMany({ where: { strategyId, kind: "CREATIVE_RECIPE", sourceId: { in: ids } } }),
    db.marketContextNode.findMany({ where: { kind: "CREATIVE_RECIPE", refId: { in: recipes.filter(r => r.published && ids.includes(r.id)).map(r => r.id) } } }),
  ]);
  const rows = [...brand.map(r => ({ id: r.sourceId!, embedding: r.embedding, embeddingDim: r.embeddingDim, embeddingModel: r.embeddingModel, embeddingProvider: r.embeddingProvider })), ...shared.map(r => { const m = r.metadata as { embeddingDim?: number; embeddingModel?: string; embeddingProvider?: string } | null; return { id: r.refId, embedding: r.embedding, embeddingDim: m?.embeddingDim, embeddingModel: m?.embeddingModel, embeddingProvider: m?.embeddingProvider }; })];
  const unique = [...new Map(rows.toReversed().map(r => [r.id, r])).values()];
  const vector = unique.find(r => r.id === recipeId);
  if (!vector?.embedding.length) return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "creative-pattern-index", neighbours: [] };
  const neighbours = unique.filter(r => r.id !== recipeId && r.embeddingDim === vector.embeddingDim && r.embeddingModel === vector.embeddingModel && r.embeddingProvider === vector.embeddingProvider && r.embedding.length === vector.embedding.length).map(r => ({ recipeId: r.id, similarity: cosineSimilarity(vector.embedding, r.embedding) })).filter(r => Number.isFinite(r.similarity) && r.similarity >= 0.75).sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  return { state: "LIVE" as const, method: "compatible-mechanism-embedding-cosine-v1", neighbours, limitation: "Proximité des descriptions revues ; aucune fusion de preuves ni efficacité présumée." };
}

export async function contentPerformanceModel(strategyId: string, specimenId: string) {
  const target = await assertWritableSpecimen(db, specimenId, strategyId);
  const { rows } = await observations(db, strategyId, new Date(), "views", { sector: target.sector, countryCode: target.countryCode, platform: target.platform, format: target.format });
  const observation = rows.find(r => r.specimenId === specimenId);
  if (!observation) return { state: "INSUFFICIENT_DATA" as const, reason: "UNMEASURED", expected: null, ratio: null, interval: null };
  return conditionalPerformance(observation, rows);
}

export async function creativePatternTrajectory(strategyId: string, recipeId: string) {
  const recipe = (await listRecipes(strategyId)).find(r => r.id === recipeId && r.reviewed);
  if (!recipe) throw new Error("Recette revue indisponible.");
  await assertActiveMarket(db, recipe.context.countryCode);
  const asOf = new Date(), { specimens } = await observations(db, strategyId, asOf, "views", { sector: recipe.context.sector, format: recipe.context.format });
  const visibleMarkets = new Set((await db.country.findMany({ where: { status: "ACTIVE" }, select: { code: true } })).map(c => c.code));
  const rows = specimens.filter(s => visibleMarkets.has(s.countryCode)).flatMap(s => {
    const analysis = s.analyses[0], annotation = annotationSchema.safeParse(analysis?.annotation);
    return [{ externalId: s.externalId, specimenId: s.id, accountId: s.accountId, platform: s.platform, format: s.format, sector: s.sector, countryCode: s.countryCode, publishedAt: s.publishedAt, observedAt: s.createdAt, value: null, paidStatus: "UNKNOWN", metricId: "", ...(analysis && annotation.success ? { analysisId: analysis.id, annotation: annotation.data } : {}) }];
  });
  return patternTrajectory(rows, recipe.context, asOf);
}
