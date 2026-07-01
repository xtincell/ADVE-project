/**
 * Artemis — MarketResearch DELEGATE handlers (ADR-0037 PR-I extension +
 * NEFER §3.1 + ADR-0048).
 *
 * 3 handlers atomiques exposés sous forme de Glory tools DELEGATE +
 * chaînables dans la GlorySequence `MARKET-RESEARCH` :
 *
 *   1. `market-research:fetch-sources`
 *      Fetch N URLs server-side (anti-SSRF) → texte extrait.
 *      Inputs  : source_urls (JSON array of URL strings)
 *      Outputs : fetched_sources (JSON array of FetchedSource)
 *
 *   2. `market-research:llm-extract`
 *      Build prompt structured-market-study/v1 + LLM call + parse.
 *      Inputs  : query, country_code, sector, fetched_sources (JSON),
 *                brand_nature?, cascade_level?
 *      Outputs : markdown, parse_ok (bool), parse_warnings (JSON),
 *                parse_errors (JSON)
 *
 *   3. `market-research:persist`
 *      Persiste le markdown en KnowledgeEntry rows (cross-brand via
 *      indexes (countryCode, sector)). Wrap autour de
 *      `ingestStructuredMarketStudy` — pas de LLM ici.
 *      Inputs  : markdown, country_code, sector, uploaded_by,
 *                strategy_id (optional, "(global)" sentinel autorisé)
 *      Outputs : raw_entry_id, sha256, entries_created, status
 *
 * Tous les handlers sont enregistrés au module-load via
 * `registerDelegateHandler(...)`. L'import side-effect dans
 * `delegate-registry.ts` les déclenche dès qu'un DELEGATE Glory tool
 * est résolu.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import { fetchSources } from "./web-fetcher";
import { buildMarketResearchPrompt } from "./prompt-builder";
import { registerDelegateHandler } from "../tools/delegate-registry";
import type { FetchedSource } from "./web-fetcher";

function readJsonInput<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Handler 1 : fetch-sources ───────────────────────────────────────────

registerDelegateHandler("market-research:fetch-sources", async (input) => {
  const urls = readJsonInput<string[]>(input.source_urls, []);
  if (urls.length === 0) {
    return {
      fetched_sources: JSON.stringify([]),
      ok_count: 0,
      failed_count: 0,
      memory_only: true,
    };
  }
  const sources = await fetchSources(urls);
  const okCount = sources.filter((s) => s.ok).length;
  return {
    fetched_sources: JSON.stringify(sources),
    ok_count: okCount,
    failed_count: sources.length - okCount,
    memory_only: false,
  };
});

// ─── Handler 2 : llm-extract ─────────────────────────────────────────────

registerDelegateHandler("market-research:llm-extract", async (input, ctx) => {
  const sources = readJsonInput<FetchedSource[]>(input.fetched_sources, []);
  const generatedAt = new Date().toISOString();

  const built = buildMarketResearchPrompt({
    query: input.query ?? "",
    countryCode: input.country_code ?? "XX",
    sector: input.sector ?? "unknown",
    sources,
    brandNature: input.brand_nature,
    cascadeLevel: input.cascade_level,
    generatedAt,
  });

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : le rappel sécurité
  // est ajouté au system. Le brief opérateur (input.query) et le texte des
  // sources web fetchées (FetchedSource.text) sont fencés via wrapUntrusted
  // dans buildMarketResearchPrompt (point de concaténation réel).
  // @llm-input-internal: ce site ne concatène aucune entrée brute — il transmet
  // `built.prompt`/`built.system` déjà neutralisés en amont (wrapUntrusted par
  // source web + sanitizeInline query/codes dans buildMarketResearchPrompt) et
  // ajoute UNTRUSTED_NOTICE.
  const llmResult = await callLLM({
    system: `${UNTRUSTED_NOTICE}\n\n${built.system}`,
    prompt: built.prompt,
    caller: "glory:market-research-llm-extractor",
    purpose: "extraction",
    maxOutputTokens: 8000,
    strategyId: ctx.strategyId,
  });

  const cleaned = llmResult.text
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const fmIdx = cleaned.indexOf("\n---\n");
  const startIdx = cleaned.startsWith("---") ? 0 : (fmIdx >= 0 ? fmIdx + 1 : 0);
  const markdown = cleaned.slice(startIdx);

  const { parseStructuredMarketStudy } = await import(
    "@/server/services/seshat/market-study-ingestion/extractor-structured"
  );
  const parseResult = parseStructuredMarketStudy(markdown);

  return {
    markdown,
    parse_ok: parseResult.ok,
    parse_warnings: JSON.stringify(parseResult.ok ? parseResult.warnings : []),
    parse_errors: JSON.stringify(parseResult.ok ? [] : parseResult.errors),
    generated_at: generatedAt,
    prompt_truncated: built.truncated,
    sources_included: built.sourcesIncluded,
  };
});

// ─── Handler 3 : persist ─────────────────────────────────────────────────

registerDelegateHandler("market-research:persist", async (input, ctx) => {
  const markdown = input.markdown;
  if (!markdown) {
    return { status: "FAILED", error: "markdown input is empty" };
  }
  const { ingestStructuredMarketStudy } = await import(
    "@/server/services/seshat/market-study-ingestion"
  );
  const result = await ingestStructuredMarketStudy({
    markdown,
    uploadedBy: input.uploaded_by ?? "anonymous",
    strategyId: ctx.strategyId === "(global)" ? undefined : ctx.strategyId,
    declaredCountryCode: input.country_code,
    declaredSector: input.sector,
  });
  return {
    status: result.status,
    raw_entry_id: result.rawEntryId ?? null,
    sha256: result.sha256,
    country_code: result.countryCode,
    sector: result.sector,
    entries_created: result.entriesCreated ?? 0,
    error: result.error ?? null,
  };
});
