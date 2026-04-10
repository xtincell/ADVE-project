/**
 * Brief Analyzer — LLM-powered deep parse of campaign briefs
 *
 * Takes raw text (from PDF/DOCX extraction) and uses the LLM Gateway
 * to extract structured ParsedBrief data. Validates output with Zod.
 */

import { callLLMAndParse } from "@/server/services/llm-gateway";
import { parsedBriefSchema, type ParsedBrief } from "./types";

// ── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un DIRECTEUR STRATÉGIQUE senior dans une agence de communication (20 ans d'expérience, marchés africains et émergents).

Ta mission : analyser un brief de campagne client et extraire TOUTES les données structurées.

RÈGLES :
- Extrais TOUT ce qui est présent dans le document, ne laisse rien de côté
- Si une information n'est pas explicite, déduis-la du contexte (ex: si le brief parle de "jus de fruits" → sector = "Boissons / FMCG")
- Pour les livrables, identifie chaque format demandé séparément (TV, Radio, Affichage = 3 livrables distincts)
- Le "channel" de chaque livrable doit correspondre à : TV, RADIO, OOH, PRINT, DIGITAL, SOCIAL, PACKAGING, EVENT, PR, VIDEO
- campaignType doit être : ATL, BTL, TTL, ou 360
- Déduis le campaignName du titre ou du contexte du brief
- Si le budget n'est pas mentionné, omets le champ budget
- Si les dates ne sont pas mentionnées, omets le champ timeline
- Les KPIs doivent être extraits même s'ils sont formulés comme des objectifs qualitatifs

IMPORTANT : Réponds UNIQUEMENT en JSON valide, sans commentaires ni markdown.`;

// ── User prompt template ────────────────────────────────────────────────────

function buildUserPrompt(rawText: string): string {
  return `Analyse ce brief de campagne et extrais les données structurées au format JSON suivant :

{
  "client": {
    "companyName": "Nom de l'entreprise",
    "brandName": "Nom de la marque",
    "sector": "Secteur d'activité",
    "country": "Pays",
    "contactEmail": "email si présent",
    "contactPhone": "téléphone si présent"
  },
  "context": {
    "marketContext": "Contexte marché et concurrentiel",
    "problemStatement": "Problématique stratégique",
    "ambition": "Ambition / vision de la campagne",
    "competitors": ["concurrent1", "concurrent2"],
    "keyMessage": "Message clé de la campagne"
  },
  "objectives": {
    "primary": "Objectif principal",
    "secondary": ["objectif secondaire 1", "objectif secondaire 2"],
    "kpis": ["KPI 1", "KPI 2"]
  },
  "targeting": {
    "corePrimary": "Cœur de cible (description)",
    "secondary": ["cible secondaire 1"],
    "consumerInsight": "Insight consommateur verbatim"
  },
  "creative": {
    "toneAndStyle": ["trait 1", "trait 2"],
    "brandPersonality": "Personnalité de marque si décrite"
  },
  "deliverables": [
    {
      "type": "TV|RADIO|OOH|PRINT|DIGITAL|SOCIAL|PACKAGING|EVENT|PR|VIDEO",
      "description": "Description du livrable",
      "format": "Format (ex: 30s, 12m², A4)",
      "quantity": 1,
      "channel": "TV|RADIO|OOH|PRINT|DIGITAL|SOCIAL|PACKAGING|EVENT|PR|VIDEO"
    }
  ],
  "budget": {
    "total": 0,
    "currency": "XAF",
    "breakdown": {}
  },
  "timeline": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "milestones": [{ "label": "Milestone", "date": "YYYY-MM-DD" }]
  },
  "campaignType": "ATL|BTL|TTL|360",
  "campaignName": "Nom de la campagne"
}

=== BRIEF CLIENT ===
${rawText}
=== FIN DU BRIEF ===`;
}

// ── Confidence scorer ───────────────────────────────────────────────────────

function scoreConfidence(parsed: ParsedBrief): number {
  let score = 0;
  const weights = {
    client: 0.15,
    context: 0.15,
    objectives: 0.15,
    targeting: 0.15,
    creative: 0.10,
    deliverables: 0.15,
    budget: 0.08,
    timeline: 0.07,
  };

  // Client: brandName required
  if (parsed.client.brandName && parsed.client.companyName) score += weights.client;
  else if (parsed.client.brandName) score += weights.client * 0.6;

  // Context: all fields present
  if (parsed.context.marketContext && parsed.context.problemStatement && parsed.context.keyMessage) {
    score += weights.context;
  } else if (parsed.context.marketContext || parsed.context.keyMessage) {
    score += weights.context * 0.5;
  }

  // Objectives
  if (parsed.objectives.primary) score += weights.objectives * 0.6;
  if (parsed.objectives.kpis.length > 0) score += weights.objectives * 0.4;

  // Targeting
  if (parsed.targeting.corePrimary) score += weights.targeting * 0.5;
  if (parsed.targeting.consumerInsight) score += weights.targeting * 0.5;

  // Creative
  if (parsed.creative.toneAndStyle.length > 0) score += weights.creative;

  // Deliverables
  if (parsed.deliverables.length > 0) score += weights.deliverables;

  // Budget (optional)
  if (parsed.budget?.total) score += weights.budget;

  // Timeline (optional)
  if (parsed.timeline?.startDate) score += weights.timeline;

  return Math.round(score * 100) / 100;
}

// ── Main analyzer ───────────────────────────────────────────────────────────

export interface AnalysisResult {
  parsed: ParsedBrief | null;
  raw: Record<string, unknown> | null;
  validationErrors: Array<{ path: string; message: string }>;
  confidence: number;
}

export async function analyzeBrief(
  rawText: string,
  strategyId?: string,
): Promise<AnalysisResult> {
  const result = await callLLMAndParse({
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(rawText),
    caller: "brief-ingest:analyzer",
    strategyId,
    maxTokens: 4000,
    tags: ["brief-ingest", "analysis"],
  });

  if (!result) {
    return {
      parsed: null,
      raw: null,
      validationErrors: [{ path: "root", message: "LLM returned no parseable JSON" }],
      confidence: 0,
    };
  }

  // Zod validation
  const validation = parsedBriefSchema.safeParse(result);

  if (validation.success) {
    const parsed = validation.data;
    parsed.rawTextLength = rawText.split(/\s+/).length;
    parsed.confidence = scoreConfidence(parsed);
    return {
      parsed,
      raw: result as Record<string, unknown>,
      validationErrors: [],
      confidence: parsed.confidence,
    };
  }

  // Validation failed — return errors + raw for manual correction
  const errors = validation.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    parsed: null,
    raw: result as Record<string, unknown>,
    validationErrors: errors,
    confidence: 0,
  };
}
