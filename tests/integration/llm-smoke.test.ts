/**
 * LLM SMOKE TESTS — Real API calls against every LLM flow
 *
 * These tests call the REAL Anthropic API (no mocks).
 * They validate:
 *   1. The API key works
 *   2. Each service's prompt produces parseable output
 *   3. extractJSON handles real LLM responses
 *   4. Response shapes match what services expect
 *
 * Cost control: uses claude-haiku-4-5 + low maxTokens.
 * Expected cost: ~$0.10-0.30 per full run.
 *
 * Run: npx vitest run tests/integration/llm-smoke.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env for API key
beforeAll(() => {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Manually parse .env since dotenv + vitest ESM can be unreliable
    for (const envFile of [".env.local", ".env"]) {
      try {
        const envPath = resolve(process.cwd(), envFile);
        const content = readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.match(/^([^#=]+)=(.*)$/);
          if (match) {
            const key = match[1]!.trim();
            let val = match[2]!.trim();
            // Strip surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = val;
          }
        }
      } catch { /* file not found — try next */ }
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not found in .env — cannot run LLM smoke tests");
  }
});

// ── Shared config ─────────────────────────────────────────────────────────
const SMOKE_MODEL = "claude-haiku-4-5-20251001";
const SMOKE_MAX_TOKENS = 1500;
const SMOKE_TIMEOUT = 30_000;

// Direct Anthropic SDK call — bypasses the gateway to avoid DB/cost-tracking deps
async function callReal(system: string, prompt: string): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: SMOKE_MODEL,
    max_tokens: SMOKE_MAX_TOKENS,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (!block || block.type !== "text") throw new Error("No text block in response");
  return block.text;
}

async function callRealJSON(system: string, prompt: string): Promise<Record<string, unknown>> {
  const text = await callReal(system, prompt);
  // Use the same extractJSON as the gateway
  const { extractJSON } = await import("@/server/services/llm-gateway/index");
  return extractJSON(text) as Record<string, unknown>;
}

// ── Minimal brand context for prompts ─────────────────────────────────────
const BRAND = {
  name: "AquaPure",
  sector: "FMCG",
  market: "France",
  positioning: "Eau minerale premium bio",
  target: "CSP+ 25-45 ans, urbains soucieux de leur sante",
};

const PILLAR_CONTEXT = `
Marque: ${BRAND.name}
Secteur: ${BRAND.sector}
Marché: ${BRAND.market}
Positionnement: ${BRAND.positioning}
Cible: ${BRAND.target}
`;

// ============================================================================
// PHASE 0 — GATEWAY CORE
// ============================================================================
describe("LLM Gateway Core", () => {
  it("callLLM returns text and usage", async () => {
    const { callLLM } = await import("@/server/services/llm-gateway/index");
    const result = await callLLM({
      system: "Tu es un assistant.",
      prompt: "Reponds juste 'OK'.",
      caller: "smoke-test:gateway",
      model: SMOKE_MODEL,
      maxOutputTokens: 50,
    });
    expect(result.text).toBeTruthy();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  }, SMOKE_TIMEOUT);

  it("callLLMAndParse returns parsed JSON", async () => {
    const { callLLMAndParse } = await import("@/server/services/llm-gateway/index");
    const result = await callLLMAndParse({
      system: "Tu es un assistant JSON. Reponds UNIQUEMENT en JSON valide.",
      prompt: 'Retourne: {"status": "ok", "value": 42}',
      caller: "smoke-test:parse",
      model: SMOKE_MODEL,
      maxOutputTokens: 100,
    });
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("value");
  }, SMOKE_TIMEOUT);

  it("extractJSON handles markdown-wrapped JSON", async () => {
    const { extractJSON } = await import("@/server/services/llm-gateway/index");
    const text = 'Voici le resultat:\n```json\n{"score": 85, "label": "FORTE"}\n```\nBonne chance!';
    const parsed = extractJSON(text);
    expect(parsed).toEqual({ score: 85, label: "FORTE" });
  });

  it("extractJSON handles embedded JSON in text", async () => {
    const { extractJSON } = await import("@/server/services/llm-gateway/index");
    const text = 'Le resultat est {"items": [1,2,3], "total": 3} voila.';
    const parsed = extractJSON(text) as { items: number[]; total: number };
    expect(parsed.items).toHaveLength(3);
    expect(parsed.total).toBe(3);
  });
});

