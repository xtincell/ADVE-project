/** Existing pillar state machine. Pure decision persistence, never production. */
import type { Pillar, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { findDanglingReferences, type PillarBag } from "@/domain/pillar-reference-edges";
import { measuredConfidence } from "@/lib/confidence";
import { PillarSSchema } from "@/lib/types/pillar-schemas";
import { evaluatePillarReadiness } from "@/server/governance/pillar-readiness";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";
import { checkStaleness } from "@/server/services/staleness-propagator";
import { validateCrossReferences } from "@/server/services/cross-validator";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";

type Status = "DRAFT" | "AI_PROPOSED" | "VALIDATED" | "LOCKED";
const transitions: Record<string, readonly Status[]> = {
  DRAFT: ["AI_PROPOSED", "VALIDATED"], AI_PROPOSED: ["DRAFT", "VALIDATED"],
  VALIDATED: ["LOCKED", "DRAFT"], LOCKED: ["DRAFT"],
};

/** Composition and maturity are independent from approval and confidence. */
export function inspectSynthesis(pillar: Pillar | null) {
  const readiness = evaluatePillarReadiness(pillar, "S");
  const content = (pillar?.content ?? {}) as Record<string, unknown>;
  const parsed = PillarSSchema.safeParse(content);
  const missing = [...new Set([
    ...getContract("s").stages.ENRICHED.filter(req => !isFieldSatisfied(content, req)).map(req => req.path),
    ...(parsed.success ? [] : parsed.error.issues.map(issue => issue.path.join("."))),
  ])];
  // ENRICHED is the existing composed synthesis contract. COMPLETE includes
  // extra Glory-specific inputs, and must not be claimed by human approval.
  const composed = Boolean(pillar) && parsed.success
    && (readiness.stage === "ENRICHED" || readiness.stage === "COMPLETE");
  return { exists: Boolean(pillar), composed, missing, readiness,
    currentVersion: pillar?.currentVersion ?? null, canValidate: composed && !readiness.stale };
}

interface Decision {
  strategyId: string; key: string; targetStatus: Status; userId: string;
  expectedVersion?: number; acknowledgeLowConfidence?: boolean;
}

async function loadReviewScope(tx: Prisma.TransactionClient, strategyId: string, userId: string) {
  // Serialize approvals; then lock the actual source rows used by all gates.
  // Content writers also lock these rows on persistence. No snapshot is
  // approved from before a queued edit or staleness propagation.
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Pillar" WHERE "strategyId" = ${strategyId} ORDER BY id FOR UPDATE`;
  const actor = await getOperatorContext(userId, tx);
  if ((!actor.operatorId && actor.role !== "ADMIN") || !(await canAccessStrategy(strategyId, actor, tx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette validation requiert un opérateur autorisé sur la marque." });
  }
  const strategy = await tx.strategy.findUnique({ where: { id: strategyId }, include: { pillars: true } });
  if (!strategy || strategy.archivedAt) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Ce dossier est absent ou archivé." });
  }
  return strategy;
}

async function assertValidationSources(pillar: Pillar, tx: Prisma.TransactionClient) {
  const key = pillar.key.toLowerCase();
  if (pillar.staleAt || (await checkStaleness(pillar.strategyId, key, tx)).isStale) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le contenu est obsolète. Actualisez-le depuis ses sources avant de valider." });
  }
  const invalid = (await validateCrossReferences(pillar.strategyId, tx)).filter(row =>
    row.status === "INVALID" && (row.from.startsWith(`${key.toUpperCase()}.`) || row.to.startsWith(`${key.toUpperCase()}.`)));
  if (invalid.length) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Des liens entre les données sont incohérents (${invalid.length}). Relisez la synthèse et ses sources.` });
  }
  if (key === "s") {
    const sources = await tx.pillar.findMany({ where: { strategyId: pillar.strategyId }, select: { key: true, content: true } });
    const bag = Object.fromEntries(sources.map(row => [row.key.toUpperCase(), row.content])) as PillarBag;
    if (findDanglingReferences(bag, { strictS: true }).some(ref => ref.source.startsWith("S."))) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La synthèse pointe vers une source introuvable. Relisez ses initiatives, risques et hypothèses." });
    }
  }
}

/** Boundary used only for projects explicitly derived from the approved S. */
export async function assertApprovedSynthesis(strategyId: string, userId: string) {
  return db.$transaction(async tx => {
    const strategy = await loadReviewScope(tx, strategyId, userId);
    const pillar = strategy.pillars.find(row => row.key === "s");
    if (!pillar || !["VALIDATED", "LOCKED"].includes(pillar.validationStatus ?? "")
      || !["VALIDATED", "ACTIVE"].includes(strategy.status) || !inspectSynthesis(pillar).composed) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Composez et approuvez la synthèse avant de créer des projets depuis ses initiatives." });
    }
    await assertValidationSources(pillar, tx);
    return strategy;
  }, { timeout: 30_000 });
}

export async function transitionPillarStatus(input: Decision) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const strategy = await loadReviewScope(tx, input.strategyId, input.userId);
    const key = input.key.toLowerCase();
    const pillar = strategy.pillars.find(row => row.key === key);
    if (!pillar) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La synthèse ou le contenu à valider est absent." });
    const confidence = measuredConfidence(pillar.confidence);
    const approvingS = key === "s" && input.targetStatus === "VALIDATED";
    if (approvingS && input.expectedVersion === undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Rechargez la synthèse pour valider sa version actuelle." });
    }
    if (input.expectedVersion !== undefined && pillar.currentVersion !== input.expectedVersion) {
      throw new TRPCError({ code: "CONFLICT", message: "Le contenu a changé depuis votre lecture. Rechargez-le avant de valider." });
    }
    const currentStatus = pillar.validationStatus ?? "DRAFT";
    const alreadyApplied = approvingS && (currentStatus === "VALIDATED" || currentStatus === "LOCKED");
    if (!alreadyApplied && !(transitions[currentStatus] ?? []).includes(input.targetStatus)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Transition impossible : ${currentStatus} → ${input.targetStatus}.` });
    }
    if (input.targetStatus === "VALIDATED") {
      if (approvingS && !inspectSynthesis(pillar).composed) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La synthèse est incomplète. Relisez et composez-la avant son approbation." });
      }
      await assertValidationSources(pillar, tx);
    }
    if (input.targetStatus === "LOCKED" && (confidence === null || confidence < 0.7)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La confiance enregistrée ne permet pas le verrouillage." });
    }
    if (approvingS && !alreadyApplied && (confidence === null || confidence < 0.3) && !input.acknowledgeLowConfidence) {
      return { success: false as const, warning: true as const, confidence, updated: null,
        version: pillar.currentVersion,
        validationStatus: currentStatus, message: "La confiance est faible ou non mesurée. Confirmez votre décision après lecture." };
    }
    // A retry of the same reviewed version has no second write or timestamp.
    if (alreadyApplied) return { success: true as const, warning: false as const,
      confidence, alreadyApplied: true, newStatus: currentStatus, updated: strategy, version: pillar.currentVersion };
    // State only: no confidence, content, provenance or version mutation.
    await tx.pillar.update({ where: { id: pillar.id }, data: { validationStatus: input.targetStatus } });
    const updated = approvingS
      ? await tx.strategy.update({ where: { id: input.strategyId }, data: { status: "VALIDATED" } })
      : key === "s" && input.targetStatus === "DRAFT" && strategy.status === "VALIDATED"
        ? await tx.strategy.update({ where: { id: input.strategyId }, data: { status: "DRAFT" } }) : strategy;
    return { success: true as const, warning: false as const, confidence, alreadyApplied: false,
      newStatus: input.targetStatus, updated, version: pillar.currentVersion };
  }, { timeout: 30_000 });
}
