/**
 * MarketStudy LLM extractor (ADR-0037 PR-I).
 *
 * Takes raw text (extracted from PDF/DOCX/XLSX upstream) and produces a
 * structured `MarketStudyExtraction`. The prompt enforces the Trend
 * Tracker 49-variable lookup and CONTRAINTE DURE anti-fabrication.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { UNTRUSTED_NOTICE, wrapUntrusted, sanitizeInline } from "@/server/services/utils/untrusted-content";
import { MarketStudyExtractionSchema, type MarketStudyExtraction } from "./types";
import { TREND_TRACKER_49 } from "@/server/services/seshat/knowledge/trend-tracker-49";

export async function extractMarketStudy(input: {
  text: string;
  declaredCountryCode?: string;
  declaredSector?: string;
  sourceFilename: string;
}): Promise<{ ok: true; extraction: MarketStudyExtraction } | { ok: false; error: string }> {
  const trendCatalog = TREND_TRACKER_49.map(
    (v) => `- ${v.code} (${v.category}) "${v.label}" [${v.unit}] hints: ${v.llmExtractionHints.join(", ")}`,
  ).join("\n");

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : les paramètres
  // opérateur déclarés sont interpolés dans le system prompt → sanitize inline.
  const declaredCountrySafe = input.declaredCountryCode ? sanitizeInline(input.declaredCountryCode, { max: 80 }) : "";
  const declaredSectorSafe = input.declaredSector ? sanitizeInline(input.declaredSector, { max: 120 }) : "";

  const systemPrompt = `${UNTRUSTED_NOTICE}

Tu es un analyste senior spécialisé dans l'extraction structurée de données depuis des études de marché (Statista, Nielsen, Kantar, BCG, McKinsey, Euromonitor, banques centrales).

Tu reçois le texte brut d'une étude. Tu dois en extraire un objet JSON STRICT conforme au schéma MarketStudyExtraction.

CONTRAINTE DURE — anti-fabrication :
- Si une section n'est PAS explicitement mentionnée dans le texte, retourne null OU un array vide ([]). Jamais d'invention.
${declaredCountrySafe ? `- Le pays cible est ${declaredCountrySafe}. Si le document couvre un autre pays, flag explicitement et privilégie les datapoints qui mentionnent ${declaredCountrySafe}.` : ""}
${declaredSectorSafe ? `- Le secteur cible est ${declaredSectorSafe}. Privilégie les datapoints alignés.` : ""}
- Pour chaque valeur chiffrée, capture la SOURCE textuelle (page, table, paragraphe).

49 variables Trend Tracker à chercher systématiquement (retourne null si non trouvé) :
${trendCatalog}

Format JSON strict :
{
  "study": { "title": "...", "publisher": "...", "publishedAt": "ISO", "methodology": "...", "sampleSize": 0, "geography": "...", "sectorCoverage": ["..."] },
  "tam": { "value": 0, "currency": "USD", "year": 2025, "methodology": "...", "source": "page X" } | null,
  "sam": null | { ... },
  "som": null | { ... },
  "growthRates": [{ "segment": "...", "cagr": 0.0, "period": "2024-2029", "source": "..." }],
  "competitorShares": [{ "name": "...", "marketSharePct": 0.0, "year": 2025, "source": "..." }],
  "consumerSegments": [{ "segment": "...", "sizePct": 0.0, "demographics": {...}, "behaviors": [...], "painPoints": [...] }],
  "pricePoints": [{ "tier": "...", "range": "...", "asp": 0, "source": "..." }],
  "channelMix": [{ "channel": "...", "sharePct": 0.0, "growthTrend": "..." }],
  "regulatorySignals": [{ "regulation": "...", "impactSeverity": "HIGH", "timeline": "..." }],
  "macroSignals": [{ "trend": "...", "evidence": "...", "timeHorizon": "MEDIUM" }],
  "weakSignals": [{ "event": "...", "causalChain": ["...", "..."], "impactCategory": "...", "urgency": "HIGH" }],
  "trendTracker": { "A1": { "value": 110, "year": 2024, "source": "page 12" }, "B3": { "value": "0.72", "year": 2024 }, "...": null }
}`;

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : le texte brut
  // d'une étude UPLOADÉE (PDF/DOCX/XLSX) est le vecteur d'injection principal.
  // On l'encadre via wrapUntrusted (casse fences/balises de rôle/`=== ===`) au
  // lieu des délimiteurs ad-hoc, et on neutralise le nom de fichier (saisi).
  const filenameSafe = sanitizeInline(input.sourceFilename, { max: 200 });
  const documentBlock = wrapUntrusted("TEXTE BRUT DE L'ÉTUDE", input.text, { max: 80_000 });

  const result = await callLLM({
    system: systemPrompt,
    prompt: `Document : ${filenameSafe}\n\n${documentBlock}\n\nExtrais l'objet JSON. Aucun texte hors JSON.`,
    caller: "seshat:market-study-extractor",
    maxOutputTokens: 8000,
  });

  // Strip markdown fences if any.
  const raw = result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, error: "No JSON object found in LLM response" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch (err) {
    return { ok: false, error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  const validated = MarketStudyExtractionSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, error: `Schema validation failed: ${validated.error.message.slice(0, 200)}` };
  }
  return { ok: true, extraction: validated.data };
}
