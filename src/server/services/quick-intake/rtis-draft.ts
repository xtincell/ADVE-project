import { ADVE_STORAGE_KEYS, type PillarStorageKey } from "@/domain";
import { type Pillar, SHAPE_PER_PILLAR } from "./pillar-shapes";

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
import { sanitizeInline, wrapUntrusted } from "@/server/services/utils/untrusted-content";
import {
  getOracleBrandContextByQuery,
  findComparableBrands,
} from "@/server/services/seshat/context-store";

// `Pillar` + `SHAPE_PER_PILLAR` extraits dans ./pillar-shapes (leaf) — rompt le
// cycle rtis-draft ⇄ multi-agent-orchestrator (madge).

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

// SHAPE_PER_PILLAR vit désormais dans ./pillar-shapes (importé en tête).

// ── C8 (Seshat→T nom-vs-réalité, vague D) ─────────────────────────────
// Le draft T citait `marketSize.source: "Seshat"` sans jamais LIRE les
// digests marché réels (EXTERNAL_FEED_DIGEST : RSS/World Bank, rafraîchis
// par /api/cron/external-feeds). On charge le digest frais du couple
// (pays, secteur) et on l'injecte comme SEULE base légitime du label
// "Seshat" ; sans digest, la garde déterministe ci-dessous rétrograde tout
// "Seshat" auto-proclamé en "inferred" (jamais de fausse provenance).

interface MarketDigestBlock {
  found: boolean;
  block: string;
}

export async function loadMarketDigestForT(
  market: string | null | undefined,
  sector: string | null | undefined,
): Promise<MarketDigestBlock> {
  if (!market && !sector) return { found: false, block: "" };
  try {
    // Le pays intake est un nom libre ("Cameroun") ou un ISO-2 — même
    // résolution que complete() via country-registry.
    let countryCode: string | null = null;
    if (market) {
      if (/^[A-Za-z]{2}$/.test(market.trim())) {
        countryCode = market.trim().toUpperCase();
      } else {
        const { lookupCountry } = await import("@/server/services/country-registry");
        countryCode = (await lookupCountry(market))?.code ?? null;
      }
    }
    // Borne de fraîcheur 30 j (rationalisation 2026-07-16) : sans elle, un
    // cron arrêté faisait servir un digest périmé de plusieurs mois SOUS le
    // label « Seshat ». Un digest plus vieux = absent → la garde
    // `enforceSeshatProvenance` rétrograde honnêtement en `inferred`.
    const freshnessCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const entry = await db.knowledgeEntry.findFirst({
      where: {
        entryType: "EXTERNAL_FEED_DIGEST",
        createdAt: { gte: freshnessCutoff },
        ...(countryCode ? { countryCode } : {}),
        ...(sector ? { sector: { contains: sector.trim().toLowerCase().slice(0, 40), mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { data: true, countryCode: true, sector: true, createdAt: true },
    });
    if (!entry) return { found: false, block: "" };

    const data = (entry.data ?? {}) as Record<string, unknown>;
    const lines: string[] = [];
    const macro = Array.isArray(data.macroSignals) ? (data.macroSignals as Array<Record<string, unknown>>) : [];
    for (const m of macro.slice(0, 6)) {
      const label = typeof m.label === "string" ? m.label : typeof m.signal === "string" ? m.signal : null;
      const value = typeof m.value === "string" || typeof m.value === "number" ? String(m.value) : "";
      if (label) lines.push(`- ${label}${value ? ` : ${value}` : ""}`);
    }
    const tt = (data.trendTracker ?? {}) as Record<string, unknown>;
    const ttLines = Object.entries(tt)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 8)
      .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120)}`);
    lines.push(...ttLines);

    if (lines.length === 0) return { found: false, block: "" };
    return {
      found: true,
      block: `DONNÉES MARCHÉ RÉELLES (Seshat external-feeds, ${entry.countryCode ?? "?"}/${entry.sector ?? "?"}, ${entry.createdAt.toISOString().slice(0, 10)}) :\n${lines.join("\n")}\n\nRÈGLE : marque \"source\": \"Seshat\" UNIQUEMENT pour un chiffre présent dans ce bloc. Tout autre chiffre → \"source\": \"inferred\".`,
    };
  } catch {
    return { found: false, block: "" };
  }
}

