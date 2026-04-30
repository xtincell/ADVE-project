/**
 * narrate-adve — Generates the per-pillar ADVE narrative (preview + full)
 * ONCE, right after deduce-adve, BEFORE any RTIS work or final report.
 *
 * Why this exists (V3 architectural fix):
 *   The original V3 asked Opus to regenerate ADVE preview/full at restitution
 *   time, demanding "≥3 verbatim citations per pillar". The LLM cannot
 *   reliably honor a verbatim contract on data it just paraphrased into the
 *   prompt — empirical bench (LaPatateChaude) showed 1-2 cites per pillar.
 *
 *   ADVE is the founder's verbatim voice — deterministic data, not LLM
 *   synthesis. We narrate it once here from the raw values, persist to
 *   Pillar.content.{narrativePreview,narrativeFull}, and read those columns
 *   verbatim at restitution time without any further LLM call.
 *
 * 4× Sonnet calls in parallel (purpose: "extraction"). Idempotent: pillars
 * whose narrative is already present are skipped on re-run.
 */

import { db } from "@/lib/db";
import { callLLM, extractJSON } from "@/server/services/llm-gateway";

type AdvePillar = "a" | "d" | "v" | "e";

const PILLAR_NAMES: Record<AdvePillar, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
};

const PILLAR_ANGLE: Record<AdvePillar, string> = {
  a: "ce que la marque dit d'elle-même — ton, archétype, promesse, raison d'être",
  d: "ce qui la rend reconnaissable — codes, signature, ennemi, point de vue",
  v: "ce qu'elle apporte — bénéfice, transformation, prix, accessibilité",
  e: "ce qui crée la communauté — rituel, langage interne, contribution, engagement",
};

interface NarratedPillar {
  preview: string;
  full: string;
}

export interface NarrateAdveInput {
  strategyId: string;
  companyName: string;
  /**
   * If true, regenerate narrative even when cached values exist. Default false:
   * pillars already containing narrativePreview + narrativeFull are echoed back
   * without an LLM call. Used by benches and when prompt logic changes.
   */
  force?: boolean;
}

export interface NarrateAdveResult {
  a: NarratedPillar;
  d: NarratedPillar;
  v: NarratedPillar;
  e: NarratedPillar;
}

/** Reserved keys that are not founder values — output of upstream synthesis. */
const RESERVED_KEYS = new Set([
  "narrativePreview",
  "narrativeFull",
  "score",
  "confidence",
  "validationStatus",
  "currentVersion",
]);

function collectVerbatimEntries(
  values: Record<string, unknown>,
): Array<[string, string | string[]]> {
  const out: Array<[string, string | string[]]> = [];
  for (const [field, val] of Object.entries(values)) {
    if (RESERVED_KEYS.has(field)) continue;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.length > 0) out.push([field, trimmed]);
    } else if (Array.isArray(val)) {
      const cleaned = val
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length > 0);
      if (cleaned.length > 0) out.push([field, cleaned]);
    }
  }
  return out;
}

/**
 * Word/token budget scales with the count of founder values to cite.
 * Goal: every verbatim value gets quoted. Citing N short values needs roughly
 * 8–15 words of connective tissue per citation, so the paragraph grows with N.
 */
function pickFullWordRange(valueCount: number): { min: number; max: number } {
  if (valueCount <= 4) return { min: 100, max: 180 };
  if (valueCount <= 10) return { min: 180, max: 320 };
  if (valueCount <= 20) return { min: 320, max: 500 };
  return { min: 500, max: 800 };
}

