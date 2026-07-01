/**
 * intention/ — Porte d'entrée du cycle de vie (ADR-0106, Phase 24).
 *
 * Une marque articule une **intention net-new** (lancer un produit, repositionner,
 * entrer sur un marché…). C'est la **seule porte LLM légitime** en amont : le LLM
 * croise l'intention × l'ADVE réel (RAG) pour produire un **brief candidat**, qui
 * passe le gate déterministe de cohérence (C6) avant validation opérateur. Le brief
 * validé alimente ensuite le pipeline 100 % déterministe (action → campagne → projets).
 *
 * Manual-first parity (ADR-0060) : le mode MANUAL est entièrement déterministe
 * (l'opérateur fournit le brief), et le mode LLM **dégrade en DEFERRED** sans
 * provider — jamais de hard-fail. Sécurité (OWASP LLM01) : tout contenu non fiable
 * (intention, contexte ADVE) est neutralisé via wrapUntrusted/UNTRUSTED_NOTICE.
 */

import { z } from "zod";
import type { IntentionType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import {
  computeBriefAdveCoherence,
  flattenPillarText,
} from "@/server/services/mestor/gates/brief-adve-coherence-score";
import {
  UNTRUSTED_NOTICE,
  wrapUntrusted,
  sanitizeInline,
} from "@/server/services/utils/untrusted-content";

// ── Schéma du brief candidat (sortie LLM gardée + forme manuelle) ───────────

export const IntentionBriefSchema = z.object({
  bigIdea: z.string().min(3),
  briefClient: z.object({
    contexte_business: z.string(),
    contexte_marque: z.string(),
    cible_principale: z.string(),
    obj_business: z.string(),
  }),
  briefCreatif: z.object({
    message_claim: z.string(),
    challenge_creatif: z.string(),
    tone_of_voice: z.string(),
    messages_cles: z.array(z.string()).default([]),
  }),
  /** Pourquoi cette proposition est cohérente avec le noyau ADVE (auto-justification). */
  rationale_adve: z.string(),
});
export type IntentionBrief = z.infer<typeof IntentionBriefSchema>;

export type BriefGenerationMode = "LLM" | "MANUAL";

export interface CaptureIntentionInput {
  strategyId: string;
  type: IntentionType;
  title: string;
  description: string;
  operatorId?: string;
}

export interface GenerateBriefInput {
  intentionId: string;
  mode: BriefGenerationMode;
  /** Requis en mode MANUAL : brief fourni par l'opérateur (même schéma). */
  manualBrief?: IntentionBrief;
}

export interface BriefGenerationResult {
  intentionId: string;
  status: "BRIEF_GENERATED" | "DEFERRED";
  mode: BriefGenerationMode;
  brief?: IntentionBrief;
  coherence?: { band: string; score: number };
  deferredReason?: string;
}

// ── Contexte ADVE (RAG déterministe par pilier) ─────────────────────────────

const ADVE_LABELS: Record<string, string> = {
  a: "A — Authenticité", d: "D — Distinction", v: "V — Valeur", e: "E — Engagement",
  r: "R — Risque", t: "T — Marché/Track", i: "I — Innovation", s: "S — Stratégie",
};

async function loadAdve(strategyId: string): Promise<{ context: string; flat: string }> {
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true },
  });
  const byKey = new Map(pillars.map((p) => [p.key.toLowerCase(), p.content]));
  const parts: string[] = [];
  const flats: string[] = [];
  for (const k of PILLAR_STORAGE_KEYS) {
    const content = byKey.get(k);
    if (!content) continue;
    const flat = flattenPillarText(content);
    if (!flat.trim()) continue;
    flats.push(flat);
    parts.push(`### ${ADVE_LABELS[k] ?? k}\n${flat.slice(0, 700)}`);
  }
  return {
    context: parts.join("\n\n") || "(piliers ADVE non encore renseignés)",
    flat: flats.join(" "),
  };
}

// ── Handlers ────────────────────────────────────────────────────────────────

/** Capture déterministe d'une intention (status CAPTURED). Zéro LLM. */
export async function captureIntention(input: CaptureIntentionInput) {
  await db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { id: true } });
  return db.intention.create({
    data: {
      strategyId: input.strategyId,
      type: input.type,
      title: input.title.slice(0, 300),
      description: input.description,
      operatorId: input.operatorId,
      status: "CAPTURED",
    },
  });
}

/**
 * Croise l'intention × l'ADVE → brief candidat. Mode LLM (croisement IA) ou
 * MANUAL (brief opérateur, déterministe). Dégrade en DEFERRED sans provider.
 */
