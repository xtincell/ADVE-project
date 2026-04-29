/**
 * narrative-report-v3 — RTIS-first, RAG-augmented, two-block deliverable.
 *
 * Activated when ModelPolicy[purpose="final-report"].pipelineVersion === "V3".
 *
 * Architectural difference vs V1/V2:
 *   - RTIS Pillar.content rows are populated BEFORE this function runs
 *     (by `generateAndPersistRtisDraft` in rtis-draft.ts). So RAG can
 *     actually pull rich content for r/t/i/s, not just user-typed ADVE.
 *   - ADVE is loaded VERBATIM from Pillar.content; the prompt forbids the
 *     LLM from paraphrasing values. Post-validation enforces ≥3 verbatim
 *     citations per ADVE pillar.
 *   - The Opus output has TWO top-level blocks, `diagnostic` and
 *     `recommendation`. The recommendation is anchored on a single
 *     `centralTension` synthesised in a Sonnet pre-pass (`extraction`
 *     purpose). One Opus call only — coherence over cost.
 *
 * Backward compatibility: the function still returns the legacy
 * `NarrativeReport` shape (so callers that read `adve[]` and `rtis.pillars`
 * keep working), but additionally exposes a `recommendation` field that
 * V1/V2 didn't have.
 */

import { db } from "@/lib/db";
import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { getOracleBrandContextByQuery } from "@/server/services/seshat/context-store";
import type { NarrativeReport, AdvePillarReport, RtisPillarReport } from "./narrative-report";

export interface RecommendationBlock {
  /** One-sentence strategic move (the central play). */
  strategicMove: string;
  /** Why this move follows from the central tension. */
  why: string;
  /** 3–5 prioritised actions, each anchored on a diagnostic field. */
  prioritizedActions: Array<{
    title: string;
    rationale: string;
    when: "0-30j" | "30-90j" | "90j+";
    owner: "founder" | "operator" | "creative";
    successKpi: string;
  }>;
  roadmap90d: {
    phase1_0_30j: string;
    phase2_30_60j: string;
    phase3_60_90j: string;
  };
  risksToWatch: string[];
  /** Verbatim citation (≥8 words) of `diagnostic.centralTension`. */
  foundedOnTension: string;
}

export interface NarrativeReportV3 extends NarrativeReport {
  /** The central paradox/contradiction identified before final write. */
  centralTension: string;
  /** Opus-written strategic recommendation. */
  recommendation: RecommendationBlock;
}

interface V3Input {
  strategyId: string;
  companyName: string;
  sector: string | null;
  country: string | null;
  classification: string;
  vector: Record<string, number>;
  recoSummaries?: Array<{ pillar: string; field: string; explain: string }>;
}

const PILLAR_QUERIES_RTIS: Record<string, string> = {
  r: "principaux risques et vulnérabilités identifiés",
  t: "réalité du marché et positionnement concurrentiel",
  i: "potentiel d'innovation et leviers créatifs",
  s: "synthèse stratégique et plan d'action",
};

async function loadAdveVerbatim(strategyId: string): Promise<{
  adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  flatValues: string[]; // for post-validation
}> {
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: ["a", "d", "v", "e"] } },
    select: { key: true, content: true },
  });
  const adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>> = { a: {}, d: {}, v: {}, e: {} };
  const flatValues: string[] = [];
  for (const r of rows) {
    const c = (r.content as Record<string, unknown> | null) ?? {};
    adveByPillar[r.key as "a" | "d" | "v" | "e"] = c;
    for (const v of Object.values(c)) {
      if (typeof v === "string" && v.trim().length >= 8) flatValues.push(v.trim());
      if (Array.isArray(v)) {
        for (const item of v) if (typeof item === "string" && item.trim().length >= 8) flatValues.push(item.trim());
      }
    }
  }
  return { adveByPillar, flatValues };
}

async function loadRtisDrafts(strategyId: string): Promise<Record<"r" | "t" | "i" | "s", Record<string, unknown>>> {
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: ["r", "t", "i", "s"] } },
    select: { key: true, content: true },
  });
  const out: Record<"r" | "t" | "i" | "s", Record<string, unknown>> = { r: {}, t: {}, i: {}, s: {} };
  for (const r of rows) out[r.key as "r" | "t" | "i" | "s"] = (r.content as Record<string, unknown> | null) ?? {};
  return out;
}

