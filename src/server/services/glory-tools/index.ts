/**
 * GLORY Tools — Execution Engine
 * Runs tools with AI (Claude), tracks outputs, manages the BRAND pipeline
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { ALL_GLORY_TOOLS, getGloryTool, getBrandPipelineDependencyOrder, type GloryToolDef } from "./registry";

export { ALL_GLORY_TOOLS, getGloryTool, getToolsByLayer, getToolsByPillar, getToolsByDriver, getBrandPipeline } from "./registry";

/**
 * Load strategy context for enriching GLORY tool prompts
 */
async function loadStrategyContext(strategyId: string): Promise<string> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { pillars: true, drivers: { where: { deletedAt: null, status: "ACTIVE" } } },
  });
  if (!strategy) return "";

  const vec = strategy.advertis_vector as Record<string, number> | null;
  const lines = [
    "--- CONTEXTE STRATEGIE ---",
    `Marque: ${strategy.name}`,
    `Description: ${strategy.description ?? "N/A"}`,
  ];
  if (vec) {
    lines.push(`Score ADVE: A=${vec.a ?? 0}, D=${vec.d ?? 0}, V=${vec.v ?? 0}, E=${vec.e ?? 0}, R=${vec.r ?? 0}, T=${vec.t ?? 0}, I=${vec.i ?? 0}, S=${vec.s ?? 0}`);
  }
  const bizCtx = strategy.businessContext as Record<string, unknown> | null;
  if (bizCtx) {
    lines.push(`Modele d'affaires: ${bizCtx.businessModel ?? "N/A"}`);
    lines.push(`Positionnement: ${bizCtx.positioningArchetype ?? "N/A"}`);
  }
  if (strategy.pillars.length > 0) {
    for (const p of strategy.pillars) {
      const content = p.content as Record<string, unknown> | null;
      if (content?.summary) lines.push(`Pilier ${p.key}: ${content.summary}`);
    }
  }
  if (strategy.drivers.length > 0) {
    lines.push(`Drivers actifs: ${strategy.drivers.map((d) => `${d.name} (${d.channel})`).join(", ")}`);
  }
  lines.push("--- FIN CONTEXTE ---");
  return lines.join("\n");
}

/**
 * Execute a GLORY tool with real Claude AI call and persist the output
 */
