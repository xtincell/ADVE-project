/**
 * Manifest — LLM Gateway (multi-provider, routing matrix, cost tracking, embeddings).
 *
 * Engine controller multi-provider (v5) avec circuit breaker, cost tracking,
 * routing matrix par tier qualité/latence/coût. Expose call complète + parse JSON
 * + embeddings (Ollama/OpenAI/no-op).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const QualityTierEnum = z.enum(["S", "A", "B", "C"]);

const GatewayResultSchema = z.object({
  text: z.string(),
  provider: z.string(),
  model: z.string(),
  costUsd: z.number().min(0),
  latencyMs: z.number().min(0),
});

const EmbedResultSchema = z.object({
  vector: z.array(z.number()),
  provider: z.enum(["ollama", "openai", "none"]),
  dimensions: z.number().int().positive(),
});

export const manifest = defineManifest({
  service: "llm-gateway",
  governor: "INFRASTRUCTURE",
  version: "5.0.0",
  acceptsIntents: ["LLM_CALL"],
  emits: ["LLM_TOKEN_USAGE"],
  capabilities: [
    {
      name: "complete",
      inputSchema: z.object({
        prompt: z.string(),
        qualityTier: QualityTierEnum.optional(),
        latencyBudgetMs: z.number().int().min(0).optional(),
        costCeilingUsd: z.number().min(0).optional(),
      }),
      outputSchema: GatewayResultSchema,
      sideEffects: ["LLM_CALL", "EXTERNAL_API"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Point d'entrée LLM standard pour tous les services métier — circuit breaker + cost tracking centralisés.",
    },
    {
      name: "stream",
      inputSchema: z.object({ prompt: z.string() }).passthrough(),
      outputSchema: z.object({ stream: z.unknown() }),
      sideEffects: ["LLM_CALL", "EXTERNAL_API"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Streaming required pour UX cockpit (typing indicator) + Notoria progress events — sans cela toutes les calls LLM sont batch silencieux > 5s.",
    },
    {
      name: "callLLM",
      inputSchema: z.object({
        purpose: z.string().min(1),
        prompt: z.string(),
        qualityTier: QualityTierEnum.optional(),
        latencyBudgetMs: z.number().int().min(0).optional(),
        costCeilingUsd: z.number().min(0).optional(),
        operatorId: z.string().optional(),
        strategyId: z.string().optional(),
      }).passthrough(),
      outputSchema: GatewayResultSchema,
      sideEffects: ["LLM_CALL", "EXTERNAL_API", "DB_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Forme canonique avec lineage (purpose, operatorId, strategyId) pour ai-cost-tracker — sans cela impossible d'attribuer le coût LLM par feature/brand.",
    },
    {
      name: "callLLMAndParse",
      inputSchema: z.object({
        purpose: z.string().min(1),
        prompt: z.string(),
        qualityTier: QualityTierEnum.optional(),
        operatorId: z.string().optional(),
        strategyId: z.string().optional(),
      }).passthrough(),
      outputSchema: z.object({
        parsed: z.unknown(),
        raw: GatewayResultSchema,
      }),
      sideEffects: ["LLM_CALL", "EXTERNAL_API", "DB_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Wrapper qui parse JSON robuste depuis sortie LLM (code blocks, prefix/suffix narratif) — évite que chaque caller ré-implémente extractJSON avec ses propres bugs.",
    },
    {
      name: "embed",
      inputSchema: z.object({
        text: z.string().min(1),
        provider: z.enum(["ollama", "openai", "none"]).optional(),
      }),
      outputSchema: EmbedResultSchema,
      sideEffects: ["EXTERNAL_API"],
      idempotent: true,
      missionContribution: "CHAIN_VIA:knowledge-aggregator",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Multi-provider gateway with circuit breaker, cost tracking, and Phase-5 routing matrix that picks model from quality/latency/cost tiers per Intent kind. Embeddings via Ollama → OpenAI → no-op fallback chain.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without LLM Gateway, no GLORY tool nor Mestor deliberation works; the entire propulsion stack is silent.",
});
