import { ADVE_STORAGE_KEYS, type PillarStorageKey } from "@/domain";

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
 *   ADVE narration distinguishes source evidence from generated proposals. We narrate it once here from the raw values, persist to
 *   Pillar.content.{narrativePreview,narrativeFull}, and read those columns
 *   verbatim at restitution time without any further LLM call.
 *
 * Up to four existing model calls (purpose: "extraction"). Idempotent: pillars
 * whose narrative is already present are skipped on re-run.
 */

import { db } from "@/lib/db";
import { z } from "zod";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { pillarContentLines, INTAKE_EVIDENCE_RULE } from "./report-composer";
import { wrapUntrusted, UNTRUSTED_NOTICE, sanitizeInline } from "@/server/services/utils/untrusted-content";
import { reportRefusedWrite } from "../pillar-gateway/refusal";

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

/** Narration uses qualified data, never upgrades a proposal to founder testimony. */
async function narratePillar(
  pillarKey: AdvePillar,
  values: Record<string, unknown>,
  brandName: string,
  strategyId: string,
): Promise<NarratedPillar> {
  const lines = pillarContentLines(values, pillarKey);
  if (lines.length === 0) return {
    preview: `La fondation ${PILLAR_NAMES[pillarKey]} reste à documenter.`,
    full: `Le dossier ne contient pas de matière exploitable sur ${PILLAR_ANGLE[pillarKey]}. Cela ne démontre pas une absence dans votre entreprise.`,
  };
  const { data } = await executeStructuredLLMCall({
    caller: `quick-intake:narrate-adve:${pillarKey}`,
    strategyId,
    purpose: "extraction",
    schema: z.object({ preview: z.string().min(30).max(800), full: z.string().min(80).max(2400) }).strict(),
    retries: 0,
    system: `${UNTRUSTED_NOTICE}\nTu rédiges une lecture factuelle et concise du dossier. ${INTAKE_EVIDENCE_RULE}`,
    prompt: `MARQUE : ${sanitizeInline(brandName, { max: 120 })}
FONDATION : ${PILLAR_NAMES[pillarKey]} (${PILLAR_ANGLE[pillarKey]})
${wrapUntrusted("CHAMPS AVEC ORIGINE", lines.join("\n"), { max: 10000 })}
Produis preview (1-2 phrases, 30-60 mots) et full (80-140 mots).
Cite les données utiles sans inventer de citations. Distingue explicitement les données reçues,
les propositions à valider et les origines inconnues. Pas de citation exhaustive de tous les champs,
ni de conseil commercial. Explique ce qui est documenté et ce qui reste à confirmer.
Réponds avec {"preview":"...","full":"..."}.`,
    maxOutputTokens: 1000,
  });
  return { preview: data.preview.trim(), full: data.full.trim() };
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
    where: { strategyId: input.strategyId, key: { in: [...ADVE_STORAGE_KEYS] } },
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

  const items: PerPillar[] = [];
  for (const key of ADVE_STORAGE_KEYS) {
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
      items.push({
        key,
        generated: false,
        narrated: { preview: cachedPreview, full: cachedFull },
      });
      continue;
    }
    const narrated = await narratePillar(key, current, input.companyName, input.strategyId);
    items.push({ key, generated: true, narrated });
  }

  const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
  for (const item of items) {
    if (!item.generated) continue;
    try {
      const _w0 = await writePillarAndScore({
        strategyId: input.strategyId,
        pillarKey: item.key as PillarStorageKey,
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
      reportRefusedWrite(_w0, "quick-intake:narrate-adve");
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
