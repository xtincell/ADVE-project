/**
 * rtis-draft — Generates structured RTIS content for an intake-converted
 * strategy, BEFORE the narrative report runs.
 *
 * Why this exists (V3):
 *   - V1 narrative-report invented R/T/I/S sections in one shot, ungrounded.
 *   - V2 RAG'd over ADVE — useless because ADVE is the user's verbatim input.
 *   - V3 fills the RTIS Pillar.content rows with RAG-augmented synthesis
 *     (BrandContextNode hybrid + Seshat references + comparables), THEN the
 *     narrative-report writes the deliverable consuming richly-populated
 *     RTIS fields. This is what the original architecture intended; V1's
 *     monolithic call was the shortcut.
 *
 * Each pillar draft:
 *   1. Hybrid retrieval — `getOracleBrandContextByQuery(strategyId, query)`
 *      returns narrative (lossy) + precise (verbatim DB). Embeddings cite
 *      orientation; Pillar.content is cited verbatim.
 *   2. Sector references — Seshat's `queryReferences` for grounding.
 *   3. Comparable brands (I only) — `findComparableBrands`.
 *   4. Sonnet (purpose: "agent") synthesises a structured shape.
 *   5. Persisted via `writePillar` so the rows are queryable downstream
 *      AND auditable in the IntentEmission/Pillar versioning.
 *
 * Costs: ~4× Sonnet calls per intake. With Ollama substitution (policy
 * `agent.allowOllamaSubstitution=true`), free locally.
 */

import { db } from "@/lib/db";
import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import {
  getOracleBrandContextByQuery,
  findComparableBrands,
} from "@/server/services/seshat/context-store";
import { ADVE_STORAGE_KEYS } from "@/domain";

type Pillar = "r" | "t" | "i" | "s";

export interface RtisDraftResult {
  readonly r: Record<string, unknown>;
  readonly t: Record<string, unknown>;
  readonly i: Record<string, unknown>;
  readonly s: Record<string, unknown>;
}

const QUERY_PER_PILLAR: Record<Pillar, string> = {
  r: "principaux risques de marque, vulnérabilités, fragilités",
  t: "marché concurrent, parts de marché, traction commerciale, signaux faibles",
  i: "potentiels d'innovation, cas inspirants, ruptures envisageables",
  s: "stratégie différenciante, positionnement, plan d'action",
};

const SYSTEM_PROMPT_BY_PILLAR: Record<Pillar, string> = {
  r: `Tu es Mestor — analyste stratégique. Tu produis une analyse RISQUE structurée pour la marque.

Tu reçois :
- contexte hybride Seshat (narratif compressé + valeurs précises verbatim)
- références sectorielles
- ADVE rempli de la marque

Tu produis un JSON structuré. Pas de paragraphes, du JSON pur.`,
  t: `Tu es Mestor — analyste marché. Tu produis une analyse TRACK structurée (réalité du marché).

Tu reçois :
- contexte hybride Seshat
- benchmarks sectoriels
- ADVE de la marque

Tu produis un JSON structuré ancré sur des chiffres. Si pas de chiffres, tu écris "à mesurer" — tu n'inventes pas.`,
  i: `Tu es Mestor — directeur d'innovation. Tu produis une analyse INNOVATION structurée.

Tu reçois :
- contexte hybride Seshat
- patterns cross-brand
- ADVE de la marque

Tu produis un JSON structuré avec des pistes d'innovation concrètes ancrées sur des comparables réels quand disponibles.`,
  s: `Tu es Mestor — directeur stratégique. Tu produis une SYNTHÈSE STRATÉGIQUE structurée.

Tu reçois :
- contexte hybride Seshat
- les 3 piliers RTIS amont (R, T, I) déjà écrits
- ADVE de la marque

Ta synthèse RÉSOUT la tension entre R, T, I, et l'ancrage ADVE. Tu produis un JSON structuré.`,
};

const SHAPE_PER_PILLAR: Record<Pillar, string> = {
  r: `{
  "criticalRisks": [{ "name": "...", "severity": "P0"|"P1"|"P2", "evidence": "...", "anchor": "ADVE.<pillar>.<field>" }],
  "vulnerabilities": ["..."],
  "blindSpots": ["..."],
  "narrative": "<2-3 phrases qui synthétisent les risques>"
}`,
  t: `{
  "marketSize": { "value": "...", "source": "Seshat|ADVE|inferred" },
  "competitivePressure": [{ "name": "...", "share": "...", "threat": "..." }],
  "weakSignals": ["..."],
  "tractionGap": "<phrase>",
  "narrative": "<2-3 phrases sur le marché réel>"
}`,
  i: `{
  "highValuePlays": [{ "title": "...", "rationale": "...", "anchor": "comparable:<name>|ADVE.<pillar>.<field>" }],
  "comparablePatterns": [{ "brand": "...", "patternBorrowed": "..." }],
  "creativeFrontiers": ["..."],
  "narrative": "<2-3 phrases sur le potentiel>"
}`,
  s: `{
  "strategicPosture": "<une phrase qui définit la posture>",
  "winningMove": "<le pari central>",
  "rtisSynthesis": { "fromRisk": "...", "fromTrack": "...", "fromInnovation": "..." },
  "narrative": "<2-3 phrases stratégiques cohérentes>"
}`,
};

interface DraftInput {
  strategyId: string;
  companyName: string;
  sector: string | null;
  market: string | null;
}