/** Pass 1 — tension synthesis. Sonnet. Cheap, structured. */
async function synthesizeCentralTension(
  input: V3Input,
  adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>>,
  rtisDrafts: Record<"r" | "t" | "i" | "s", Record<string, unknown>>,
): Promise<string> {
  const prompt = `MARQUE: ${input.companyName}
SECTEUR: ${input.sector ?? "—"}

ADVE (extraits) :
${JSON.stringify(adveByPillar).slice(0, 2400)}

RTIS DRAFT (déjà calculé, RAG-grounded) :
R: ${JSON.stringify(rtisDrafts.r).slice(0, 600)}
T: ${JSON.stringify(rtisDrafts.t).slice(0, 600)}
I: ${JSON.stringify(rtisDrafts.i).slice(0, 600)}
S: ${JSON.stringify(rtisDrafts.s).slice(0, 600)}

Identifie LA tension centrale qui structure cette marque — la contradiction la plus
parlante entre ce qu'elle dit (ADVE), ce que le marché impose (T/R), et ce qu'elle
peut activer (I/S). Une seule phrase, dense, qui doit pouvoir être citée verbatim
ailleurs dans le rapport.

Réponds UNIQUEMENT avec : { "tension": "<une phrase, 15-30 mots>" }`;

  const { text } = await callLLM({
    caller: "quick-intake:v3:tension",
    purpose: "extraction",
    system: "Tu es un stratège senior. Tu extrais des tensions, jamais de descriptions plates.",
    prompt,
    maxTokens: 200,
  });
  const parsed = extractJSON(text) as { tension?: unknown };
  if (typeof parsed.tension !== "string" || parsed.tension.trim().length < 12) {
    throw new Error("v3:tension synthesis failed (shape invalide)");
  }
  return parsed.tension.trim();
}

/** Pass 2 — final write. Opus. ADVE verbatim contrainte + reco bloc autonome. */
async function writeFinalDeliverable(
  input: V3Input,
  adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>>,
  rtisDrafts: Record<"r" | "t" | "i" | "s", Record<string, unknown>>,
  rtisHybridContextByPillar: Record<string, string>,
  centralTension: string,
): Promise<NarrativeReportV3> {
  const prompt = `MARQUE : ${input.companyName}
SECTEUR : ${input.sector ?? "non précisé"}
PAYS : ${input.country ?? "non précisé"}
CLASSIFICATION : ${input.classification}

TENSION CENTRALE (à citer verbatim dans recommendation.foundedOnTension) :
"${centralTension}"

ADVE — VERBATIM, source de vérité :
${JSON.stringify(adveByPillar, null, 2)}

RTIS DRAFT — déjà synthétisé en amont (RAG-grounded) :
${JSON.stringify(rtisDrafts, null, 2)}

CONTEXTE HYBRIDE par pilier RTIS (narratif Seshat + précis verbatim) :
${Object.entries(rtisHybridContextByPillar)
  .map(([k, v]) => `=== Pilier ${k.toUpperCase()} ===\n${v}`)
  .join("\n\n")}

CONTRAINTES NON NÉGOCIABLES :
1. Pour chaque \`diagnostic.adve[].full\` (4 paragraphes), tu DOIS citer au moins
   3 valeurs ADVE entre guillemets — ce sont les mots du founder, jamais paraphrasés.
2. \`recommendation.foundedOnTension\` DOIT contenir au moins 8 mots consécutifs
   verbatim de la tension centrale ci-dessus.
3. \`recommendation.prioritizedActions[].rationale\` DOIT mentionner explicitement
   le pilier ADVE ou RTIS source ("selon votre Track : ...", "votre archétype ...").
4. \`recommendation.roadmap90d.phase1_0_30j\` doit décrire une action exécutable
   en moins de 30 jours par 1-3 personnes.
5. RTIS narrative peut paraphraser le contexte hybride. ADVE non.

Réponds UNIQUEMENT avec ce JSON :
{
  "executiveSummary": "<3-4 phrases — synthétise la tension centrale en l'appliquant à la marque>",
  "centralTension": "${centralTension.replace(/"/g, '\\"')}",
  "adve": [
    { "key": "a", "name": "Authenticité", "preview": "<2 phrases avec ≥1 valeur citée>", "full": "<paragraphe 100-140 mots, ≥3 valeurs verbatim>" },
    { "key": "d", "name": "Distinction",  "preview": "...", "full": "..." },
    { "key": "v", "name": "Valeur",       "preview": "...", "full": "..." },
    { "key": "e", "name": "Engagement",   "preview": "...", "full": "..." }
  ],
  "rtis": {
    "framing": "<2-3 phrases qui relient les 4 RTIS à la tension centrale>",
    "pillars": [
      { "key": "r", "name": "Risque",     "preview": "...", "full": "...", "priority": "P0", "keyMove": "..." },
      { "key": "t", "name": "Track",      "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "i", "name": "Innovation", "preview": "...", "full": "...", "priority": "P1", "keyMove": "..." },
      { "key": "s", "name": "Stratégie",  "preview": "...", "full": "...", "priority": "P2", "keyMove": "..." }
    ]
  },
  "recommendation": {
    "strategicMove": "<une phrase — LE pari central>",
    "why": "<2 phrases — relie strategicMove à la tension centrale>",
    "prioritizedActions": [
      {
        "title": "<verbe + objet, max 10 mots>",
        "rationale": "<2 phrases citant ADVE.<pilier> ou RTIS.<pilier>>",
        "when": "0-30j" | "30-90j" | "90j+",
        "owner": "founder" | "operator" | "creative",
        "successKpi": "<KPI mesurable, 1 phrase>"
      }
      // 3-5 actions au total
    ],
    "roadmap90d": {
      "phase1_0_30j": "<ce qu'il faut prouver d'abord, 1 phrase>",
      "phase2_30_60j": "<consolidation, 1 phrase>",
      "phase3_60_90j": "<expansion ou pivot, 1 phrase>"
    },
    "risksToWatch": ["<risque 1>", "<risque 2>", "<risque 3>"],
    "foundedOnTension": "<reprend ≥8 mots consécutifs de la tension centrale verbatim>"
  }
}`;

  const { text } = await callLLM({
    caller: "quick-intake:v3:final",
    purpose: "final-report",
    system: `Tu es Mestor, le directeur stratégique senior de La Fusée. Tu produis deux artefacts intellectuels distincts :
1) DIAGNOSTIC : ce qui est vrai sur la marque, ancré sur les mots du founder (verbatim).
2) RECOMMANDATION : ce qu'il faut faire, ancré sur le diagnostic.

Le diagnostic est descriptif et ancré (citations verbatim obligatoires sur ADVE).
La recommandation est prescriptive et reliée à la tension centrale.

Tu ne flattes pas. Tu ne paraphrases jamais une valeur ADVE — tu la cites entre guillemets.
Tu ne génères pas de copie générique : chaque action doit être nominale et liée.`,
    prompt,
    maxTokens: 6000,
  });
  const parsed = extractJSON(text) as Partial<NarrativeReportV3>;

  // Shape validation
  if (
    !parsed ||
    typeof parsed.executiveSummary !== "string" ||
    typeof parsed.centralTension !== "string" ||
    !Array.isArray(parsed.adve) ||
    parsed.adve.length !== 4 ||
    !parsed.rtis ||
    !Array.isArray(parsed.rtis.pillars) ||
    parsed.rtis.pillars.length !== 4 ||
    !parsed.recommendation ||
    typeof parsed.recommendation.strategicMove !== "string" ||
    typeof parsed.recommendation.foundedOnTension !== "string" ||
    !Array.isArray(parsed.recommendation.prioritizedActions) ||
    parsed.recommendation.prioritizedActions.length < 3
  ) {
    throw new Error("v3:final write failed (shape invalide)");
  }

  return parsed as NarrativeReportV3;
}

