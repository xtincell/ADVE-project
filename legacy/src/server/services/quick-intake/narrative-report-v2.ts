import { ADVE_STORAGE_KEYS } from "@/domain";

/**
 * narrative-report-v2 — RAG-augmented two-pass pipeline for the intake
 * narrative deliverable.
 *
 * Selected at runtime when `ModelPolicy[purpose="final-report"].pipelineVersion === "V2"`.
 * V1 (`narrative-report.ts`) inlines the raw ADVE content directly into a
 * single Sonnet call. V2 does:
 *
 *   1. **Sync index** — `indexBrandContext(strategyId, "INTAKE_ONLY")` so
 *      the BrandContextNode rows + embeddings are persisted BEFORE any
 *      retrieval. V1 indexes in the background after the report; V2 needs
 *      the nodes synchronously.
 *
 *   2. **Hybrid retrieval per pillar** — for each ADVE pillar, call
 *      `getOracleBrandContext(strategyId, pillarKey)` which returns
 *      `{ narrativeBlock, preciseFields, text }`. This is the SAME hybrid
 *      pattern already in production for the Oracle (cf. oracle-augment.ts):
 *      narrative = lossy semantic context, precise = verbatim DB reads.
 *      Embeddings are NEVER cited; only `preciseFields` are.
 *
 *   3. **Pass 1 — brief synthesis** (`purpose: "extraction"`). A Sonnet
 *      call produces a structured brief object: per-pillar key facts,
 *      tensions, evidence anchors. Cheap to vary and refine.
 *
 *   4. **Pass 2 — final write** (`purpose: "final-report"`). Opus receives
 *      the brief + the hybrid context + the explicit format requirement
 *      (same JSON shape as V1) and writes the deliverable.
 *
 * Quality vs cost: each call is roughly +1 Sonnet brief + 1 Opus write
 * vs V1's single Sonnet call. The expectation is that the Opus write
 * with grounded context produces a measurably more precise narrative —
 * verifiable via the benchmark script (scripts/benchmark-narrative.ts).
 *
 * If the benchmark does NOT show a quality win, leave the policy at V1
 * — there is no architectural reason to pay the Opus premium without
 * evidence of improvement.
 */

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";
import { indexBrandContext } from "@/server/services/seshat/context-store";
import { getOracleBrandContext } from "@/server/services/seshat/context-store";
import type { NarrativeReport } from "./narrative-report";

interface V2Input {
  strategyId: string;
  companyName: string;
  sector: string | null;
  country: string | null;
  classification: string;
  vector: Record<string, number>;
  recoSummaries?: Array<{ pillar: string; field: string; explain: string }>;
  seshatGrounding?: string;
}

const PILLARS = ADVE_STORAGE_KEYS;

/**
 * Pass 1 — brief synthesis. Sonnet (or Ollama substitute via the
 * `extraction` purpose). Produces structured per-pillar facts.
 */
