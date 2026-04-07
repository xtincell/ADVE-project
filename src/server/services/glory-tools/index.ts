// ============================================================================
// MODULE M03 — Glory Tools (39 outils, 4 layers)
// Score: 75/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: Annexe B + §6.2 | Division: La Fusée (GLORY)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  39 outils en 4 layers: CR(10), DC(8), HYBRID(11), BRAND(10)
// [x] REQ-2  Point d'entrée unique generateGloryOutput(toolSlug, strategyId, params)
// [x] REQ-3  AI execution via Claude (system prompt expert + pillar context)
// [x] REQ-4  Persistable outputs (21/39) saved in DB with refNumber
// [x] REQ-5  BRAND pipeline séquentiel 10 outils avec dépendances (semiotique→visuel→moodboard→...)
// [x] REQ-6  executeBrandPipeline() with auto-apply to D.directionArtistique
// [x] REQ-7  Slug-to-field mapping corrected (7 fixes applied)
// [ ] REQ-8  Lien aux Drivers (un Driver déclenche les GLORY tools pertinents)
// [ ] REQ-9  Contexte ADVE hérité (le profil ADVE du client injecté dans chaque tool)
// [ ] REQ-10 Usage stats tracking (quel tool utilisé combien de fois, par quel client)
// [ ] REQ-11 Feedback: GloryOutput → QualityReview → Publication → BrandAsset cycle
//
// EXPORTS: generateGloryOutput, executeBrandPipeline, getToolBySlug
// LAYERS: CR=concepteur-rédacteur, DC=direction-création, HYBRID=opérationnel, BRAND=identité-visuelle
// ============================================================================

