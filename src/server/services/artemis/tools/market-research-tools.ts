/**
 * Artemis — MarketResearch Glory tools (ADR-0037 PR-I extension + ADR-0048 +
 * NEFER §3.1 doctrine).
 *
 * 1 nouveau tool au layer HYBRID pour exposer la recherche marché LLM-driven
 * cross-marques en surface API canonique (Glory tool registry).
 *
 * Wrappe le service satellite `artemis/market-research/runMarketResearch` via
 * l'Intent kind `RUN_MARKET_RESEARCH` enregistré dans `mestor/intents.ts` —
 * pattern identique aux Phase 14 Imhotep tools (cf. en-tête de
 * `phase14-imhotep-tools.ts` : "Tous wrappent les services satellites
 * existants via les Intent kinds — anti-doublon NEFER §3 strict").
 *
 * APOGEE compliance :
 * - Sous-système : Propulsion phase brief (Artemis Mission Tier)
 * - Pilier T (Track) : output alimente la KB country+sector cross-marques
 * - Loi 3 (Conservation carburant) : tool LLM-coûteux → `requiresPaidTier: true`
 *
 * Note d'invocation : ce tool est actuellement invoqué via `runResearch`
 * tRPC procedure (Console page) qui emit l'Intent `RUN_MARKET_RESEARCH` →
 * commandant Artemis. Présence dans le registry sert :
 *   1. Discoverabilité (apparaît dans `glory-tools-inventory.md`).
 *   2. Tier gate metadata (`requiresPaidTier: true`).
 *   3. Futur chaînage en `GlorySequence` (Phase 21 résidu : promouvoir
 *      l'orchestration en sequence Artemis explicite — ADR-0042 sequences
 *      first-class). Quand câblé, `executeTool('market-research-runner')`
 *      ajoutera une branche delegate-to-Intent dans `engine.ts` (pattern
 *      symétrique au branch MCP existant ligne 164-166).
 */

import type { GloryToolDef } from "./registry";

export const MARKET_RESEARCH_TOOLS: GloryToolDef[] = [
  {
    slug: "market-research-runner",
    name: "Lanceur de Recherche Marché",
    layer: "HYBRID",
    order: 17_001,
    executionType: "LLM",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Lance une recherche marché LLM-ancrée sur des sources URL fournies par l'opérateur (ou mémoire-modèle warning si absentes). Output : document markdown `structured-market-study/v1` parsé déterministiquement et persisté en N rows KnowledgeEntry country+sector (cross-marques). Wrappe runMarketResearch service via Intent kind RUN_MARKET_RESEARCH (cascade Artemis → Seshat).",
    inputFields: ["query", "country_code", "sector", "source_urls", "brand_nature", "cascade_level"],
    pillarBindings: {
      // Operator-supplied inputs — pas de pillarBinding direct (cross-brand cross-strategy).
    },
    outputFormat: "structured_market_study_v1",
    promptTemplate: `LLM — prompt construit dynamiquement par buildMarketResearchPrompt() (artemis/market-research/prompt-builder.ts).
Encode contractuellement :
- format: structured-market-study/v1
- 10 sections §1 TAM/SAM/SOM, §2 Croissance, §3 Concurrents, §4 Segments, §5 Prix,
  §6 Canaux, §7 Réglementaire, §8 Macro, §9 Signaux faibles, §10 Trend Tracker (49 codes)
- Anti-fab : cellule "-" si pas de donnée + cellule "source" URL ou "memory" obligatoire
- Mode mémoire-modèle activé si zéro URL fournie (warning UI)

Output JSON :
{
  "rawEntryId": "string",
  "sha256": "string",
  "countryCode": "string",
  "sector": "string",
  "entriesCreated": number,
  "markdown": "string",
  "warnings": ["string"],
  "sourcesFetched": [{ "url", "ok", "status", "bytesRead" }],
  "memoryOnly": boolean
}`,
    status: "ACTIVE",
    requiresPaidTier: true,
    // applicableNatures: undefined → universel (toutes BrandNature, cross-brand)
  },
];