/**
 * Garde d'honnêteté C8 (déterministe, zéro LLM) : sans digest chargé, un
 * `marketSize.source === "Seshat"` auto-proclamé est rétrogradé "inferred".
 */
export function enforceSeshatProvenance(
  tDraft: Record<string, unknown>,
  digestFound: boolean,
): Record<string, unknown> {
  if (digestFound) return tDraft;
  const marketSize = tDraft.marketSize as Record<string, unknown> | undefined;
  if (marketSize && marketSize.source === "Seshat") {
    return { ...tDraft, marketSize: { ...marketSize, source: "inferred" } };
  }
  return tDraft;
}

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
        // round-16b : PAS de nom de marque tierce dans le prompt (fuite cross-tenant —
        // le LLM pourrait l'écho dans les recos I lues par le fondateur). Étiquettes
        // anonymes « Marque comparable A/B/C » : le cadre « emprunter des patterns »
        // fonctionne à l'identique sans révéler l'identité d'un concurrent.
        comparablesBlock = peers
          .map(
            (p, i) =>
              `- Marque comparable ${String.fromCharCode(65 + i)} (matchScore=${p.matchScore.toFixed(2)}, shared=${p.sharedTraits.slice(0, 3).join("|")})`,
          )
          .join("\n");
      }
    } catch {
      // non-blocking
    }
  }

  // 3-bis. C8 — données marché RÉELLES pour T (digest external-feeds frais).
  let marketDigest: MarketDigestBlock = { found: false, block: "" };
  if (pillar === "t") {
    marketDigest = await loadMarketDigestForT(input.market, input.sector);
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

  const contextBlock = `SECTEUR : ${input.sector ?? "non précisé"}
MARCHÉ : ${input.market ?? "non précisé"}

ADVE de la marque (verbatim) :
${adveBlock}

CONTEXTE HYBRIDE SESHAT :
${hybridBlock}
${marketDigest.found ? `\n${marketDigest.block}` : ""}${seshatRefs ? `\nRÉFÉRENCES SECTORIELLES :\n${seshatRefs}` : ""}${comparablesBlock ? `\n\nMARQUES COMPARABLES (cross-brand) :\n${comparablesBlock}` : ""}${upstreamBlock ? `\n\nRTIS AMONT :\n${upstreamBlock}` : ""}`;

  if (pillar === "i") {
    const { generatePillarIMultiAgent } = await import("./multi-agent-orchestrator");
    return generatePillarIMultiAgent(input.companyName, contextBlock);
  }

  const prompt = `MARQUE : ${sanitizeInline(input.companyName, { max: 120 })}
${wrapUntrusted("CONTEXTE MARQUE", contextBlock, { max: 12000 })}

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
  // C8 — provenance honnête : "Seshat" seulement si un digest a réellement
  // été injecté dans le prompt (garde déterministe, zéro LLM).
  if (pillar === "t") {
    return enforceSeshatProvenance(parsed as Record<string, unknown>, marketDigest.found);
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
  // Phase 1 — R, T, I sequentially
  const r = await draftPillar("r", input);
  const t = await draftPillar("t", input);
  const i = await draftPillar("i", input);

  // Persist R, T, I immediately so the true S protocol can read them
  const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
  for (const [key, content] of [["r", r], ["t", t], ["i", i]] as const) {
    await writePillarAndScore({
      strategyId: input.strategyId,
      pillarKey: key as PillarStorageKey,
      operation: { type: "REPLACE_FULL", content },
      author: { system: "INGESTION", reason: `V3 RTIS draft — pillar ${key}` },
      options: { confidenceDelta: 0.05 },
    });
  }

  // Phase 2 — S synthesizes using the REAL engine so roadmapRoutes & budget are computed
  const { executeProtocoleStrategy } = await import("@/server/services/rtis-protocols/strategy");
  const sResult = await executeProtocoleStrategy(input.strategyId);
  const s = sResult.content;

  // Persist S
  await writePillarAndScore({
    strategyId: input.strategyId,
    pillarKey: "s",
    operation: { type: "REPLACE_FULL", content: s },
    author: { system: "INGESTION", reason: `V3 RTIS draft — pillar s` },
    options: { confidenceDelta: 0.05 },
  });

  return { r, t, i, s };
}