async function loadAdveCompact(strategyId: string): Promise<string> {
  const pillars = await db.pillar.findMany({
    where: { strategyId, key: { in: [...ADVE_STORAGE_KEYS] } },
    select: { key: true, content: true },
  });
  const lines: string[] = [];
  for (const p of pillars) {
    const c = (p.content as Record<string, unknown> | null) ?? {};
    const filled = Object.entries(c)
      .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
      .slice(0, 8); // cap to keep prompt reasonable
    if (filled.length === 0) continue;
    const summary = filled
      .map(([k, v]) => `  ${k}=${typeof v === "string" ? v.slice(0, 120) : JSON.stringify(v).slice(0, 200)}`)
      .join("\n");
    lines.push(`[${p.key.toUpperCase()}]\n${summary}`);
  }
  return lines.join("\n\n");
}

async function draftPillar(
  pillar: Pillar,
  input: DraftInput,
  upstreamRtis?: Partial<RtisDraftResult>,
): Promise<Record<string, unknown>> {
  // 1. Hybrid retrieval over the brand's already-indexed ADVE.
  const ctx = await getOracleBrandContextByQuery(input.strategyId, QUERY_PER_PILLAR[pillar], {
    limit: 8,
  }).catch(() => null);
  const hybridBlock = ctx?.text ?? "(aucun contexte indexé)";

  // 2. Seshat sector references — grounding from outside the brand.
  let seshatRefs = "";
  if (input.sector || input.market) {
    try {
      const { queryReferences } = await import("@/server/services/seshat");
      const refs = await queryReferences({
        topic: pillar === "t" ? "MARKET_TRACK" : pillar === "r" ? "RISK_PATTERNS" : pillar === "i" ? "INNOVATION_PATTERNS" : "STRATEGY_PATTERNS",
        sector: input.sector ?? undefined,
        market: input.market ?? undefined,
        limit: 5,
      });
      if (refs.length > 0) {
        seshatRefs = refs
          .map((r) => `- ${r.title}: ${r.excerpt.slice(0, 200)}`)
          .join("\n");
      }
    } catch {
      // non-blocking
    }
  }

  // 3. Comparable brands (I only — patterns to borrow).
  let comparablesBlock = "";
  if (pillar === "i") {
    try {
      const peers = await findComparableBrands(input.strategyId, 4);
      if (peers.length > 0) {
        const ids = peers.map((p) => p.strategyId);
        const peerRows = await db.strategy.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const nameById = new Map(peerRows.map((s) => [s.id, s.name]));
        comparablesBlock = peers
          .map(
            (p) =>
              `- ${nameById.get(p.strategyId) ?? p.strategyId} (matchScore=${p.matchScore.toFixed(2)}, shared=${p.sharedTraits.slice(0, 3).join("|")})`,
          )
          .join("\n");
      }
    } catch {
      // non-blocking
    }
  }

  // 4. ADVE context (verbatim values).
  const adveBlock = await loadAdveCompact(input.strategyId);

  // 5. Upstream RTIS for S synthesis.
  let upstreamBlock = "";
  if (pillar === "s" && upstreamRtis) {
    upstreamBlock = `R DRAFT: ${JSON.stringify(upstreamRtis.r ?? {}).slice(0, 800)}
T DRAFT: ${JSON.stringify(upstreamRtis.t ?? {}).slice(0, 800)}
I DRAFT: ${JSON.stringify(upstreamRtis.i ?? {}).slice(0, 800)}`;
  }

  const prompt = `MARQUE : ${input.companyName}
SECTEUR : ${input.sector ?? "non précisé"}
MARCHÉ : ${input.market ?? "non précisé"}

ADVE de la marque (verbatim) :
${adveBlock}

CONTEXTE HYBRIDE SESHAT :
${hybridBlock}
${seshatRefs ? `\nRÉFÉRENCES SECTORIELLES :\n${seshatRefs}` : ""}${comparablesBlock ? `\n\nMARQUES COMPARABLES (cross-brand) :\n${comparablesBlock}` : ""}${upstreamBlock ? `\n\nRTIS AMONT :\n${upstreamBlock}` : ""}

Produis UNIQUEMENT ce JSON exact :
${SHAPE_PER_PILLAR[pillar]}`;

  const { text } = await callLLM({
    caller: `quick-intake:rtis-draft:${pillar}`,
    purpose: "agent",
    system: SYSTEM_PROMPT_BY_PILLAR[pillar],
    prompt,
    maxOutputTokens: 1500,
  });
  const parsed = extractJSON(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`rtis-draft[${pillar}]: shape JSON invalide`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Generates and persists RTIS drafts for a strategy. R/T/I run in parallel
 * (independent), then S runs synthesizing the three.
 *
 * Each pillar's content is persisted via `writePillar` with system="INGESTION"
 * so the audit trail lists this as the V3 RTIS draft origin.
 */
export async function generateAndPersistRtisDraft(input: DraftInput): Promise<RtisDraftResult> {
  // Phase 1 — R, T, I in parallel
  const [r, t, i] = await Promise.all([
    draftPillar("r", input),
    draftPillar("t", input),
    draftPillar("i", input),
  ]);
  // Phase 2 — S synthesizes the upstream three
  const s = await draftPillar("s", input, { r, t, i });

  // Persist via the gateway. writePillar handles versioning + scoring +
  // staleness propagation as a side-effect of the write.
  const { writePillar } = await import("@/server/services/pillar-gateway");
  for (const [key, content] of [["r", r], ["t", t], ["i", i], ["s", s]] as const) {
    await writePillar({
      strategyId: input.strategyId,
      pillarKey: key as never,
      operation: { type: "REPLACE_FULL", content },
      author: { system: "INGESTION", reason: `V3 RTIS draft — pillar ${key}` },
      options: { confidenceDelta: 0.05 },
    });
  }

  return { r, t, i, s };
}
