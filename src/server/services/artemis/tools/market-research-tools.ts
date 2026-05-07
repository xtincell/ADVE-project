/**
 * Artemis — MarketResearch Glory tools (ADR-0037 PR-I extension + ADR-0048 +
 * NEFER §3.1 doctrine + Phase 20 décomposition).
 *
 * 3 Glory tools atomiques DELEGATE qui décomposent l'orchestration market-
 * research originale (v6.20.0 monolithique → v6.20.2 atomique). Chacun
 * délègue à un handler enregistré dans `delegate-registry.ts` via le service
 * `artemis/market-research/delegates.ts`.
 *
 * Pattern wrap-service-via-DELEGATE — symétrique à MCP, complémentaire à
 * Phase 14 Imhotep (qui wrappe via Intent kinds + executionType LLM avec
 * promptTemplate descriptif). DELEGATE est plus pur pour les opérations
 * NON-LLM (web fetch, DB persist) — pas de fausse trace LLM dans GloryOutput.
 *
 * Chaînables dans la GlorySequence `MARKET-RESEARCH` (cf. sequences.ts).
 *
 * APOGEE compliance :
 * - Sous-système : Propulsion phase brief (Artemis Mission Tier)
 * - Pilier T (Track) : output alimente la KB country+sector cross-marques
 * - Loi 3 (Conservation carburant) : seul le step `llm-extractor` est
 *   `requiresPaidTier: true` (LLM-coûteux). Fetch + persist sont gratuits.
 *
 * Note d'invocation : ces tools sont invocables :
 *   1. Via `executeTool(slug, strategyId, input)` directement (test/debug)
 *   2. Via la GlorySequence `MARKET-RESEARCH` (chaînage canonique)
 *   3. Via `runMarketResearchHandler` (commandant Artemis) qui appelle les
 *      3 handlers en cascade pour le path stateless cross-brand
 *      (strategyId="(global)") — évite la dépendance executor à une vraie
 *      Strategy quand la recherche est cross-brand.
 */

import type { GloryToolDef } from "./registry";

export const MARKET_RESEARCH_TOOLS: GloryToolDef[] = [
  {
    slug: "market-source-fetcher",
    name: "Récolteur de Sources Marché",
    layer: "HYBRID",
    order: 17_001,
    executionType: "DELEGATE",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Fetch N URLs server-side (anti-SSRF : http/https only, denylist loopback/RFC1918/IPv6/.local, timeout 12s, max 5MB par URL). Output : JSON array de FetchedSource (ok/status/text/contentType/bytesRead). Pas de LLM, pas de coût.",
    inputFields: ["source_urls"],
    pillarBindings: {
      // Operator-supplied input — pas de pillarBinding direct.
    },
    outputFormat: "fetched_sources",
    promptTemplate: "DELEGATE — handler `market-research:fetch-sources` (artemis/market-research/delegates.ts). Pas de prompt LLM.",
    status: "ACTIVE",
    delegateDescriptor: { handlerKey: "market-research:fetch-sources" },
  },
  {
    slug: "market-research-llm-extractor",
    name: "Extracteur LLM Recherche Marché",
    layer: "HYBRID",
    order: 17_002,
    executionType: "DELEGATE",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: ["market-source-fetcher"],
    description:
      "Construit un prompt structured-market-study/v1 (49 codes Trend Tracker + 3 enums anti-fab) à partir des sources fetchées + de la query opérateur, appelle callLLM(purpose=extraction), parse le markdown via parseStructuredMarketStudy. Mode mémoire-modèle activé si 0 source fournie. Output : markdown + parse status.",
    inputFields: ["query", "country_code", "sector", "fetched_sources", "brand_nature", "cascade_level"],
    pillarBindings: {
      // Operator-supplied inputs — cross-brand, pas de pillarBinding.
    },
    outputFormat: "structured_market_study_v1",
    promptTemplate: "DELEGATE — handler `market-research:llm-extract` construit dynamiquement le prompt via buildMarketResearchPrompt() (49 codes Trend Tracker, contraintes anti-fab). Le prompt n'est PAS dans cette template.",
    status: "ACTIVE",
    delegateDescriptor: { handlerKey: "market-research:llm-extract" },
    requiresPaidTier: true,
  },
  {
    slug: "market-study-persister",
    name: "Persisteur d'Étude Marché",
    layer: "HYBRID",
    order: 17_003,
    executionType: "DELEGATE",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: ["market-research-llm-extractor"],
    description:
      "Wrap autour de ingestStructuredMarketStudy : décompose le markdown structured-market-study/v1 en N rows KnowledgeEntry (RAW + TAM + COMPETITOR ×N + SEGMENT ×N + DIGEST). Cross-brand via indexes (sector, countryCode). Idempotent par sha256 (DUPLICATE détecté). Pas de LLM.",
    inputFields: ["markdown", "country_code", "sector", "uploaded_by"],
    pillarBindings: {
      // markdown vient du step amont (sequence context).
    },
    outputFormat: "market_study_persistence",
    promptTemplate: "DELEGATE — handler `market-research:persist` (artemis/market-research/delegates.ts). Pas de prompt LLM.",
    status: "ACTIVE",
    delegateDescriptor: { handlerKey: "market-research:persist" },
  },
];