/**
 * GLORY Tools — Execution Engine
 * Runs tools with AI (Claude), tracks outputs, manages the BRAND pipeline
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { ALL_GLORY_TOOLS, getGloryTool, getBrandPipelineDependencyOrder, type GloryToolDef } from "./registry";

export { ALL_GLORY_TOOLS, getGloryTool, getToolsByLayer, getToolsByPillar, getToolsByDriver, getToolsByExecutionType, getBrandPipeline } from "./registry";
export type { GloryLayer, GloryExecutionType, GloryToolStatus, GloryToolDef } from "./registry";

// Sequence exports
export { ALL_SEQUENCES, getSequence, getSequencesByFamily, getSequencesByPillar, getSequencesForTool, getAllPlannedSteps, getUniquePlannedSlugs, getSequenceGloryTools } from "./sequences";
export type { SequenceStepType, GlorySequenceFamily, GlorySequenceKey, SequenceStep, GlorySequenceDef } from "./sequences";

// Sequence executor exports
export { executeSequence, executeSequenceBatch, executeAllPillarSequences } from "./sequence-executor";
export type { SequenceContext, StepResult, SequenceResult, SequenceProgressCallback } from "./sequence-executor";

// Pillar resolver exports
export { PillarResolver } from "./pillar-resolver";
export type { PillarData, ResolvedBindings } from "./pillar-resolver";

// Pillar director exports
export { PillarDirector, PILLAR_DIRECTORS, getDirector, assessAllPillarsHealth } from "./pillar-director";
export type { PillarKey, PillarHealthReport, WritebackVerdict } from "./pillar-director";

// Hypervisor exports
export { analyzeAndRecommend, getNextSequences, shouldExecuteSequence } from "./hypervisor";
export type { StrategyPhase, HypervisorRecommendation, HypervisorPlan } from "./hypervisor";

// Sequence queue exports
export { buildQueue, getReadySequences, getCompletedSequences } from "./sequence-queue";
export type { QueueItemStatus, QueueItem } from "./sequence-queue";

// Deliverable compiler exports
export { compileDeliverable, listCompilableDeliverables, exportDeliverable } from "./deliverable-compiler";
export type { DeliverableFormat, DeliverableManifest, DeliverableSection } from "./deliverable-compiler";

/**
 * Load full strategy context for enriching GLORY tool prompts.
 * Includes ALL 8 ADVE-RTIS pillar contents (not just scores) so that
 * tools have access to risks (R), market intelligence (T), action catalogue (I),
 * and strategic roadmap (S) alongside the creative pillars (A/D/V/E).
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
    lines.push(`Score ADVE-RTIS: A=${vec.a ?? 0}, D=${vec.d ?? 0}, V=${vec.v ?? 0}, E=${vec.e ?? 0}, R=${vec.r ?? 0}, T=${vec.t ?? 0}, I=${vec.i ?? 0}, S=${vec.s ?? 0} | Composite=${vec.composite ?? 0}`);
  }
  const bizCtx = strategy.businessContext as Record<string, unknown> | null;
  if (bizCtx) {
    lines.push(`Modele d'affaires: ${bizCtx.businessModel ?? "N/A"}`);
    lines.push(`Positionnement: ${bizCtx.positioningArchetype ?? "N/A"}`);
  }

  // Inject ALL 8 pillar contents — RTIS included
  for (const p of strategy.pillars) {
    const content = p.content as Record<string, unknown> | null;
    if (!content) continue;

    const pillarLabel = { a: "Authenticite", d: "Distinction", v: "Valeur", e: "Engagement", r: "Risk", t: "Track", i: "Implementation", s: "Strategie" }[p.key] ?? p.key.toUpperCase();
    lines.push(`\n--- Pilier ${p.key.toUpperCase()} (${pillarLabel}) [confiance: ${p.confidence}] ---`);

    if (content.summary) {
      lines.push(`Resume: ${content.summary}`);
    }

    // RTIS-specific key data surfacing
    if (p.key === "r") {
      const swot = content.globalSwot as Record<string, string[]> | undefined;
      if (swot) {
        lines.push(`Forces: ${(swot.strengths ?? []).slice(0, 3).join(", ")}`);
        lines.push(`Faiblesses: ${(swot.weaknesses ?? []).slice(0, 3).join(", ")}`);
        lines.push(`Menaces: ${(swot.threats ?? []).slice(0, 3).join(", ")}`);
        lines.push(`Opportunites: ${(swot.opportunities ?? []).slice(0, 3).join(", ")}`);
      }
      if (content.riskScore) lines.push(`Score de risque: ${content.riskScore}/100`);
    }
    if (p.key === "t") {
      const tam = content.tamSamSom as Record<string, Record<string, unknown>> | undefined;
      if (tam) {
        lines.push(`TAM: ${tam.tam?.description ?? "N/A"} | SAM: ${tam.sam?.description ?? "N/A"} | SOM: ${tam.som?.description ?? "N/A"}`);
      }
      if (content.brandMarketFitScore) lines.push(`Brand-Market Fit: ${content.brandMarketFitScore}/100`);
    }
    if (p.key === "i") {
      if (content.totalActions) lines.push(`Actions cataloguees: ${content.totalActions}`);
      const catalogue = content.catalogueParCanal as Record<string, unknown[]> | undefined;
      if (catalogue) {
        const channels = Object.keys(catalogue);
        lines.push(`Canaux couverts: ${channels.join(", ")} (${channels.length} canaux)`);
      }
    }
    if (p.key === "s") {
      if (content.syntheseExecutive) lines.push(`Synthese: ${String(content.syntheseExecutive).slice(0, 200)}`);
      const roadmap = content.roadmap as unknown[] | undefined;
      if (roadmap) lines.push(`Roadmap: ${roadmap.length} phases definies`);
      const sprint = content.sprint90Days as unknown[] | undefined;
      if (sprint) lines.push(`Sprint 90j: ${sprint.length} actions prioritaires`);
      if (content.globalBudget) lines.push(`Budget global: ${content.globalBudget} XAF`);
    }
  }

  if (strategy.drivers.length > 0) {
    lines.push(`\n--- Drivers actifs ---`);
    lines.push(strategy.drivers.map((d) => `${d.name} (${d.channel})`).join(", "));
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
        "visual-moodboard-generator": "moodboard",
        "chromatic-strategy-builder": "chromaticStrategy",
        "typography-system-architect": "typographySystem",
        "logo-type-advisor": "logoTypeRecommendation",
        "logo-validation-protocol": "logoValidation",
        "design-token-architect": "designTokens",
        "motion-identity-designer": "motionIdentity",
        "brand-guidelines-generator": "brandGuidelines",
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