async function synthesizeBrief(
  input: V2Input,
  contextByPillar: Record<string, { narrative: string; preciseFieldsCount: number }>,
): Promise<{
  perPillar: Record<string, { keyFacts: string[]; tensions: string[]; quotableAnchors: string[] }>;
  overallTension: string;
}> {
  // LOT 1e — entrée non fiable neutralisée (anti-injection). Le narratif compact
  // par pilier provient du RAG Seshat (contenu founder/externe indexé) → balisé en
  // bloc « donnée » ; le compteur de champs précis est interne (non balisé).
  const ctxLines = PILLARS.map(
    (p) =>
      `[${p.toUpperCase()}]\n  ${wrapUntrusted("Narrative compact", contextByPillar[p]?.narrative.slice(0, 600) ?? "(vide)", { max: 800 })}\n  Precise fields available: ${contextByPillar[p]?.preciseFieldsCount ?? 0}`,
  ).join("\n");

  const prompt = `MARQUE: ${sanitizeInline(input.companyName, { max: 120 })}
SECTEUR: ${sanitizeInline(input.sector ?? "non précisé", { max: 80 })}
PAYS: ${sanitizeInline(input.country ?? "non précisé", { max: 60 })}
CLASSIFICATION: ${input.classification}

CONTEXTE SESHAT PAR PILIER (déjà retrouvé via embeddings + DB direct) :
${ctxLines}

SCORES /25 :
- A: ${(input.vector.a ?? 0).toFixed(1)}
- D: ${(input.vector.d ?? 0).toFixed(1)}
- V: ${(input.vector.v ?? 0).toFixed(1)}
- E: ${(input.vector.e ?? 0).toFixed(1)}

Travail demandé : produire un BRIEF STRUCTURÉ qui servira d'input à un agent de rédaction final (Opus).
Pour chaque pilier ADVE, identifier :
- 2-4 keyFacts : faits saillants extraits du contexte (à citer dans le rapport)
- 1-2 tensions : tensions identifiables (gap entre intention et exécution, asymétries, paradoxes)
- 1-2 quotableAnchors : éléments verbatim que l'agent final DOIT reprendre tels quels

Plus une tension globale (overallTension) qui structure tout le rapport.

Réponds UNIQUEMENT avec ce JSON :
{
  "perPillar": {
    "a": { "keyFacts": ["..."], "tensions": ["..."], "quotableAnchors": ["..."] },
    "d": { ... },
    "v": { ... },
    "e": { ... }
  },
  "overallTension": "..."
}`;

  const { text } = await callLLM({
    caller: "quick-intake:narrative-v2:brief",
    purpose: "extraction",
    system: `${UNTRUSTED_NOTICE}\n\nTu es un analyste stratégique. Tu produis des briefs structurés en JSON, jamais de paragraphes.`,
    prompt,
    maxOutputTokens: 2048,
  });
  return extractJSON(text) as Awaited<ReturnType<typeof synthesizeBrief>>;
}

/**
 * Pass 2 — final write. Opus by policy (`final-report`).
 */