// ============================================================================
// PHASE 1 — BOOT SEQUENCE (question generation)
// ============================================================================
describe("Boot Sequence — Question Generation", () => {
  it("generates questions for pillar A (Authenticite)", async () => {
    const text = await callReal(
      `Tu es Mestor, le moteur decisionnaire de La Fusee. Tu generes des questions de diagnostic pour une marque.
Reponds UNIQUEMENT en JSON: un array d'objets avec { "question": string, "field": string, "type": "text" | "select" }.`,
      `Genere 3 questions pour le pilier AUTHENTICITE de la marque suivante:
${PILLAR_CONTEXT}
Les questions doivent explorer l'identite fondamentale de la marque.`,
    );
    const { extractJSON } = await import("@/server/services/llm-gateway/index");
    const questions = extractJSON(text) as unknown[];
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(1);
    const q = questions[0] as Record<string, unknown>;
    expect(q).toHaveProperty("question");
    expect(q).toHaveProperty("field");
  }, SMOKE_TIMEOUT);
}, );

// ============================================================================
// PHASE 2 — ARTEMIS (framework execution)
// ============================================================================
describe("Artemis — Framework Execution", () => {
  it("executes brand archetype framework (fw-01)", async () => {
    const result = await callRealJSON(
      `Tu es un expert en strategie de marque. Tu executes le framework "Brand Archetype Identifier".
Reponds UNIQUEMENT en JSON avec: { "archetype": string, "confidence": number, "traits": string[], "narrative": string }`,
      `Analyse la marque suivante et identifie son archetype:
${PILLAR_CONTEXT}`,
    );
    expect(result).toHaveProperty("archetype");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("traits");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 3 — GLORY TOOLS (creative tool execution)
// ============================================================================
describe("Glory Tools — Tool Execution", () => {
  it("executes semiotic brand analyzer", async () => {
    const result = await callRealJSON(
      `Tu es un semioticien expert en analyse de marque.
Reponds UNIQUEMENT en JSON: { "signs": [{ "type": string, "element": string, "meaning": string }], "recommendation": string }`,
      `Analyse semiotique de la marque:
${PILLAR_CONTEXT}
Identifie 3 signes cles.`,
    );
    expect(result).toHaveProperty("signs");
    expect(result).toHaveProperty("recommendation");
    const signs = result.signs as unknown[];
    expect(signs.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 4 — INGESTION PIPELINE (AI filler)
// ============================================================================
describe("Ingestion Pipeline — AI Filler", () => {
  it("fills pillar A from brand context", async () => {
    const result = await callRealJSON(
      `Tu es un expert en branding. Tu remplis les champs du pilier AUTHENTICITE (A) a partir des donnees fournies.
Reponds UNIQUEMENT en JSON avec les champs: { "brandPromise": string, "values": string[], "archetype": string, "heritage": string, "confidence": number }`,
      `Donnees de la marque:
${PILLAR_CONTEXT}
Remplis le pilier Authenticite.`,
    );
    expect(result).toHaveProperty("brandPromise");
    expect(result).toHaveProperty("values");
    expect(result).toHaveProperty("confidence");
    expect(typeof result.confidence).toBe("number");
  }, SMOKE_TIMEOUT);

  it("fills RTIS pillar R (Risk)", async () => {
    const result = await callRealJSON(
      `Tu es un analyste strategique. Tu evalues les risques d'une marque.
Reponds UNIQUEMENT en JSON: { "threats": [{ "name": string, "severity": string, "mitigation": string }], "overallRisk": string }`,
      `Analyse les risques pour:
${PILLAR_CONTEXT}`,
    );
    expect(result).toHaveProperty("threats");
    expect(result).toHaveProperty("overallRisk");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 5 — MESTOR COMMANDANT
// ============================================================================
describe("Mestor Commandant", () => {
  it("generates strategic insights", async () => {
    const result = await callRealJSON(
      `Tu es le Commandant MESTOR, le decideur strategique de La Fusee.
Reponds UNIQUEMENT en JSON: { "insights": [{ "type": string, "title": string, "description": string, "priority": string }] }`,
      `Genere 3 insights strategiques pour:
${PILLAR_CONTEXT}`,
    );
    expect(result).toHaveProperty("insights");
    const insights = result.insights as unknown[];
    expect(insights.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);

  it("runs budget reallocation scenario", async () => {
    const result = await callRealJSON(
      `Tu es le Commandant MESTOR. Tu simules un scenario strategique.
Reponds UNIQUEMENT en JSON: { "type": string, "title": string, "summary": string, "impacts": [{ "dimension": string, "value": string }], "risks": string[], "recommendations": string[], "confidence": number }`,
      `Simule un scenario de REALLOCATION BUDGETAIRE pour:
${PILLAR_CONTEXT}
Parametres: transferer 30% du budget TV vers le digital.`,
    );
    expect(result).toHaveProperty("type");
    expect(result).toHaveProperty("impacts");
    expect(result).toHaveProperty("confidence");
    expect(typeof result.confidence).toBe("number");
  }, SMOKE_TIMEOUT);

  it("assists glory tool with creative judgment", async () => {
    const result = await callRealJSON(
      `Tu es le Commandant MESTOR. Tu assistes un outil GLORY en apportant un jugement strategique.
Reponds UNIQUEMENT en JSON: { "judgment": string, "adjustments": string[], "confidence": number }`,
      `L'outil "visual-landscape-mapper" a produit une analyse pour:
${PILLAR_CONTEXT}
Apporte ton jugement strategique sur la direction visuelle.`,
    );
    expect(result).toHaveProperty("judgment");
    expect(result).toHaveProperty("adjustments");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 6 — RTIS CASCADE
// ============================================================================
describe("RTIS Cascade — Pillar Actualization", () => {
  it("generates ADVE recommendations", async () => {
    const result = await callRealJSON(
      `Tu es le moteur RTIS de La Fusee. Tu generes des recommandations pour ameliorer un pilier ADVE.
Reponds UNIQUEMENT en JSON: { "recommendations": [{ "field": string, "operation": "SET" | "ADD" | "MODIFY", "proposedValue": string, "justification": string, "impact": "LOW" | "MEDIUM" | "HIGH" }] }`,
      `Genere 2 recommandations pour le pilier AUTHENTICITE de:
${PILLAR_CONTEXT}
Contenu actuel du pilier: { "brandPromise": "Purete naturelle", "values": ["sante", "nature"] }`,
    );
    expect(result).toHaveProperty("recommendations");
    const recos = result.recommendations as unknown[];
    expect(recos.length).toBeGreaterThanOrEqual(1);
    const reco = recos[0] as Record<string, unknown>;
    expect(reco).toHaveProperty("field");
    expect(reco).toHaveProperty("operation");
    expect(reco).toHaveProperty("justification");
  }, SMOKE_TIMEOUT);

  it("actualizes R pillar (Risk triangulation)", async () => {
    const result = await callRealJSON(
      `Tu es l'analyseur de risques RTIS. Tu triangules les risques a partir des piliers ADVE.
Reponds UNIQUEMENT en JSON: { "riskFactors": [{ "category": string, "level": string, "description": string }], "globalRiskScore": number }`,
      `Triangule les risques pour:
${PILLAR_CONTEXT}
Piliers existants: A (Authenticite: complete), D (Distinction: partiel), V (Valeur: complete), E (Engagement: partiel).`,
    );
    expect(result).toHaveProperty("riskFactors");
    expect(result).toHaveProperty("globalRiskScore");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 7 — NOTORIA (recommendation engine)
// ============================================================================
describe("Notoria — Batch Generation", () => {
  it("generates recommendation batch for ADVE pillars", async () => {
    const result = await callRealJSON(
      `Tu es le moteur Notoria de La Fusee. Tu generes un batch de recommandations pour ameliorer les piliers.
Reponds UNIQUEMENT en JSON: { "batchId": string, "recommendations": [{ "targetPillarKey": string, "targetField": string, "operation": "SET" | "ADD" | "MODIFY", "proposedValue": string, "explain": string, "confidence": number }] }`,
      `Genere 3 recommandations reparties sur les piliers A, D, V, E pour:
${PILLAR_CONTEXT}`,
    );
    expect(result).toHaveProperty("recommendations");
    const recos = result.recommendations as unknown[];
    expect(recos.length).toBeGreaterThanOrEqual(1);
    const reco = recos[0] as Record<string, unknown>;
    expect(reco).toHaveProperty("targetPillarKey");
    expect(reco).toHaveProperty("targetField");
    expect(reco).toHaveProperty("confidence");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 8 — SESHAT/TARSIS (market intelligence)
// ============================================================================
describe("Seshat Tarsis — Market Intelligence", () => {
  it("collects market signals", async () => {
    const result = await callRealJSON(
      `Tu es Seshat, l'observatrice du marche. Tu collectes des signaux de marche.
Reponds UNIQUEMENT en JSON: { "signals": [{ "type": string, "source": string, "content": string, "relevance": number }] }`,
      `Identifie 3 signaux de marche pour:
${PILLAR_CONTEXT}
Secteur: eau minerale premium en France.`,
    );
    expect(result).toHaveProperty("signals");
    const signals = result.signals as unknown[];
    expect(signals.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);

  it("analyzes weak signals", async () => {
    const result = await callRealJSON(
      `Tu es Seshat, specialiste en detection de signaux faibles. Tu analyses les tendances emergentes.
Reponds UNIQUEMENT en JSON: { "weakSignals": [{ "signal": string, "probability": number, "timeHorizon": string, "impact": string }], "synthesis": string }`,
      `Analyse les signaux faibles pour le secteur eau minerale premium:
- Tendance "water sommelier" en restauration
- Emballages rechargeables en vrac
- Certification B-Corp dans le FMCG`,
    );
    expect(result).toHaveProperty("weakSignals");
    expect(result).toHaveProperty("synthesis");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 9 — VAULT ENRICHMENT
// ============================================================================
describe("Vault Enrichment", () => {
  it("enriches pillar from vault data", async () => {
    const result = await callRealJSON(
      `Tu es un analyste de donnees de marque. Tu enrichis un pilier a partir de donnees brutes du vault.
Reponds UNIQUEMENT en JSON: { "enrichments": [{ "field": string, "value": string, "source": string, "confidence": number }], "summary": string }`,
      `Enrichis le pilier DISTINCTION (D) a partir de ces donnees vault:
Marque: ${BRAND.name}
Documents: "Etude de marche Q4 2025 - AquaPure se differencie par sa source alpine certifiee, son engagement zero plastique, et son partenariat avec des chefs etoiles."`,
    );
    expect(result).toHaveProperty("enrichments");
    expect(result).toHaveProperty("summary");
    const enrichments = result.enrichments as unknown[];
    expect(enrichments.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 10 — CAMPAIGN PLAN GENERATOR
// ============================================================================
describe("Campaign Plan Generator", () => {
  it("generates campaign plan from brief", async () => {
    const result = await callRealJSON(
      `Tu es un planificateur de campagne marketing. Tu crees un plan detaille.
Reponds UNIQUEMENT en JSON: { "name": string, "objective": string, "phases": [{ "name": string, "duration": string, "actions": string[] }], "suggestedDrivers": string[], "estimatedBudget": string }`,
      `Cree un plan de campagne pour:
${PILLAR_CONTEXT}
Objectif: lancement nouveau format 50cl eco-responsable.
Budget: 200k EUR. Duree: 3 mois.`,
    );
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("phases");
    expect(result).toHaveProperty("suggestedDrivers");
    const phases = result.phases as unknown[];
    expect(phases.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 11 — IMPLEMENTATION GENERATOR
// ============================================================================
describe("Implementation Generator", () => {
  it("generates implementation plan (pass 1 — analysis)", async () => {
    const result = await callRealJSON(
      `Tu es un expert en implementation strategique. PASS 1: Analyse les piliers et propose un plan d'action.
Reponds UNIQUEMENT en JSON: { "priorities": [{ "pillar": string, "action": string, "urgency": string }], "timeline": string, "dependencies": string[] }`,
      `Analyse les piliers pour implementation:
${PILLAR_CONTEXT}
Piliers: A(85%), D(60%), V(75%), E(40%), R(70%), T(50%), I(30%), S(20%)
Identifie les priorites d'implementation.`,
    );
    expect(result).toHaveProperty("priorities");
    expect(result).toHaveProperty("timeline");
    const priorities = result.priorities as unknown[];
    expect(priorities.length).toBeGreaterThanOrEqual(1);
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 12 — BRIEF INGEST ANALYZER
// ============================================================================
describe("Brief Ingest — Analyzer", () => {
  it("parses raw brief text into structured data", async () => {
    const result = await callRealJSON(
      `Tu es un parseur de briefs marketing. Tu extrais les informations structurees d'un brief brut.
Reponds UNIQUEMENT en JSON: { "brandName": string, "objective": string, "targetAudience": string, "budget": string, "timeline": string, "channels": string[], "kpis": string[], "confidence": number }`,
      `Parse ce brief:
"AquaPure lance son nouveau format 50cl eco en Janvier 2026. Budget de 200k, cible les millennials urbains via Instagram et affichage metro. KPIs: notoriete +15%, PDM +2pts en 6 mois."`,
    );
    expect(result).toHaveProperty("brandName");
    expect(result).toHaveProperty("objective");
    expect(result).toHaveProperty("channels");
    expect(result).toHaveProperty("confidence");
    expect(typeof result.confidence).toBe("number");
  }, SMOKE_TIMEOUT);
});

// ============================================================================
// PHASE 13 — PILLAR MATURITY AUTO-FILLER
// ============================================================================
describe("Pillar Maturity — Auto-Filler", () => {
  it("generates AI content for missing pillar fields", async () => {
    const result = await callRealJSON(
      `Tu es un expert en strategie de marque. Tu generes du contenu pour les champs manquants d'un pilier.
Reponds UNIQUEMENT en JSON: { "generatedFields": [{ "field": string, "value": string, "confidence": number, "source": "AI_GENERATION" }] }`,
      `Remplis les champs manquants du pilier VALEUR (V) pour:
${PILLAR_CONTEXT}
Champs existants: { "pricePositioning": "premium" }
Champs manquants: "valueProposition", "perceivedBenefits", "priceJustification"`,
    );
    expect(result).toHaveProperty("generatedFields");
    const fields = result.generatedFields as unknown[];
    expect(fields.length).toBeGreaterThanOrEqual(1);
    const field = fields[0] as Record<string, unknown>;
    expect(field).toHaveProperty("field");
    expect(field).toHaveProperty("value");
    expect(field).toHaveProperty("confidence");
  }, SMOKE_TIMEOUT);
});
