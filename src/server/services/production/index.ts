/**
 * production/ — Acteur Production (ADR-0111).
 *
 * Fan-out d'une exécution en specs de livrable (depuis le catalogue seedé
 * `ChannelSpecReference`) + droits d'usage `UsageGrant` avec gate d'expiration.
 * Formules pures dans `specs.ts` ; ici la persistance. Zéro LLM.
 */

import { db } from "@/lib/db";
import {
  deriveSpecFromChannel,
  computeGrantExpiry,
  isDiffusionAllowed,
  type ChannelSpecRow,
} from "./specs";
import { computeLineVariance, rollupBySection, rollupTotals, type AicpLineLike } from "./aicp";

export * from "./specs";
export * from "./aicp";

/**
 * Éclate un `CampaignExecution` en N `DeliverableSpec` à partir des clés du
 * catalogue. Les clés introuvables sont ignorées (rapport `skipped`) — jamais
 * de spec inventée.
 */
export async function fanOutDeliverables(input: { executionId: string; channelSpecKeys: string[] }) {
  const rows = (await db.channelSpecReference.findMany({
    where: { key: { in: input.channelSpecKeys } },
    select: {
      key: true, channel: true, aspectRatio: true, resolution: true, durationSec: true,
      codec: true, frameRate: true, loudnessTarget: true, captionRequired: true, fileFormat: true, maxFileMb: true,
    },
  })) as ChannelSpecRow[];

  const found = new Set(rows.map((r) => r.key));
  const skipped = input.channelSpecKeys.filter((k) => !found.has(k));

  const created = [];
  for (const row of rows) {
    const spec = deriveSpecFromChannel(row);
    created.push(
      await db.deliverableSpec.create({
        data: { executionId: input.executionId, ...spec },
      }),
    );
  }
  return { created, skipped };
}

export async function createUsageGrant(input: {
  deliverableSpecId?: string;
  talentProfileId?: string;
  media: string[];
  territory: string;
  termStart: Date;
  termMonths: number;
  buyoutFee?: number;
  currency?: string;
  exclusivity?: boolean;
}) {
  const expiresAt = computeGrantExpiry(input.termStart, input.termMonths);
  return db.usageGrant.create({
    data: {
      deliverableSpecId: input.deliverableSpecId ?? null,
      talentProfileId: input.talentProfileId ?? null,
      media: input.media,
      territory: input.territory,
      termStart: input.termStart,
      termMonths: input.termMonths,
      buyoutFee: input.buyoutFee ?? null,
      currency: input.currency ?? "XAF",
      exclusivity: input.exclusivity ?? false,
      expiresAt,
    },
  });
}

/**
 * Gate de diffusion : un livrable est diffusable ssi un droit d'usage est ACTIVE
 * et non expiré à `asOf` (défaut maintenant). Déterministe.
 */
export async function checkDiffusionAllowed(deliverableSpecId: string, asOf: Date = new Date()) {
  const grants = await db.usageGrant.findMany({
    where: { deliverableSpecId },
    select: { expiresAt: true, status: true },
  });
  return isDiffusionAllowed(grants, asOf);
}

// ── Devis AICP (ADR-0112) — triple planned/actual/variance ───────────────────

export async function addAicpLine(input: {
  executionId: string;
  sectionCode: string;
  description: string;
  plannedAmount: number;
  currency?: string;
}) {
  return db.aicpLineItem.create({
    data: {
      executionId: input.executionId,
      sectionCode: input.sectionCode,
      description: input.description,
      plannedAmount: input.plannedAmount,
      currency: input.currency ?? "XAF",
    },
  });
}

/** Enregistre le réalisé d'une ligne AICP + calcule la variance (déterministe). */
export async function recordAicpActual(input: { lineId: string; actualAmount: number }) {
  const line = await db.aicpLineItem.findUniqueOrThrow({
    where: { id: input.lineId },
    select: { plannedAmount: true },
  });
  return db.aicpLineItem.update({
    where: { id: input.lineId },
    data: {
      actualAmount: input.actualAmount,
      variance: computeLineVariance(line.plannedAmount, input.actualAmount),
    },
  });
}

/** Devis AICP d'une exécution : lignes + rollup par section + totaux. Déterministe. */
export async function getAicpDevis(executionId: string) {
  const lines = await db.aicpLineItem.findMany({
    where: { executionId },
    orderBy: { sectionCode: "asc" },
  });
  const lite: AicpLineLike[] = lines.map((l) => ({
    sectionCode: l.sectionCode,
    plannedAmount: l.plannedAmount,
    actualAmount: l.actualAmount,
  }));
  return { lines, bySection: rollupBySection(lite), totals: rollupTotals(lite) };
}