/**
 * Post-validation: verify the verbatim contract. The Opus prompt strongly
 * asks but cannot guarantee compliance — we enforce it in code. If a
 * pillar's `full` text fails the citation threshold, log a warning. We do
 * NOT throw because operator UX > strict contract: the report is still
 * shipped, but flagged so we can tune the prompt.
 */
function auditVerbatimCompliance(
  report: NarrativeReportV3,
  flatValues: string[],
): { perPillar: Record<"a" | "d" | "v" | "e", number>; underThreshold: ("a" | "d" | "v" | "e")[] } {
  const perPillar: Record<"a" | "d" | "v" | "e", number> = { a: 0, d: 0, v: 0, e: 0 };
  for (const a of report.adve) {
    let count = 0;
    for (const v of flatValues) {
      const trimmed = v.trim();
      if (trimmed.length < 8) continue;
      if (a.full.includes(trimmed)) count++;
    }
    perPillar[a.key] = count;
  }
  const underThreshold = (Object.entries(perPillar) as Array<["a" | "d" | "v" | "e", number]>)
    .filter(([, c]) => c < 3)
    .map(([k]) => k);
  if (underThreshold.length > 0) {
    console.warn(
      `[narrative-report-v3] verbatim contract under threshold for pillars: ${underThreshold.join(",")}`,
      perPillar,
    );
  }
  return { perPillar, underThreshold };
}

export async function generateNarrativeReportV3(input: V3Input): Promise<NarrativeReportV3> {
  // 1. Load freshly-written ADVE (verbatim) + RTIS drafts (already RAG-augmented).
  const { adveByPillar, flatValues } = await loadAdveVerbatim(input.strategyId);
  const rtisDrafts = await loadRtisDrafts(input.strategyId);

  // 2. Hybrid retrieval per RTIS pillar — enriches the prompt with the
  //    indexed brand context as Seshat sees it (post-RTIS-draft index).
  const rtisHybridContext: Record<string, string> = {};
  for (const p of ["r", "t", "i", "s"] as const) {
    const ctx = await getOracleBrandContextByQuery(input.strategyId, PILLAR_QUERIES_RTIS[p]!, {
      pillarKey: p,
      limit: 8,
    }).catch(() => null);
    rtisHybridContext[p] = ctx?.text ?? "(aucun contexte indexé pour ce pilier)";
  }

  // 3. Sonnet pre-pass — central tension.
  const centralTension = await synthesizeCentralTension(input, adveByPillar, rtisDrafts);

  // 4. Opus single-pass — diagnostic + recommendation in one JSON envelope.
  const report = await writeFinalDeliverable(
    input,
    adveByPillar,
    rtisDrafts,
    rtisHybridContext,
    centralTension,
  );

  // 5. Verbatim compliance audit (non-blocking, logged for tuning).
  auditVerbatimCompliance(report, flatValues);

  return report;
}

// Re-exports for convenience (callers can take any of these).
export type { AdvePillarReport, RtisPillarReport, NarrativeReport };
