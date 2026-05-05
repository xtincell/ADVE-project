// ============================================================================
// GLORY Tools — Execution Engine
// Moved from glory-tools/index.ts to artemis/tools/engine.ts (Phase 3)
// ============================================================================

/**
 * GLORY Tools — Execution Engine
 * Runs tools with AI (Claude), tracks outputs, manages the BRAND pipeline
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { EXTENDED_GLORY_TOOLS, getGloryTool, getBrandPipelineDependencyOrder, type GloryToolDef } from "./registry";
import { checkPaidTier, tierGateDenied } from "@/server/services/glory-tools/tier-gate";
import { invokeExternalTool as anubisInvokeExternalTool } from "@/server/services/anubis/mcp-client";

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
): Promise<{ outputId: string; output: Record<string, unknown>; intentId: string | null }> {
  const tool = getGloryTool(toolSlug);
  if (!tool) throw new Error(`GLORY tool inconnu: ${toolSlug}`);

  // ── Phase 16-A — Paid tier gate (ADR-0048) ─────────────────────────────
  // Si le tool exige un abonnement payant, on récupère l'operator (Strategy.userId)
  // et on vérifie sa Subscription active. Refus structuré sans throw — caller UI
  // peut surfacer un CTA upgrade.
  if (tool.requiresPaidTier) {
    const strategyForGate = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { userId: true },
    });
    if (!strategyForGate?.userId) {
      const denied = tierGateDenied(
        `Strategy ${strategyId} n'a pas d'operator associé — impossible d'évaluer le tier gate.`,
        tool.paidTierAllowList,
      );
      return { outputId: "", output: denied as unknown as Record<string, unknown>, intentId: null };
    }
    const gate = await checkPaidTier(strategyForGate.userId, tool.paidTierAllowList);
    if (!gate.allowed) {
      const denied = tierGateDenied(
        gate.reason ?? `Tool ${toolSlug} réservé aux abonnements payants.`,
        tool.paidTierAllowList,
      );
      return { outputId: "", output: denied as unknown as Record<string, unknown>, intentId: null };
    }
  }

  // Phase 9 (ADR-0009) — Lineage hash-chain : crée IntentEmission INVOKE_GLORY_TOOL
  // pour que les downstream PTAH_MATERIALIZE_BRIEF puissent référencer un sourceIntentId
  // valide pointant vers une vraie row Mestor. Best-effort.
  let intentEmissionId: string | null = null;
  try {
    const row = await db.intentEmission.create({
      data: {
        intentKind: "INVOKE_GLORY_TOOL",
        strategyId,
        payload: { toolSlug, input } as never,
        caller: `glory-tools.executeTool`,
      },
    });
    intentEmissionId = row.id;
  } catch (err) {
    // ne bloque pas — IntentEmission est best-effort (Loi 1 conservation)
    console.warn(
      `[glory.executeTool] IntentEmission INVOKE_GLORY_TOOL not persisted for ${toolSlug}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // ── Phase 16 — MCP delegation (ADR-0048) ───────────────────────────────
  // Si executionType === "MCP", on délègue à Anubis (mcp-client) au lieu de callLLM.
  // Le tool ne génère pas via LLM mais via un appel MCP server externe (Higgsfield, etc.).
  // Output structuré : { status, output_url } ou { status: "DEFERRED_AWAITING_CREDENTIALS", ... }.
  if (tool.executionType === "MCP" && tool.mcpDescriptor) {
    return executeMcpTool(tool, strategyId, input, intentEmissionId);
  }

  // Validate inputs — warn on missing fields but don't block execution
  const missingFields = tool.inputFields.filter((f) => !input[f]);
  if (missingFields.length > 0) {
    console.warn(`[glory:${toolSlug}] Champs manquants (fallback actif): ${missingFields.join(", ")}`);
    // Fill missing fields with contextual fallback instead of throwing
    for (const f of missingFields) {
      input[f] = `(${f} non disponible)`;
    }
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
    const result = await callLLM({
      system: systemPrompt,
      prompt: userPrompt,
      caller: `glory:${toolSlug}`,
      strategyId,
      maxOutputTokens: 4096,
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

    aiOutput = {
      ...aiOutput,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        durationMs,
        model: "claude-sonnet-4-5",
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

  // Update IntentEmission row avec result (lineage closure)
  if (intentEmissionId) {
    try {
      await db.intentEmission.update({
        where: { id: intentEmissionId },
        data: {
          result: { gloryOutputId: gloryOutput.id, status: "OK" } as never,
          completedAt: new Date(),
        },
      });
    } catch {
      /* best-effort */
    }
  }

  return { outputId: gloryOutput.id, output: aiOutput, intentId: intentEmissionId };
}

