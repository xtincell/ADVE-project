/**
 * Artemis — MarketResearch orchestrator (ADR-0037 PR-I extension + ADR-0060
 * + NEFER §3.2 governance correction : actions/séquences = Artemis).
 *
 * Cette action **est gouvernée par Artemis** (Propulsion phase brief) car
 * c'est une action LLM-driven multi-étape (web fetch + prompt building +
 * appel LLM + parse). La persistance downstream délègue à Seshat
 * (`ingestStructuredMarketStudy` → `KnowledgeEntry`) — pattern cascade
 * Artemis → Seshat normal. Cf. NEFER.md §3.2.
 *
 * `runMarketResearch` is the main entry point :
 *   1. Fetches operator-provided source URLs (optional).
 *   2. Builds an LLM prompt enforcing `structured-market-study/v1` output.
 *   3. Calls callLLM (purpose: "extraction").
 *   4. Parses the LLM response via `parseStructuredMarketStudy` (parser
 *      vit dans seshat/market-study-ingestion/ — parsing data ingéré
 *      reste Seshat ; orchestration LLM-driven reste Artemis).
 *   5. Returns the markdown + parsed extraction + diagnostics.
 *
 * Persistence is NOT done here — the commandant handler chains
 * `ingestStructuredMarketStudy` (Seshat) to materialize KnowledgeEntry rows.
 *
 * Anti-fabrication is enforced at THREE layers :
 *   - LLM prompt mandates `-` cells when no data + source URL/`memory` mention.
 *   - Markdown parser drops malformed rows / placeholders.
 *   - Zod `MarketStudyExtractionSchema` validates the final shape.
 *
 * Glory tool registry surface : `market-research-runner` (cf.
 * `artemis/tools/market-research-tools.ts`) — discoverabilité + tier gate
 * + futur chaînage en GlorySequence (Phase 21 résidu).
 */

import { callLLM } from "@/server/services/llm-gateway";
import { parseStructuredMarketStudy } from "@/server/services/seshat/market-study-ingestion/extractor-structured";
import type { StructuredParseResult } from "@/server/services/seshat/market-study-ingestion/extractor-structured";
import { fetchSources } from "./web-fetcher";
import type { FetchedSource } from "./web-fetcher";
import { buildMarketResearchPrompt } from "./prompt-builder";

export interface RunMarketResearchInput {
  query: string;
  countryCode: string;
  sector: string;
  sourceUrls?: string[];
  uploadedBy: string;
  strategyId?: string;
  brandNature?: string;
  cascadeLevel?: string;
}

export interface RunMarketResearchResult {
  markdown: string;
  parseResult: StructuredParseResult;
  sourcesFetched: FetchedSource[];
  llmTokensUsed?: number;
  llmCalled: boolean;
  promptTruncated: boolean;
  generatedAt: string;
}

export async function runMarketResearch(
  input: RunMarketResearchInput,
): Promise<RunMarketResearchResult> {
  const generatedAt = new Date().toISOString();
  const sources = input.sourceUrls && input.sourceUrls.length > 0
    ? await fetchSources(input.sourceUrls)
    : [];

  const built = buildMarketResearchPrompt({
    query: input.query,
    countryCode: input.countryCode,
    sector: input.sector,
    sources,
    brandNature: input.brandNature,
    cascadeLevel: input.cascadeLevel,
    generatedAt,
  });

  const llmResult = await callLLM({
    system: built.system,
    prompt: built.prompt,
    caller: "seshat:market-research",
    purpose: "extraction",
    maxOutputTokens: 8000,
    strategyId: input.strategyId ?? "(global)",
  });

  // Strip code fences if the LLM accidentally wrapped the markdown.
  const cleaned = llmResult.text
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Ensure the document starts with `---` (frontmatter) — if the LLM
  // prefixed any narrative, lop it off up to the first frontmatter mark.
  const fmIdx = cleaned.indexOf("\n---\n");
  const startIdx = cleaned.startsWith("---") ? 0 : (fmIdx >= 0 ? fmIdx + 1 : 0);
  const markdown = cleaned.slice(startIdx);

  const parseResult = parseStructuredMarketStudy(markdown);

  return {
    markdown,
    parseResult,
    sourcesFetched: sources,
    llmTokensUsed: llmResult.usage.inputTokens + llmResult.usage.outputTokens,
    llmCalled: true,
    promptTruncated: built.truncated,
    generatedAt,
  };
}
