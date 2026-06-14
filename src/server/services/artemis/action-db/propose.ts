/**
 * Brand-action proposer (Phase 24) — additive, governed, manual-first.
 *
 * Two peer paths (manual-first parity, ADR-0060):
 *   - MANUAL: operator-typed actions → BrandAction rows. 100% deterministic, no LLM.
 *   - LLM: brand-aware generation grounded in the real ADVE + R + T pillars →
 *     Zod-validated actions → BrandAction rows. Degrades to DEFERRED (0 rows)
 *     when no LLM provider is configured — ship-able without keys.
 *
 * Rows are status=PROPOSED, source != "MATERIALIZED" (so the I-blob materializer
 * NEVER deletes them on re-sync), sourceInitiativeId=null. The operator then
 * SELECTS them (selected=true) to feed SYNTHESIZE_S / the roadmap — the canonical
 * "brief → roadmap" injection, operator-confirmed (STOP at Jehuty, ADR-0085).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { touchpointForChannel } from "./materializer";
import { resolveActionTemplateKey } from "@/server/services/financial-brain/action-costing/resolve-template";
import { PILLAR_KEYS } from "@/domain";

export type ProposeMode = "LLM" | "MANUAL";
export type ProposeVia = "BRIEF" | "GENERATE_MORE" | "MANUAL";

export interface ProposeBrandActionsInput {
  strategyId: string;
  mode: ProposeMode;
  channel?: string | null;
  count?: number;
  briefIntention?: string | null;
  budgetMax?: number | null;
  manualActions?: Array<{ title: string; channel?: string | null; description?: string | null; budget?: number | null }>;
  via?: ProposeVia;
  generatedBy?: string | null;
}

export interface ProposeBrandActionsResult {
  status: "OK" | "DEFERRED" | "EMPTY";
  mode: ProposeMode;
  created: number;
  reason?: string;
}

const LLM_PROPOSED_SOURCE = "LLM_PROPOSED";
const MANUAL_PROPOSED_SOURCE = "OPERATOR_PROPOSED";

const ProposedActionsSchema = z.object({
  actions: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        channel: z.string().min(1).max(40),
        format: z.string().max(80).optional(),
        objectif: z.string().min(3).max(400),
        pilierImpact: z.enum(PILLAR_KEYS).optional(),
        devotionImpact: z.string().max(40).optional(),
        budgetEstime: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        timeframe: z.enum(["SPRINT_90", "PHASE_1", "PHASE_2", "LONG_TERM"]).optional(),
      }),
    )
    .min(1)
    .max(20),
});
type ProposedAction = z.infer<typeof ProposedActionsSchema>["actions"][number];

const PILLAR_LABELS: Record<string, string> = {
  a: "A · Authenticité",
  d: "D · Distinction",
  v: "V · Valeur",
  e: "E · Engagement",
  r: "R · Risque",
  t: "T · Marché",
};

/** Compact ADVE + R + T context for grounding the LLM in the real brand. */
async function buildBrandContextSummary(strategyId: string): Promise<string> {
  const pillars = await db.pillar.findMany({
    where: { strategyId, key: { in: ["a", "d", "v", "e", "r", "t"] } },
    select: { key: true, content: true },
  });
  const byKey = new Map(pillars.map((p) => [p.key, p.content]));
  const parts: string[] = [];
  for (const k of ["a", "d", "v", "e", "r", "t"]) {
    const content = byKey.get(k);
    if (!content) continue;
    parts.push(`### ${PILLAR_LABELS[k]}\n${JSON.stringify(content).slice(0, 700)}`);
  }
  return parts.join("\n\n") || "(piliers ADVE non encore renseignés)";
}

interface RowSeed {
  title: string;
  channel: string | null;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  format?: string | null;
  pilierImpact?: string | null;
  devotionImpact?: string | null;
  budgetEstime?: string | null;
  timeframe?: string | null;
}