async function writeFinalReport(
  input: V2Input,
  brief: Awaited<ReturnType<typeof synthesizeBrief>>,
  hybridContextByPillar: Record<string, string>,
): Promise<NarrativeReport> {
  // LOT 1e — entrées non fiables neutralisées (anti-injection). Contexte hybride
  // Seshat (RAG founder/externe), brief (sortie LLM dérivée du founder), recos
  // Notoria et réfs sectorielles : tous balisés en blocs « donnée ».
  const ctxBlocks = PILLARS.map((p) => `\n${wrapUntrusted(`CONTEXTE HYBRIDE Pilier ${p.toUpperCase()}`, hybridContextByPillar[p] ?? "", { max: 6000 })}`).join("\n");
  const briefBlock = JSON.stringify(brief, null, 2);
  const recoText = (input.recoSummaries ?? [])
    .slice(0, 8)
    .map((r) => `- (${r.pillar}.${r.field}) ${r.explain}`)
    .join("\n");

  const prompt = `MARQUE: ${sanitizeInline(input.companyName, { max: 120 })}
SECTEUR: ${sanitizeInline(input.sector ?? "non précisé", { max: 80 })}
PAYS: ${sanitizeInline(input.country ?? "non précisé", { max: 60 })}
CLASSIFICATION: ${input.classification}

BRIEF STRUCTURÉ (Pass 1 — Sonnet) :
${wrapUntrusted("BRIEF STRUCTURÉ", briefBlock, { max: 8000 })}

CONTEXTE HYBRIDE PAR PILIER (Seshat — narratif compressé + précis verbatim) :
${ctxBlocks}
${recoText ? `\nRECOMMANDATIONS NOTORIA :\n${wrapUntrusted("RECOMMANDATIONS NOTORIA", recoText, { max: 4000 })}` : ""}${input.seshatGrounding ? `\nRÉFÉRENCES SECTORIELLES :\n${wrapUntrusted("RÉFÉRENCES SECTORIELLES", input.seshatGrounding, { max: 6000 })}` : ""}

CONTRAINTES STRICTES :
1. Reprends les quotableAnchors VERBATIM dans tes commentaires "full".
2. Cite les valeurs PRÉCISES verbatim (pas de paraphrase de chiffres ou noms).
3. Le narratif compressé est pour t'orienter — ne le cite pas tel quel.
4. Le rapport doit être en français, ton "vous" professionnel.
5. preview = 1 phrase pour la teasing card. full = 2-3 phrases denses.

Réponds UNIQUEMENT avec ce JSON :
{
  "executiveSummary": "<3-4 phrases globales s'appuyant sur overallTension>",
  "adve": [
    { "key": "a", "name": "Authenticité", "preview": "...", "full": "..." },
    { "key": "d", "name": "Distinction",  "preview": "...", "full": "..." },
    { "key": "v", "name": "Valeur",       "preview": "...", "full": "..." },
    { "key": "e", "name": "Engagement",   "preview": "...", "full": "..." }
  ],
  "rtis": {
    "framing": "<2-3 phrases reliant la tension globale au futur RTIS>",
    "pillars": [
      { "key": "r", "name": "Risque",     "preview": "...", "full": "...", "priority": "P0", "keyMove": "..." },
      { "key": "t", "name": "Track",      "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "i", "name": "Innovation", "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "s", "name": "Stratégie",  "preview": "...", "full": "...", "priority": "P2", "keyMove": "..." }
    ]
  }
}`;

  const { text } = await callLLM({
    caller: "quick-intake:narrative-v2:final",
    purpose: "final-report",
    system: `${UNTRUSTED_NOTICE}\n\nTu es Mestor, le directeur stratégique de La Fusée. Tu écris des rapports denses, concrets, ancrés sur des sources verbatim. Tu ne paraphrases JAMAIS un chiffre ou un nom. Tu ne génères pas de copie générique.`,
    prompt,
    maxOutputTokens: 4096,
  });
  const parsed = extractJSON(text) as Partial<NarrativeReport>;
  if (
    !parsed ||
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.adve) ||
    parsed.adve.length !== 4 ||
    !parsed.rtis ||
    !Array.isArray(parsed.rtis.pillars) ||
    parsed.rtis.pillars.length !== 4
  ) {
    throw new Error("Narrative report V2: shape invalide retournée par le LLM");
  }
  return parsed as NarrativeReport;
}

export async function generateNarrativeReportV2(input: V2Input): Promise<NarrativeReport> {
  // 1. Sync index — V2 needs BrandContextNode populated before retrieval.
  await indexBrandContext(input.strategyId, "INTAKE_ONLY").catch((err) => {
    // Non-blocking: if indexing fails, hybrid retrieval will return only
    // the precise (DB) part, which is still better than nothing.
    console.warn(
      "[narrative-v2] indexBrandContext failed (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  });

  // 2. Hybrid retrieval per pillar — narrative + precise verbatim.
  const hybridContextByPillar: Record<string, string> = {};
  const briefMaterialByPillar: Record<string, { narrative: string; preciseFieldsCount: number }> = {};
  for (const p of PILLARS) {
    const ctx = await getOracleBrandContext(input.strategyId, p, { limit: 12 }).catch(() => null);
    hybridContextByPillar[p] = ctx?.text ?? "(aucun contexte indexé pour ce pilier)";
    briefMaterialByPillar[p] = {
      narrative: ctx?.narrativeBlock ?? "",
      preciseFieldsCount: ctx?.preciseFields.length ?? 0,
    };
  }

  // 3. Pass 1 — brief synthesis (Sonnet/extraction).
  const brief = await synthesizeBrief(input, briefMaterialByPillar);

  // 4. Pass 2 — final write (Opus/final-report).
  return writeFinalReport(input, brief, hybridContextByPillar);
}