/**
 * Phase 16 — MCP delegation handler (ADR-0048).
 *
 * Délègue l'invocation d'un Glory tool MCP-backed au client Anubis. Mappe les
 * inputFields aux paramètres MCP via `mcpDescriptor.paramMap`, persiste le
 * résultat dans `GloryOutput`, et clôt la lineage IntentEmission.
 *
 * Retours possibles :
 *   - status: "OK" + output_url(s) du MCP server
 *   - status: "DEFERRED_AWAITING_CREDENTIALS" (pas de creds OAuth pour ce server)
 *   - status: "FAILED" (erreur transport / refus MCP server)
 */
async function executeMcpTool(
  tool: GloryToolDef,
  strategyId: string,
  input: Record<string, string>,
  intentEmissionId: string | null,
): Promise<{ outputId: string; output: Record<string, unknown>; intentId: string | null }> {
  if (!tool.mcpDescriptor) {
    throw new Error(`[glory:${tool.slug}] executeMcpTool called without mcpDescriptor`);
  }

  // Récupération operator (pour Anubis credential vault scope).
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { userId: true },
  });
  if (!strategy?.userId) {
    const failed = {
      status: "FAILED" as const,
      reason: `Strategy ${strategyId} sans operator — impossible d'invoquer MCP ${tool.mcpDescriptor.serverName}.`,
      _meta: { tool: tool.slug, layer: tool.layer, generatedAt: new Date().toISOString() },
    };
    return { outputId: "", output: failed, intentId: intentEmissionId };
  }

  // Mapping inputField → MCP param key (default identité).
  const map = tool.mcpDescriptor.paramMap ?? {};
  const mcpInputs: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    const mcpKey = map[field] ?? field;
    mcpInputs[mcpKey] = value;
  }

  const startedAt = Date.now();
  const result = await anubisInvokeExternalTool({
    operatorId: strategy.userId,
    serverName: tool.mcpDescriptor.serverName,
    toolName: tool.mcpDescriptor.toolName,
    inputs: mcpInputs,
    intentId: intentEmissionId ?? undefined,
  });
  const durationMs = Date.now() - startedAt;

  let aiOutput: Record<string, unknown>;
  if (result.status === "DEFERRED_AWAITING_CREDENTIALS") {
    aiOutput = {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: result.connectorType,
      configureUrl: result.configureUrl,
      reason: result.reason,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        mcpServer: tool.mcpDescriptor.serverName,
        durationMs,
        generatedAt: new Date().toISOString(),
      },
    };
  } else if (result.status === "FAILED") {
    aiOutput = {
      status: "FAILED",
      reason: result.errorMessage,
      invocationId: result.invocationId,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        mcpServer: tool.mcpDescriptor.serverName,
        durationMs,
        generatedAt: new Date().toISOString(),
      },
    };
  } else {
    aiOutput = {
      status: "OK",
      output: result.output,
      invocationId: result.invocationId,
      _meta: {
        tool: tool.slug,
        layer: tool.layer,
        mcpServer: tool.mcpDescriptor.serverName,
        mcpTool: tool.mcpDescriptor.toolName,
        durationMs,
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

  if (intentEmissionId) {
    try {
      await db.intentEmission.update({
        where: { id: intentEmissionId },
        data: {
          result: { gloryOutputId: gloryOutput.id, status: aiOutput.status as string } as never,
          completedAt: new Date(),
        },
      });
    } catch {
      /* best-effort */
    }
  }

  return { outputId: gloryOutput.id, output: aiOutput, intentId: intentEmissionId };
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
          // Migrated to Pillar Gateway — LOI 1
          const { _meta, ...cleanOutput } = output;
          const { writePillar } = await import("@/server/services/pillar-gateway");
          await writePillar({
            strategyId,
            pillarKey: "d",
            operation: {
              type: "SET_FIELDS",
              fields: [{ path: `directionArtistique.${targetField}`, value: { ...cleanOutput, gloryOutputId: outputId } }],
            },
            author: { system: "GLORY", reason: `Brand pipeline — ${slug} → D.directionArtistique.${targetField}` },
            options: { confidenceDelta: 0.02 },
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
  const scored = EXTENDED_GLORY_TOOLS.map((tool) => {
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
