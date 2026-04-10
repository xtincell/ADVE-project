/**
 * COMMANDANT — Le cerveau de l'essaim MESTOR
 *
 * Rôle : Interface humaine, décisions stratégiques, arbitrages.
 * LLM  : OUI — le SEUL agent de l'essaim autorisé à appeler Claude pour des DÉCISIONS.
 *
 * Responsabilités :
 *   - Parler au Fixer (chat adaptatif 4 modes)
 *   - Prendre les décisions stratégiques (recos ADVE, arbitrages)
 *   - Assister les outils GLORY de type MESTOR_ASSIST
 *   - Générer les insights proactifs
 *   - Piloter l'Hyperviseur ("que doit-on faire ?")
 *
 * Ne fait PAS :
 *   - N'exécute pas les outils GLORY directement
 *   - N'écrit pas dans les piliers (passe par le Gateway)
 *   - Ne score pas (c'est du CALC pur — Chantier 2)
 */

import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { callLLMAndParse, withRetry } from "@/server/services/utils/llm";

// ── Types ──────────────────────────────────────────────────────────────

export type MestorContext = "cockpit" | "creator" | "console" | "intake";

export interface CommandantDecision {
  type: "RECOMMENDATION" | "ARBITRAGE" | "INSIGHT" | "ASSIST";
  content: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

export interface RecoDecision {
  pillarKey: PillarKey;
  recommendations: Array<{
    field: string;
    operation: "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";
    proposedValue: unknown;
    targetMatch?: { key: string; value: string };
    justification: string;
    source: "R" | "T" | "R+T";
    impact: "LOW" | "MEDIUM" | "HIGH";
  }>;
}

// ── ADVE Recommendation Generation (the key Commandant decision) ──────

/**
 * Generate per-field recommendations for an ADVE pillar from R+T insights.
 * Delegates to rtis-cascade.generateADVERecommendations (canonical, richer: Zod validation, schema-aware).
 * This adapter converts between lowercase keys (used by hyperviseur) and uppercase (used by rtis-cascade).
 */
export async function generateADVERecommendations(
  strategyId: string,
  pillarKey: "a" | "d" | "v" | "e",
): Promise<RecoDecision> {
  const { generateADVERecommendations: cascadeRecos } = await import("./rtis-cascade");
  const uppercaseKey = pillarKey.toUpperCase() as "A" | "D" | "V" | "E";
  const result = await cascadeRecos(strategyId, uppercaseKey);

  return {
    pillarKey,
    recommendations: (result.recommendations ?? []).map(r => ({
      field: r.field,
      operation: r.operation ?? "SET",
      proposedValue: r.proposedValue,
      targetMatch: r.targetMatch,
      justification: r.justification,
      source: r.source as "R" | "T" | "R+T",
      impact: r.impact,
    })),
  };
}

// ── MESTOR_ASSIST — Provide creative judgment for GLORY tools ─────────

/**
 * When a GLORY tool has executionType=MESTOR_ASSIST, it delegates
 * the creative/strategic judgment to the Commandant.
 *
 * The Commandant receives the tool's context (pillar bindings + sequence context)
 * and returns a structured decision that the tool formats into its outputSchema.
 */
export async function assistGloryTool(
  toolSlug: string,
  toolPrompt: string,
  context: Record<string, unknown>,
  strategyId?: string,
): Promise<Record<string, unknown>> {
  return callLLMAndParse({
    system: `Tu es le Commandant de l'essaim MESTOR. Un outil GLORY te demande un jugement créatif/stratégique.
Outil : ${toolSlug}
Tu dois fournir le contenu créatif demandé. L'outil structurera ta réponse dans son outputSchema.
Retourne UNIQUEMENT du JSON valide.`,
    prompt: `Contexte de l'outil:
${JSON.stringify(context, null, 2)}

Demande de l'outil:
${toolPrompt}`,
    maxTokens: 4000,
    strategyId,
    caller: `commandant-assist-${toolSlug}`,
  });
}

// ── Strategic Insight Generation ──────────────────────────────────────

/**
 * Generate proactive strategic insights for a strategy.
 * The Commandant analyzes the overall state and produces actionable alerts.
 */
export async function generateStrategicInsights(
  strategyId: string,
): Promise<Array<Record<string, unknown>>> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { pillars: { select: { key: true, content: true, confidence: true, staleAt: true } } },
  });

  if (!strategy) return [];

  const pillarSummary = strategy.pillars.map(p => {
    const content = p.content as Record<string, unknown> | null;
    const fieldCount = content ? Object.keys(content).filter(k => content[k] != null).length : 0;
    return `${p.key.toUpperCase()}: ${fieldCount} champs, confiance ${p.confidence?.toFixed(2) ?? 0}, ${p.staleAt ? "STALE" : "fresh"}`;
  }).join("\n");

  const vec = (strategy.advertis_vector ?? {}) as Record<string, number>;

  try {
    const result = await callLLMAndParse({
      system: `Tu es le Commandant MESTOR. Analyse l'état de cette stratégie et produis 3-5 insights actionnables.
Types : COHERENCE, STALE_PILLAR, OPPORTUNITY, RISK, DEVOTION_ALERT.
Retourne un JSON array. Chaque item: { type, severity (LOW|MEDIUM|HIGH|CRITICAL), title, description, suggestedAction }`,
      prompt: `Stratégie: ${strategy.name}
Composite: ${vec.composite ?? 0}/200
Piliers:\n${pillarSummary}`,
      maxTokens: 2000,
      strategyId,
      caller: "commandant-insights",
    });

    return Array.isArray(result) ? result as Array<Record<string, unknown>> : [];
  } catch {
    return [];
  }
}

// ── What-If Scenario (LLM-powered, not templates) ────────────────────

export interface ScenarioInput {
  strategyId: string;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Run a strategic what-if scenario. Uses real LLM reasoning (not templates).
 */
export async function runScenario(input: ScenarioInput): Promise<Record<string, unknown>> {
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    include: { pillars: { select: { key: true, content: true } } },
  });

  if (!strategy) return { error: "Strategy not found" };

  const pillarContext = strategy.pillars
    .map(p => `[${p.key.toUpperCase()}] ${JSON.stringify(p.content, null, 2)}`)
    .join("\n\n");

  return callLLMAndParse({
    system: `Tu es le Commandant MESTOR. On te demande de simuler un scénario stratégique.
Analyse les données de la stratégie et projette les impacts.
Retourne un JSON: { title, summary, impacts: [{ dimension, currentValue, projectedValue, delta, timeframe }], risks: [], recommendations: [], confidence: 0-1 }`,
    prompt: `Stratégie: ${strategy.name}

Piliers:
${pillarContext}

Scénario: ${input.type}
Description: ${input.description}
Paramètres: ${JSON.stringify(input.parameters)}

Simule l'impact de ce scénario sur la stratégie.`,
    maxTokens: 4000,
    strategyId: input.strategyId,
    caller: "commandant-scenario",
  });
}