async function insertProposedRows(
  strategyId: string,
  source: string,
  via: ProposeVia,
  generatedBy: string | null,
  currency: string,
  zoneCode: string | null,
  briefIntention: string | null,
  rows: RowSeed[],
): Promise<number> {
  const proposedAt = new Date().toISOString();
  let created = 0;
  for (const r of rows) {
    const touchpoint = touchpointForChannel(r.channel);
    const costTemplateKey = resolveActionTemplateKey({
      title: r.title,
      format: r.format ?? "",
      channel: r.channel ?? "",
      touchpoint,
      objectif: r.description ?? "",
    });
    const metadata = {
      channel: r.channel,
      format: r.format ?? null,
      pilierImpact: r.pilierImpact ?? null,
      devotionImpact: r.devotionImpact ?? null,
      budgetEstime: r.budgetEstime ?? null,
      timeframe: r.timeframe ?? null,
      briefIntention: briefIntention ?? null,
      proposedVia: via,
      generatedBy,
      proposedAt,
    } satisfies Record<string, unknown>;

    await db.brandAction.create({
      data: {
        strategyId,
        sourceInitiativeId: null,
        title: r.title.slice(0, 200),
        description: r.description,
        touchpoint,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        budgetCurrency: currency,
        priority: "P2",
        selected: false,
        status: "PROPOSED",
        source,
        costTemplateKey,
        costZoneCode: zoneCode,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    created++;
  }
  return created;
}

export async function proposeBrandActions(input: ProposeBrandActionsInput): Promise<ProposeBrandActionsResult> {
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { currencyCode: true, countryCode: true },
  });
  const currency = strategy?.currencyCode ?? "XAF";
  const zoneCode = strategy?.countryCode ?? null;
  const via: ProposeVia =
    input.via ?? (input.mode === "MANUAL" ? "MANUAL" : input.briefIntention ? "BRIEF" : "GENERATE_MORE");

  // ── MANUAL path (deterministic floor + manual-first parity) ───────────────
  if (input.mode === "MANUAL") {
    const items = (input.manualActions ?? []).filter((a) => a.title && a.title.trim().length >= 3);
    if (items.length === 0) {
      return { status: "EMPTY", mode: "MANUAL", created: 0, reason: "Aucune action manuelle fournie." };
    }
    const created = await insertProposedRows(
      input.strategyId,
      MANUAL_PROPOSED_SOURCE,
      via,
      input.generatedBy ?? null,
      currency,
      zoneCode,
      input.briefIntention ?? null,
      items.map((a) => ({
        title: a.title.trim(),
        channel: a.channel ?? input.channel ?? null,
        description: a.description ?? null,
        budgetMin: a.budget ?? null,
        budgetMax: a.budget ?? null,
      })),
    );
    return { status: "OK", mode: "MANUAL", created };
  }

  // ── LLM path (brand-aware, graceful DEFERRED without provider) ────────────
  const count = Math.min(Math.max(input.count ?? 5, 1), 12);
  const [context, existing] = await Promise.all([
    buildBrandContextSummary(input.strategyId),
    db.brandAction.findMany({ where: { strategyId: input.strategyId }, select: { title: true }, take: 100 }),
  ]);
  const existingTitles = existing.map((e) => e.title).slice(0, 60).join(" | ") || "(aucune)";

  let actions: ProposedAction[];
  try {
    const { executeStructuredLLMCall } = await import("@/server/services/utils/llm-structured");
    const res = await executeStructuredLLMCall({
      schema: ProposedActionsSchema,
      schemaTitle: "ProposedBrandActions",
      system:
        "Tu es un stratège de marque senior de La Fusée. Tu proposes des actions marketing concrètes, activables et cohérentes avec l'identité réelle de la marque. Pas de généralités — chaque action est spécifique, mesurable et ancrée dans le contexte fourni.",
      prompt:
        `Contexte de la marque (piliers ADVE + Risque/Marché) :\n${context}\n\n` +
        `Génère ${count} action(s) marketing concrètes` +
        (input.channel ? ` pour le canal « ${input.channel} »` : "") +
        (input.briefIntention ? `, répondant à ce brief opérateur : « ${input.briefIntention} »` : "") +
        (input.budgetMax ? `, en restant sous un budget de ${input.budgetMax} ${currency}` : "") +
        `. Chaque action sert l'Authenticité (A), la Distinction (D), la Valeur (V) ou l'Engagement (E), ` +
        `en tenant compte des Risques (R) et de la réalité du Marché (T). ` +
        `Ne duplique PAS ces actions déjà présentes : ${existingTitles}.`,
      caller: "artemis.proposeBrandActions",
      strategyId: input.strategyId,
      purpose: "agent",
      maxOutputTokens: 2500,
    });
    actions = res.data.actions;
  } catch (err) {
    return { status: "DEFERRED", mode: "LLM", created: 0, reason: err instanceof Error ? err.message : "LLM indisponible" };
  }

  const created = await insertProposedRows(
    input.strategyId,
    LLM_PROPOSED_SOURCE,
    via,
    input.generatedBy ?? "llm",
    currency,
    zoneCode,
    input.briefIntention ?? null,
    actions.map((a) => ({
      title: a.title,
      channel: a.channel ?? input.channel ?? null,
      description: a.objectif,
      format: a.format ?? null,
      pilierImpact: a.pilierImpact ?? null,
      devotionImpact: a.devotionImpact ?? null,
      budgetEstime: a.budgetEstime ?? null,
      timeframe: a.timeframe ?? null,
      budgetMin: null,
      budgetMax: null,
    })),
  );
  return { status: "OK", mode: "LLM", created };
}
