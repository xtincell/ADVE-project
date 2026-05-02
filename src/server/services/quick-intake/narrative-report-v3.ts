/**
 * narrative-report-v3 — RTIS-first, RAG-augmented, two-block deliverable.
 *
 * Activated when ModelPolicy[purpose="final-report"].pipelineVersion === "V3".
 *
 * Architectural separation (post-fix):
 *   - ADVE narrative (preview + full per pilier) is generated UPSTREAM by
 *     `narrate-adve.ts` right after extraction, persisted to
 *     Pillar.content.{narrativePreview,narrativeFull}, and READ FROM DB here.
 *     No LLM regeneration of ADVE at restitution time → verbatim contract
 *     becomes deterministic by construction.
 *   - RTIS Pillar.content rows are populated BEFORE this function runs (by
 *     `generateAndPersistRtisDraft` in rtis-draft.ts). RAG pulls rich content
 *     for r/t/i/s, not just user-typed ADVE.
 *   - This function ONLY synthesizes: central tension (Sonnet pre-pass),
 *     executive summary, RTIS framing/pillars narrative, and the
 *     recommendation block. ADVE is assembled from DB and merged into the
 *     final shape — Opus is never asked to re-narrate it.
 *
 * Backward compatibility: returns the legacy `NarrativeReport` shape (so
 * callers reading `adve[]` and `rtis.pillars` keep working), plus a
 * `recommendation` field V1/V2 didn't have.
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
    /**
     * 2 concrete, applicable examples of what executing this action looks like
     * in practice for THIS brand. Not generic ("communiquer plus") — specific
     * with channel, format, audience, and frequency.
     */
    examples: [string, string];
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

const PILLAR_NAMES_ADVE: Record<"a" | "d" | "v" | "e", string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
};

/** Reserved keys that aren't founder values (synthesized columns). */
const ADVE_RESERVED_KEYS = new Set([
  "narrativePreview",
  "narrativeFull",
  "score",
  "confidence",
  "validationStatus",
  "currentVersion",
]);

interface AdveLoaded {
  /** Verbatim values keyed by pilier — used as Opus context (read-only, never regenerated). */
  adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  /** Pre-narrated paragraphs from `narrate-adve.ts`, read directly from DB. */
  narrated: Record<"a" | "d" | "v" | "e", { preview: string; full: string }>;
}

async function loadAdveNarrated(strategyId: string): Promise<AdveLoaded> {
  const rows = await db.pillar.findMany({
    where: { strategyId, key: { in: ["a", "d", "v", "e"] } },
    select: { key: true, content: true },
  });
  const adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>> = {
    a: {},
    d: {},
    v: {},
    e: {},
  };
  const narrated: Record<"a" | "d" | "v" | "e", { preview: string; full: string }> = {
    a: { preview: "", full: "" },
    d: { preview: "", full: "" },
    v: { preview: "", full: "" },
    e: { preview: "", full: "" },
  };
  for (const r of rows) {
    const key = r.key as "a" | "d" | "v" | "e";
    const c = (r.content as Record<string, unknown> | null) ?? {};
    // Strip reserved keys from the verbatim context — Opus shouldn't see
    // the pre-narrated paragraphs (they go straight from DB → final shape).
    const verbatim: Record<string, unknown> = {};
    for (const [field, val] of Object.entries(c)) {
      if (!ADVE_RESERVED_KEYS.has(field)) verbatim[field] = val;
    }
    adveByPillar[key] = verbatim;
    if (typeof c.narrativePreview === "string" && typeof c.narrativeFull === "string") {
      narrated[key] = {
        preview: c.narrativePreview,
        full: c.narrativeFull,
      };
    }
  }
  return { adveByPillar, narrated };
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
    maxOutputTokens: 200,
  });
  const parsed = extractJSON(text) as { tension?: unknown };
  if (typeof parsed.tension !== "string" || parsed.tension.trim().length < 12) {
    throw new Error("v3:tension synthesis failed (shape invalide)");
  }
  return parsed.tension.trim();
}

