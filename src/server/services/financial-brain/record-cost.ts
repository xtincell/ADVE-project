/**
 * Thot — ledger de coût réalisé par IntentEmission (ADR-0124).
 *
 * # Le chemin mort que ce module ferme
 *
 * `governance/bootstrap.ts` souscrit depuis Phase 3 un subscriber Thot sur
 * `intent.completed` qui appelait `financial-brain.recordCost` en
 * optional-chaining — mais la fonction N'EXISTAIT PAS, et l'événement ne
 * portait jamais `costUsd`. Double chemin mort : ni producteur ni
 * consommateur. Le spine d'émission unifié publie désormais `costUsd` quand
 * il est réellement connu, et CE module le persiste.
 *
 * # Honnêteté du chiffre
 *
 * `costUsd` = coût RÉALISÉ, jamais un estimé (l'estimé vit dans
 * `CostDecision.estimatedUsd`, table d'audit de la gate). Les appels sans
 * coût réel ne passent pas par ici — « ne jamais combler un trou en
 * inventant des données ». Accumulation : plusieurs enregistrements pour la
 * même émission s'ADDITIONNENT (un intent peut déclencher plusieurs
 * combustions LLM).
 *
 * Zéro LLM, un SELECT + un UPDATE. Best-effort côté subscriber (bootstrap
 * catch) — un échec de ledger ne casse jamais le pipeline.
 */

import { db } from "@/lib/db";

export interface RecordCostInput {
  intentId: string;
  /** Coût réalisé en USD — strictement positif pour être enregistré. */
  costUsd: number;
}

export async function recordCost(input: RecordCostInput): Promise<{ recorded: boolean }> {
  if (!input.intentId || !Number.isFinite(input.costUsd) || input.costUsd <= 0) {
    return { recorded: false };
  }

  const emission = await db.intentEmission.findUnique({
    where: { id: input.intentId },
    select: { id: true, costUsd: true },
  });
  if (!emission) return { recorded: false };

  // Accumulation explicite (COALESCE(costUsd, 0) + x) — `increment` Prisma
  // sur une colonne NULL rendrait NULL en SQL.
  const current = emission.costUsd === null ? 0 : Number(emission.costUsd);
  await db.intentEmission.update({
    where: { id: emission.id },
    data: { costUsd: current + input.costUsd },
  });
  return { recorded: true };
}