async function narratePillar(
  pillarKey: AdvePillar,
  values: Record<string, unknown>,
  brandName: string,
): Promise<NarratedPillar> {
  const verbatimEntries = collectVerbatimEntries(values);

  if (verbatimEntries.length === 0) {
    return {
      preview: `Pilier ${PILLAR_NAMES[pillarKey]} non renseigné par la marque.`,
      full: `Aucune valeur ${PILLAR_NAMES[pillarKey]} n'a été renseignée pendant l'intake. Ce pilier reste à compléter pour produire un diagnostic exploitable.`,
    };
  }

  // Count atoms to cite (a string array contributes its length, not 1).
  const atomCount = verbatimEntries.reduce(
    (acc, [, val]) => acc + (Array.isArray(val) ? val.length : 1),
    0,
  );
  const { min: fullMin, max: fullMax } = pickFullWordRange(atomCount);

  const valuesBlock = verbatimEntries
    .map(([field, val]) => {
      if (Array.isArray(val)) {
        return `- ${field}: ${val.map((v) => `"${v}"`).join(", ")}`;
      }
      return `- ${field}: "${val}"`;
    })
    .join("\n");

  const prompt = `MARQUE : ${brandName}
PILIER : ${PILLAR_NAMES[pillarKey]} (${PILLAR_ANGLE[pillarKey]})

VALEURS VERBATIM RENSEIGNÉES PAR LE FOUNDER (${atomCount} valeur${atomCount > 1 ? "s" : ""} à citer) :
${valuesBlock}

Ta tâche : produire deux paragraphes qui RESTITUENT EXHAUSTIVEMENT ces valeurs au
founder en les ancrant dans son discours. Tu DOIS citer entre guillemets CHACUNE
des ${atomCount} valeurs ci-dessus — pas une sélection, pas un échantillon, TOUTES.
Tu ne paraphrases pas : les guillemets reproduisent les mots du founder à l'identique,
caractère pour caractère, accents inclus, ponctuation incluse, casse incluse.

CONTRAINTES :
- preview : 2-3 phrases (40-80 mots) qui annoncent le pilier en citant ≥3 valeurs entre guillemets.
- full : 1 paragraphe de ${fullMin}-${fullMax} mots qui développe le pilier en citant
  les ${atomCount} valeurs verbatim. Adapte la longueur au nombre de valeurs : il y en
  a ${atomCount}, donc tu auras besoin d'environ ${fullMin}-${fullMax} mots pour les
  intégrer toutes proprement. Si tu dois choisir entre couper le texte et omettre une
  valeur, COUPE LE TEXTE — l'exhaustivité prime sur la concision.
- Pas de jugement de valeur ("c'est bien" / "c'est faible"). Tu décris ce que la marque DIT.
- Pas de recommandation. La reco est produite ailleurs dans le pipeline.
- Avant de finir, recompte mentalement : as-tu cité les ${atomCount} valeurs ? Si non,
  réécris.

Réponds UNIQUEMENT avec ce JSON exact :
{ "preview": "...", "full": "..." }`;

  // Token budget: ~1.5 tokens/word for French + JSON envelope overhead.
  // For a 500-word output we need ~750 tokens; we cap at 2× to leave headroom.
  const maxTokens = Math.max(800, Math.round(fullMax * 3));

  const { text } = await callLLM({
    caller: `quick-intake:narrate-adve:${pillarKey}`,
    purpose: "extraction",
    system: `Tu es Mestor, archiviste de la voix du founder. Tu restitues TOUTES les valeurs ADVE entre guillemets, jamais paraphrasées, jamais omises. Tu produis du JSON pur. Tu acceptes des paragraphes longs si le pilier a beaucoup de valeurs — l'exhaustivité prime.`,
    prompt,
    maxTokens,
  });

  const parsed = extractJSON(text) as { preview?: unknown; full?: unknown };
  // Minimum length scales with how much we asked for — guards against truncated JSON.
  const minFullChars = Math.round(fullMin * 4); // ~4 chars/word floor
  if (
    !parsed ||
    typeof parsed.preview !== "string" ||
    typeof parsed.full !== "string" ||
    parsed.preview.trim().length < 30 ||
    parsed.full.trim().length < minFullChars
  ) {
    throw new Error(`narrate-adve[${pillarKey}]: invalid shape (full=${typeof parsed?.full === "string" ? parsed.full.length : "n/a"} chars, expected ≥${minFullChars})`);
  }

  return {
    preview: parsed.preview.trim(),
    full: parsed.full.trim(),
  };
}

/**
 * Generates and persists ADVE narrative paragraphs (preview + full) for the
 * 4 pillars of a strategy. Idempotent: pillars already narrated are echoed
 * back from the DB without a fresh LLM call.
 *
 * Persisted via writePillar (MERGE_DEEP) so {narrativePreview, narrativeFull}
 * become first-class fields in Pillar.content — readable at restitution time
 * without any further LLM call.
 */
export async function narrateAdvePillars(
  input: NarrateAdveInput,
): Promise<NarrateAdveResult> {
  const rows = await db.pillar.findMany({
    where: { strategyId: input.strategyId, key: { in: ["a", "d", "v", "e"] } },
    select: { key: true, content: true },
  });

  const stateByKey: Record<AdvePillar, Record<string, unknown>> = {
    a: {},
    d: {},
    v: {},
    e: {},
  };
  for (const r of rows) {
    stateByKey[r.key as AdvePillar] = (r.content as Record<string, unknown> | null) ?? {};
  }

  type PerPillar = { key: AdvePillar; generated: boolean; narrated: NarratedPillar };

  const items: PerPillar[] = await Promise.all(
    (["a", "d", "v", "e"] as const).map(async (key): Promise<PerPillar> => {
      const current = stateByKey[key];
      const cachedPreview = current.narrativePreview;
      const cachedFull = current.narrativeFull;
      if (
        !input.force &&
        typeof cachedPreview === "string" &&
        typeof cachedFull === "string" &&
        cachedPreview.trim().length > 0 &&
        cachedFull.trim().length > 0
      ) {
        return {
          key,
          generated: false,
          narrated: { preview: cachedPreview, full: cachedFull },
        };
      }
      const narrated = await narratePillar(key, current, input.companyName);
      return { key, generated: true, narrated };
    }),
  );

  const { writePillar } = await import("@/server/services/pillar-gateway");
  for (const item of items) {
    if (!item.generated) continue;
    try {
      await writePillar({
        strategyId: input.strategyId,
        pillarKey: item.key as never,
        operation: {
          type: "MERGE_DEEP",
          patch: {
            narrativePreview: item.narrated.preview,
            narrativeFull: item.narrated.full,
          },
        },
        author: {
          system: "MESTOR",
          reason: `V3 ADVE narration — pilier ${item.key.toUpperCase()}`,
        },
        options: { confidenceDelta: 0.02 },
      });
    } catch (err) {
      console.warn(
        `[narrate-adve] persist failed for pillar ${item.key}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    a: items.find((i) => i.key === "a")!.narrated,
    d: items.find((i) => i.key === "d")!.narrated,
    v: items.find((i) => i.key === "v")!.narrated,
    e: items.find((i) => i.key === "e")!.narrated,
  };
}