export async function executeTool(
  toolSlug: string,
  strategyId: string,
  input: Record<string, string>
): Promise<{ outputId: string; output: Record<string, unknown> }> {
  const tool = getGloryTool(toolSlug);
  if (!tool) throw new Error(`GLORY tool inconnu: ${toolSlug}`);

  // Validate required inputs
  const missingFields = tool.inputFields.filter((f) => !input[f]);
  if (missingFields.length > 0) {
    throw new Error(`Champs manquants: ${missingFields.join(", ")}`);
  }

  // Build prompt from template
  let userPrompt = tool.promptTemplate;
  for (const [key, value] of Object.entries(input)) {
    userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  // Load strategy context
  const strategyContext = await loadStrategyContext(strategyId);

  const systemPrompt = `Tu es un expert en strategie de marque et en creation publicitaire, specialise dans le marche africain.
Tu utilises le protocole ADVE-RTIS (8 piliers: Authenticite, Distinction, Valeur, Engagement, Risk, Track, Implementation, Strategie).
Tu produis des outputs structures, actionnables, et adaptes au contexte culturel et economique de la marque.
Reponds en francais. Sois precis, concret, et oriente resultats.
Format de sortie: JSON structure avec les champs suivants: ${tool.outputFormat}

${strategyContext}`;

  const startTime = Date.now();
  let aiOutput: Record<string, unknown>;
  let aiText = "";

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 4096,
    });

    aiText = result.text;
    const durationMs = Date.now() - startTime;

    // Try to parse JSON from the response
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      aiOutput = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: aiText };
    } catch {
      aiOutput = { content: aiText };
    }

    // Track AI cost
    await db.aICostLog.create({
      data: {
        model: "claude-sonnet-4-20250514",
        provider: "anthropic",
        inputTokens: result.usage?.promptTokens ?? 0,
        outputTokens: result.usage?.completionTokens ?? 0,
        cost: ((result.usage?.promptTokens ?? 0) / 1_000_000) * 3 + ((result.usage?.completionTokens ?? 0) / 1_000_000) * 15,
        context: `glory:${toolSlug}`,
        strategyId,
      },
    }).catch((err) => { console.warn("[glory-tools] AI cost log failed:", err instanceof Error ? err.message : err); }); // Non-blocking

    aiOutput = {
      ...aiOutput,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        durationMs,
        model: "claude-sonnet-4-20250514",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    // Fallback if AI call fails
    aiOutput = {
      content: `Erreur lors de l'execution de ${tool.name}: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        error: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const gloryOutput = await db.gloryOutput.create({
    data: {
      strategyId,
      toolSlug: tool.slug,
      output: aiOutput as never,
      advertis_vector: { pillars: tool.pillarKeys },
    },
  });

  return { outputId: gloryOutput.id, output: aiOutput };
}

/**
 * Execute the full BRAND pipeline (10 sequential tools)
 */
export async function executeBrandPipeline(
  strategyId: string,
  initialInput: Record<string, string>,
  onProgress?: (step: number, total: number, toolSlug: string) => void
): Promise<Array<{ slug: string; outputId: string; status: string }>> {
  const order = getBrandPipelineDependencyOrder();
  const results: Array<{ slug: string; outputId: string; status: string }> = [];
  const pipelineOutputs: Record<string, Record<string, unknown>> = {};

  for (let i = 0; i < order.length; i++) {
    const slug = order[i]!;
    onProgress?.(i + 1, order.length, slug);

    try {
      // Merge initial input with outputs from previous tools
      const mergedInput: Record<string, string> = { ...initialInput };
      for (const [prevSlug, prevOutput] of Object.entries(pipelineOutputs)) {
        mergedInput[prevSlug] = JSON.stringify(prevOutput);
      }

      const { outputId, output } = await executeTool(slug, strategyId, mergedInput);
      pipelineOutputs[slug] = output;
      results.push({ slug, outputId, status: "COMPLETED" });

      // Auto-apply BRAND pipeline output to D.directionArtistique
      const fieldMap: Record<string, string> = {
        "semiotic-brand-analyzer": "semioticAnalysis",
        "visual-landscape-mapper": "visualLandscape",
        "moodboard-generator": "moodboard",
        "chromatic-strategist": "chromaticStrategy",
        "typography-system-designer": "typographySystem",
        "logotype-recommender": "logoTypeRecommendation",
        "logo-validator": "logoValidation",
        "design-token-generator": "designTokens",
        "motion-identity-designer": "motionIdentity",
        "brand-guidelines-compiler": "brandGuidelines",
      };
      const targetField = fieldMap[slug];
      if (targetField) {
        try {
          const pillar = await db.pillar.findUnique({
            where: { strategyId_key: { strategyId, key: "d" } },
          });
          const content = (pillar?.content as Record<string, unknown>) ?? {};
          const da = (content.directionArtistique as Record<string, unknown>) ?? {};
          const { _meta, ...cleanOutput } = output;
          da[targetField] = { ...cleanOutput, gloryOutputId: outputId };
          content.directionArtistique = da;
          await db.pillar.upsert({
            where: { strategyId_key: { strategyId, key: "d" } },
            update: { content: content as unknown as import("@prisma/client").Prisma.InputJsonValue },
            create: { strategyId, key: "d", content: content as unknown as import("@prisma/client").Prisma.InputJsonValue, confidence: 0.6 },
          });
        } catch (applyErr) {
          console.warn(`[glory-pipeline] auto-apply ${slug} → D.${targetField} failed:`, applyErr instanceof Error ? applyErr.message : applyErr);
        }
      }
    } catch (error) {
      results.push({ slug, outputId: "", status: "FAILED" });
    }
  }

  return results;
}

/**
 * Get tool execution history for a strategy
 */
export async function getToolHistory(strategyId: string, toolSlug?: string) {
  return db.gloryOutput.findMany({
    where: {
      strategyId,
      ...(toolSlug ? { toolSlug } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Suggest tools based on strategy context
 */
export function suggestTools(
  pillarWeaknesses: string[],
  activeDrivers: string[],
  phase: "QUICK_INTAKE" | "BOOT" | "ACTIVE" | "GROWTH"
): GloryToolDef[] {
  const scored = ALL_GLORY_TOOLS.map((tool) => {
    let score = 0;

    // Pillar alignment
    for (const pk of tool.pillarKeys) {
      if (pillarWeaknesses.includes(pk)) score += 30;
    }

    // Driver match
    if (tool.requiredDrivers.length === 0) score += 10; // Universal tools
    for (const d of tool.requiredDrivers) {
      if (activeDrivers.includes(d)) score += 20;
    }

    // Phase relevance
    if (phase === "QUICK_INTAKE" && tool.layer === "CR") score += 15;
    if (phase === "BOOT" && tool.layer === "BRAND") score += 20;
    if (phase === "ACTIVE" && tool.layer === "HYBRID") score += 15;
    if (phase === "GROWTH" && tool.layer === "DC") score += 15;

    return { ...tool, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}