/**
 * Pass 2 — final synthesis. Opus.
 *
 * Output is intentionally ADVE-free: the ADVE narrative is read from DB
 * (pre-generated by `narrate-adve.ts`) and merged by the caller. Opus
 * focuses on what only it can do — executive summary, RTIS narrative
 * framing, and the recommendation block — without re-paraphrasing data
 * that's already deterministic.
 */
interface OpusSynthesis {
  executiveSummary: string;
  centralTension: string;
  rtis: NarrativeReport["rtis"];
  recommendation: RecommendationBlock;
}

async function writeFinalDeliverable(
  input: V3Input,
  adveByPillar: Record<"a" | "d" | "v" | "e", Record<string, unknown>>,
  adveNarrated: Record<"a" | "d" | "v" | "e", { preview: string; full: string }>,
  rtisDrafts: Record<"r" | "t" | "i" | "s", Record<string, unknown>>,
  rtisHybridContextByPillar: Record<string, string>,
  centralTension: string,
): Promise<OpusSynthesis> {
  const adveContextBlock = (["a", "d", "v", "e"] as const)
    .map((k) => {
      const verbatim = JSON.stringify(adveByPillar[k], null, 2);
      const narrated = adveNarrated[k].full;
      return `=== ${PILLAR_NAMES_ADVE[k]} (${k.toUpperCase()}) ===
Valeurs verbatim founder :
${verbatim}

Paragraphe ADVE déjà rédigé en amont (déterministe, persisté en base — ne pas le réécrire) :
"""
${narrated}
"""`;
    })
    .join("\n\n");

  const prompt = `MARQUE : ${input.companyName}
SECTEUR : ${input.sector ?? "non précisé"}
PAYS : ${input.country ?? "non précisé"}
CLASSIFICATION : ${input.classification}

TENSION CENTRALE (à citer verbatim dans recommendation.foundedOnTension) :
"${centralTension}"

ADVE — déjà rédigé, fourni ICI EN CONTEXTE UNIQUEMENT (lecture pour informer ta synthèse) :
${adveContextBlock}

RTIS DRAFT — déjà synthétisé en amont (RAG-grounded) :
${JSON.stringify(rtisDrafts, null, 2)}

CONTEXTE HYBRIDE par pilier RTIS (narratif Seshat + précis verbatim) :
${Object.entries(rtisHybridContextByPillar)
  .map(([k, v]) => `=== Pilier ${k.toUpperCase()} ===\n${v}`)
  .join("\n\n")}

CONTRAINTES NON NÉGOCIABLES :
1. \`recommendation.foundedOnTension\` DOIT contenir au moins 8 mots consécutifs
   verbatim de la tension centrale ci-dessus.
2. \`recommendation.prioritizedActions[].rationale\` DOIT mentionner explicitement
   le pilier ADVE ou RTIS source ("selon votre Track : ...", "votre archétype ...").
3. CHAQUE action a EXACTEMENT 2 \`examples\` — concrets, exécutables, spécifiques à
   CETTE marque (jamais génériques type "faire du contenu"). Format obligatoire :
   canal + format + audience + cadence/quantité. Les 2 exemples doivent couvrir des
   leviers DIFFÉRENTS (ex: un canal owned + un canal earned, ou un format long + un
   format court). Sans 2 exemples concrets l'action est rejetée.
4. \`recommendation.roadmap90d.phase1_0_30j\` doit décrire une action exécutable
   en moins de 30 jours par 1-3 personnes.
5. RTIS narrative peut paraphraser le contexte hybride.
6. NE RÉÉCRIS PAS l'ADVE : il est déjà finalisé en base. Ton rôle est la synthèse
   transversale (executive summary, framing RTIS, recommandation).

Réponds UNIQUEMENT avec ce JSON :
{
  "executiveSummary": "<3-4 phrases — synthétise la tension centrale en l'appliquant à la marque>",
  "centralTension": "${centralTension.replace(/"/g, '\\"')}",
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
        "successKpi": "<KPI mesurable, 1 phrase>",
        "examples": [
          "<exemple concret #1 — canal + format + audience + cadence. Ex: 'Publier 1 carrousel LinkedIn par semaine montrant un cas client anonymisé avec avant/après chiffré, ciblant les directeurs marketing FMCG d'Afrique francophone.'>",
          "<exemple concret #2 — un autre canal/format/contexte. Ex: 'Animer un workshop de 90 min en visio avec 5-8 prospects qualifiés où chacun audite un brief concurrent en suivant la grille ADVE, suivi d'une heure de Q&A.'>"
        ]
      }
      // 3-5 actions au total. Les examples sont OBLIGATOIRES (exactement 2 par action),
      // spécifiques à CETTE marque (pas génériques), exécutables sans budget infini.
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
    system: `Tu es Mestor, le directeur stratégique senior de La Fusée. Tu produis la synthèse stratégique :
- executive summary qui applique la tension centrale à la marque
- narrative RTIS (framing + 4 piliers) qui résout la tension
- recommandation actionnable ancrée sur la tension

L'ADVE est DÉJÀ rédigé et persisté en base — ne le réécris pas, lis-le comme contexte.

Tu ne flattes pas. Tu produis du JSON pur, pas de markdown.`,
    prompt,
    maxOutputTokens: 6000,
  });
  const parsed = extractJSON(text) as Partial<OpusSynthesis>;

  if (
    !parsed ||
    typeof parsed.executiveSummary !== "string" ||
    typeof parsed.centralTension !== "string" ||
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

  // Each action must have exactly 2 concrete examples. Coerce/repair where
  // possible (Opus sometimes ships 1 or 3) — drop to a hard error if an
  // action ships zero, since that defeats the purpose of the field.
  for (const action of parsed.recommendation.prioritizedActions) {
    const examples = (action as { examples?: unknown }).examples;
    if (!Array.isArray(examples) || examples.length === 0) {
      throw new Error(`v3:final write — action "${action.title}" missing examples array`);
    }
    const cleaned = examples.filter((e): e is string => typeof e === "string" && e.trim().length >= 30);
    if (cleaned.length === 0) {
      throw new Error(`v3:final write — action "${action.title}" examples too short or non-string`);
    }
    // Pad to 2 if Opus shipped only 1, truncate if it shipped >2.
    while (cleaned.length < 2) cleaned.push(cleaned[0]!);
    (action as { examples: [string, string] }).examples = [cleaned[0]!, cleaned[1]!];
  }

  return parsed as OpusSynthesis;
}

export async function generateNarrativeReportV3(input: V3Input): Promise<NarrativeReportV3> {
  // 1. Load ADVE from DB — verbatim values (context for Opus) + already-narrated
  //    paragraphs (assembled into the final shape, never regenerated by LLM).
  //    Caller (quick-intake/index.ts) MUST have run `narrateAdvePillars` first.
  const { adveByPillar, narrated: adveNarrated } = await loadAdveNarrated(input.strategyId);
  const rtisDrafts = await loadRtisDrafts(input.strategyId);

  // Hard guard: V3 contract requires the upstream narration step to have run.
  // If a caller forgot it, fail loud rather than silently producing empty ADVE.
  for (const k of ["a", "d", "v", "e"] as const) {
    if (!adveNarrated[k].full || !adveNarrated[k].preview) {
      throw new Error(
        `v3: ADVE narrative missing for pilier ${k} — narrateAdvePillars must run before generateNarrativeReportV3`,
      );
    }
  }

  // 2. Hybrid retrieval per RTIS pillar.
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

  // 4. Opus synthesis — exec summary + RTIS narrative + recommendation only.
  //    No ADVE in the output schema; ADVE is merged from DB below.
  const synthesis = await writeFinalDeliverable(
    input,
    adveByPillar,
    adveNarrated,
    rtisDrafts,
    rtisHybridContext,
    centralTension,
  );

  // 5. Assemble the legacy NarrativeReport shape: ADVE from DB, rest from Opus.
  const adve: AdvePillarReport[] = (["a", "d", "v", "e"] as const).map((k) => ({
    key: k,
    name: PILLAR_NAMES_ADVE[k],
    preview: adveNarrated[k].preview,
    full: adveNarrated[k].full,
  }));

  return {
    executiveSummary: synthesis.executiveSummary,
    centralTension: synthesis.centralTension,
    adve,
    rtis: synthesis.rtis,
    recommendation: synthesis.recommendation,
  };
}

// Re-exports for convenience (callers can take any of these).
export type { AdvePillarReport, RtisPillarReport, NarrativeReport };