export async function generateBriefFromIntention(input: GenerateBriefInput): Promise<BriefGenerationResult> {
  const intention = await db.intention.findUniqueOrThrow({ where: { id: input.intentionId } });
  const { context: adveContext, flat: adveFlat } = await loadAdve(intention.strategyId);

  let brief: IntentionBrief;

  if (input.mode === "MANUAL") {
    // Parité manuelle (ADR-0060) — l'opérateur fournit le brief, validé au même schéma.
    if (!input.manualBrief) {
      return { intentionId: intention.id, status: "DEFERRED", mode: "MANUAL", deferredReason: "MANUAL_BRIEF_REQUIRED" };
    }
    brief = IntentionBriefSchema.parse(input.manualBrief);
  } else {
    try {
      const { executeStructuredLLMCall } = await import("@/server/services/utils/llm-structured");
      const system = `${UNTRUSTED_NOTICE}

Tu es un stratège de marque expert du framework ADVERTIS (La Fusée). On te donne une INTENTION net-new d'une marque et le NOYAU ADVE réel de cette marque. Produis un brief candidat qui CROISE l'intention avec la réalité ADVE : il doit être actionnable, distinctif, et rigoureusement cohérent avec le noyau (ne JAMAIS contredire l'ADVE, le décliner).`;
      const prompt = `Type d'intention : ${sanitizeInline(intention.type, { max: 40 })}
${wrapUntrusted("Intention de la marque (titre)", intention.title, { max: 400 })}
${wrapUntrusted("Intention de la marque (description)", intention.description, { max: 4000 })}

${wrapUntrusted("Noyau ADVE réel de la marque", adveContext, { max: 9000 })}

Produis le brief candidat qui concrétise cette intention en restant fidèle au noyau ADVE.`;

      const res = await executeStructuredLLMCall({
        system,
        prompt,
        schema: IntentionBriefSchema,
        caller: "intention:generate-brief",
        purpose: "intermediate",
        strategyId: intention.strategyId,
        maxOutputTokens: 3000,
      });
      brief = res.data;
    } catch (err) {
      // Manual-first : pas de provider / échec → DEFERRED, l'intention reste CAPTURED.
      return {
        intentionId: intention.id,
        status: "DEFERRED",
        mode: "LLM",
        deferredReason: err instanceof Error ? err.message.slice(0, 200) : "LLM_UNAVAILABLE",
      };
    }
  }

  // Gate cohérence brief↔ADVE (déterministe, C6) — snapshot.
  const briefText = flattenPillarText(brief);
  const coherence = computeBriefAdveCoherence(briefText, adveFlat);

  await db.intention.update({
    where: { id: intention.id },
    data: {
      status: "BRIEF_GENERATED",
      briefMode: input.mode,
      briefDraft: brief as Prisma.InputJsonValue,
      coherence: { band: coherence.band, score: coherence.score } as Prisma.InputJsonValue,
    },
  });

  return {
    intentionId: intention.id,
    status: "BRIEF_GENERATED",
    mode: input.mode,
    brief,
    coherence: { band: coherence.band, score: coherence.score },
  };
}

/**
 * Décision PURE du gate de validation (déterministe, sans I/O) : un brief
 * DIVERGENT du noyau ADVE exige un override explicite. Extraite pour être
 * testable sans aucun mock d'infrastructure.
 */
export function evaluateBriefValidation(
  band: string | undefined | null,
  override: boolean,
): { validated: boolean; blocked?: string } {
  if (band === "DIVERGENT" && !override) {
    return { validated: false, blocked: "BRIEF_DIVERGENT_FROM_ADVE" };
  }
  return { validated: true };
}

/**
 * Valide le brief candidat (status BRIEF_VALIDATED). Gate : un brief DIVERGENT de
 * l'ADVE exige un override explicite (« à mes risques et périls »). Déterministe.
 */
export async function validateIntentionBrief(intentionId: string, opts?: { override?: boolean }) {
  const intention = await db.intention.findUniqueOrThrow({ where: { id: intentionId } });
  if (intention.status !== "BRIEF_GENERATED" || !intention.briefDraft) {
    throw new Error(`Intention ${intentionId} sans brief candidat à valider (status=${intention.status}).`);
  }
  const band = (intention.coherence as { band?: string } | null)?.band;
  const decision = evaluateBriefValidation(band, opts?.override ?? false);
  if (!decision.validated) {
    return { intentionId, validated: false, blocked: decision.blocked, band };
  }
  await db.intention.update({ where: { id: intentionId }, data: { status: "BRIEF_VALIDATED" } });
  return { intentionId, validated: true, band: band ?? null };
}

/** Liste les intentions d'une stratégie. */
export async function listIntentions(strategyId: string) {
  return db.intention.findMany({ where: { strategyId }, orderBy: { createdAt: "desc" } });
}

/** Détail d'une intention. */
export async function getIntention(id: string) {
  return db.intention.findUniqueOrThrow({ where: { id } });
}
