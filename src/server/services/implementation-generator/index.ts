/**
 * Implementation Generator — Havas-Level I Pillar Deliverable
 *
 * Produces agency-quality documentation worth thousands of euros:
 * - Brand Platform + Copy Strategy + Big Idea
 * - Sprint 90 jours + Calendrier annuel + Budget + Team
 * - Media Plan + Quality self-assessment
 *
 * Orchestrates GLORY tools for enrichment, then multi-pass LLM synthesis.
 * Campaigns from sprint/calendar are activatable in the Campaign Manager.
 */

import { callLLM, extractJSON as gatewayExtractJSON } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { executeTool } from "@/server/services/glory-tools";
import { PASS1_SYSTEM, PASS2_SYSTEM, PASS3_SYSTEM } from "./prompts";
import { createCampaignDrafts } from "./campaign-bridge";
import { PILLAR_KEYS } from "@/domain/pillars";

export interface ImplementationConfig {
  strategyId: string;
  autoCreateCampaignDrafts?: boolean;
  autoGenerateS?: boolean;
}

export interface ImplementationResult {
  pillarContent: Record<string, unknown>;
  gloryOutputIds: string[];
  campaignDraftIds: string[];
  qualityScore: number;
}

function extractJSON(text: string): Record<string, unknown> {
  try {
    return gatewayExtractJSON(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Generate the full premium I pillar deliverable
 */
export async function generateImplementation(
  config: ImplementationConfig,
): Promise<ImplementationResult> {
  const { strategyId } = config;

  // Load all validated pillars
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const pillarMap: Record<string, Record<string, unknown>> = {};
  for (const p of pillars) {
    pillarMap[p.key.toUpperCase()] = (p.content as Record<string, unknown>) ?? {};
  }

  // All 8 ADVE-RTIS pillars — I and S included for roadmap/catalogue alignment
  const fullContext = [...PILLAR_KEYS]
    .map(k => {
      const content = pillarMap[k];
      if (!content || Object.keys(content).length === 0) return null;
      return `## Pilier ${k}\n${JSON.stringify(content, null, 2)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // ── Phase 1: GLORY Tool Enrichment ──────────────────────────────────────
  const gloryOutputIds: string[] = [];

  const gloryTools = [
    "campaign-architecture-planner",
    "digital-planner",
    "content-calendar-strategist",
    "production-budget-optimizer",
  ];

  const gloryResults: Record<string, Record<string, unknown>> = {};

  for (const toolSlug of gloryTools) {
    try {
      const result = await executeTool(toolSlug, strategyId, {
        brief: `Contexte stratégique complet ADVE-RT pour ${toolSlug}`,
        objectifs: JSON.stringify(pillarMap["E"]?.kpis ?? pillarMap["E"]?.rituels ?? {}),
        budget: String(pillarMap["I"]?.globalBudget ?? "à définir"),
        sector: String((pillarMap["A"]?.noyauIdentitaire as string)?.substring(0, 100) ?? ""),
      });
      gloryOutputIds.push(result.outputId);
      gloryResults[toolSlug] = result.output;
    } catch (err) {
      console.warn(`[implementation-generator] GLORY tool ${toolSlug} failed:`, err instanceof Error ? err.message : err);
    }
  }

  const gloryContext = Object.entries(gloryResults)
    .map(([slug, output]) => `## GLORY Tool: ${slug}\n${JSON.stringify(output, null, 2)}`)
    .join("\n\n");

  // ── Phase 2: LLM Multi-Pass Premium Generation ──────────────────────────

  // Pass 1: Brand Platform + Copy Strategy + Big Idea
  const pass1Result = await callLLM({
    system: PASS1_SYSTEM,
    prompt: `Produis le socle stratégique (Brand Platform, Copy Strategy, Big Idea, Syntheses) pour cette marque.\n\n${fullContext}\n\nJSON uniquement.`,
    caller: "implementation-generator:pass1",
    strategyId,
    maxTokens: 6000,
  });
  const pass1 = extractJSON(pass1Result.text);

  // Pass 2: Operational Plan (enriched with GLORY outputs)
  const pass2Result = await callLLM({
    system: PASS2_SYSTEM,
    prompt: `Produis le plan opérationnel complet basé sur cette stratégie.\n\n${fullContext}\n\n## Socle stratégique (Pass 1)\n${JSON.stringify(pass1, null, 2)}\n\n${gloryContext}\n\nJSON uniquement.`,
    caller: "implementation-generator:pass2",
    strategyId,
    maxTokens: 8000,
  });
  const pass2 = extractJSON(pass2Result.text);

  // Merge into complete I pillar content
  const pillarContent: Record<string, unknown> = {
    ...pass1,
    ...pass2,
    generationMeta: {
      gloryToolsUsed: gloryOutputIds.map((id, i) => gloryTools[i] ?? id),
      qualityScore: 0,
      generatedAt: new Date().toISOString(),
      passes: 2,
    },
  };

  // Pass 3: Quality self-assessment
  let qualityScore = 70;
  try {
    const pass3Result = await callLLM({
      system: PASS3_SYSTEM,
      prompt: `Évalue la qualité de ce livrable stratégique :\n\n${JSON.stringify(pillarContent, null, 2)}\n\nJSON uniquement.`,
      caller: "implementation-generator:pass3-quality",
      strategyId,
      maxTokens: 2000,
    });
    const pass3 = extractJSON(pass3Result.text);
    qualityScore = typeof pass3.qualityScore === "number" ? pass3.qualityScore : 70;

    // Store quality assessment in meta
    (pillarContent.generationMeta as Record<string, unknown>).qualityScore = qualityScore;
    (pillarContent.generationMeta as Record<string, unknown>).qualityAssessment = pass3;

    // Pass 4: Refinement if quality is below threshold
    if (qualityScore < 70 && pass3.criticalIssues) {
      const refinementResult = await callLLM({
        system: PASS1_SYSTEM,
        prompt: `Le livrable suivant a reçu un score qualité de ${qualityScore}/100.\nIssues critiques : ${JSON.stringify(pass3.criticalIssues)}\nSuggestions : ${JSON.stringify(pass3.improvementSuggestions)}\n\nAméliore UNIQUEMENT les sections faibles. Retourne le JSON complet amélioré.\n\n${JSON.stringify(pillarContent, null, 2)}`,
        caller: "implementation-generator:pass4-refinement",
        strategyId,
        maxTokens: 6000,
      });
      const refined = extractJSON(refinementResult.text);
      if (Object.keys(refined).length > 0) {
        Object.assign(pillarContent, refined);
        (pillarContent.generationMeta as Record<string, unknown>).passes = 4;
      }
    }
  } catch (err) {
    console.warn("[implementation-generator] Quality assessment failed:", err instanceof Error ? err.message : err);
  }

  // ── Phase 3: Persist I Pillar ───────────────────────────────────────────
  const confidence = Math.min(0.85, qualityScore / 100);
  // Persist via Gateway
  const { writePillar } = await import("@/server/services/pillar-gateway");
  await writePillar({
    strategyId,
    pillarKey: "i" as import("@/lib/types/advertis-vector").PillarKey,
    operation: { type: "MERGE_DEEP", patch: pillarContent as Record<string, unknown> },
    author: { system: "MESTOR", reason: "Implementation generator I pillar creation" },
    options: { confidenceDelta: 0.05 },
  });

  // ── Phase 4: Campaign Activation Bridge ─────────────────────────────────
  let campaignDraftIds: string[] = [];
  if (config.autoCreateCampaignDrafts) {
    campaignDraftIds = await createCampaignDrafts(
      strategyId,
      (pillarContent.sprint90Days ?? []) as unknown as Array<{ action: string; [k: string]: unknown }>,
      (pillarContent.annualCalendar ?? []) as unknown as Array<{ name: string; [k: string]: unknown }>,
    );
  }

  // ── Phase 5: Auto-generate S if requested ───────────────────────────────
  if (config.autoGenerateS) {
    // S generation is handled by rtis-cascade.ts actualizePillar("S")
    // We import lazily to avoid circular deps
    const { actualizePillar } = await import("@/server/services/mestor/rtis-cascade");
    await actualizePillar(strategyId, "S").catch(err => {
      console.warn("[implementation-generator] S generation failed:", err instanceof Error ? err.message : err);
    });
  }

  return {
    pillarContent,
    gloryOutputIds,
    campaignDraftIds,
    qualityScore,
  };
}
