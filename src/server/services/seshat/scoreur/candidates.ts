/**
 * ADR-0154 — Quarantaine des victoires (Hunter LLM) AVANT revue opérateur.
 *
 * LE single-writer d'`EpreuveCandidate`. Une victoire proposée par Hunter n'entre
 * JAMAIS directement dans le registre `Epreuve` (lu intégralement par le
 * compilateur) : elle attend la validation humaine. APPROVE → `recordEpreuve`
 * (la voie unique existante). Garde déterministe : sans `sourceUrl` → auto-REJECT.
 * Zéro LLM ici (la récolte LLM vit chez `argos/victory-hunt.ts`).
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { PROOF_WEIGHTS } from "@/domain/scoreur";
import { loadAnchorsForLeague, recordEpreuve, resolveLeagueForStrategy, scoreBrand } from "./index";

export type CandidateArena = "A" | "D" | "V";
export type ProposedResult = "WIN" | "LOSS";

export interface CandidateInput {
  arena: CandidateArena;
  rivalName: string;
  rivalStrategyId?: string | null;
  rivalBrandRefId?: string | null;
  proposedResult: ProposedResult;
  claim: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  confidence?: number | null;
}

function dedupHash(subjectStrategyId: string, c: CandidateInput): string {
  const norm = `${subjectStrategyId}|${c.rivalName.trim().toLowerCase()}|${c.arena}|${c.claim.trim().toLowerCase()}`;
  return createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

export interface CreateCandidatesResult {
  created: number;
  pending: number;
  autoRejected: number;
  skippedDuplicate: number;
}

function isWebSource(value: string | null | undefined): boolean {
  try { return !!value && ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

/**
 * Persiste des victoires candidates (append-only). Garde : sans `sourceUrl` →
 * status REJECTED d'emblée (auto-reject, conservé pour l'audit, jamais présenté à
 * la revue). Dédup par `dedupHash` (récolte répétée = idempotente).
 */
export async function createCandidates(
  subjectStrategyId: string,
  items: CandidateInput[],
  intentEmissionId?: string,
): Promise<CreateCandidatesResult> {
  let pending = 0;
  let autoRejected = 0;
  let skippedDuplicate = 0;

  for (const c of items) {
    const hash = dedupHash(subjectStrategyId, c);
    const exists = await db.epreuveCandidate.findUnique({ where: { dedupHash: hash }, select: { id: true } });
    if (exists) {
      skippedDuplicate += 1;
      continue;
    }
    const hasSource = isWebSource(c.sourceUrl);
    const status = hasSource ? "PENDING" : "REJECTED";
    await db.epreuveCandidate.create({
      data: {
        subjectStrategyId,
        rivalName: c.rivalName.trim(),
        rivalStrategyId: c.rivalStrategyId ?? null,
        rivalBrandRefId: c.rivalBrandRefId ?? null,
        arena: c.arena,
        proposedResult: c.proposedResult,
        claim: c.claim.trim(),
        sourceUrl: c.sourceUrl?.trim() || null,
        sourceTitle: c.sourceTitle?.trim() || null,
        confidence: c.confidence ?? null,
        status,
        dedupHash: hash,
        intentEmissionId: intentEmissionId ?? null,
        ...(hasSource ? {} : { reviewedBy: "SYSTEM", reviewedAt: new Date() }),
      },
    });
    if (hasSource) pending += 1;
    else autoRejected += 1;
  }
  return { created: pending + autoRejected, pending, autoRejected, skippedDuplicate };
}

export interface DecideCandidateInput {
  candidateId: string;
  decision: "APPROVE" | "REJECT";
  reviewedBy: string;
  /** Explicit human link when an external proposal has no identified rival yet. */
  rivalStrategyId?: string;
  /** Date du fait vérifiée par le réviseur ; distincte de reviewedAt. */
  occurredAt?: string;
}

/**
 * Décision opérateur. APPROVE → `recordEpreuve` (voie unique) dans la ligue du
 * sujet ; REJECT → statut, aucune écriture `Epreuve`.
 */
export async function decideCandidate(input: DecideCandidateInput) {
  return db.$transaction(async (tx) => {
    const cand = await tx.epreuveCandidate.findUnique({ where: { id: input.candidateId } });
    if (!cand) throw new Error("EpreuveCandidate introuvable");
    if (cand.status !== "PENDING") throw new Error(`Candidate déjà traitée (${cand.status})`);

    if (input.decision === "REJECT") {
      const changed = await tx.epreuveCandidate.updateMany({
        where: { id: cand.id, status: "PENDING" },
        data: { status: "REJECTED", reviewedBy: input.reviewedBy, reviewedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("Cette preuve a déjà été traitée");
      return { status: "REJECTED", recordedEpreuveId: null, strategyId: cand.subjectStrategyId, score: null };
    }

    if (!isWebSource(cand.sourceUrl)) throw new Error("Une source web consultable est requise avant validation");
    if (!input.occurredAt || !Number.isFinite(Date.parse(input.occurredAt))) throw new Error("La date d’observation du fait est requise avant validation");
    const rivalStrategyId = input.rivalStrategyId ?? cand.rivalStrategyId;
    if (rivalStrategyId === cand.subjectStrategyId) throw new Error("Choisissez un rival distinct de la marque étudiée");
    if (input.rivalStrategyId && ((cand.rivalStrategyId && cand.rivalStrategyId !== input.rivalStrategyId) || cand.rivalBrandRefId)) throw new Error("Le rival est déjà identifié dans cette preuve");
    if (!rivalStrategyId && !cand.rivalBrandRefId) throw new Error("Identifiez le rival avant de valider cette preuve");
    if (rivalStrategyId && !(await tx.strategy.findUnique({ where: { id: rivalStrategyId }, select: { id: true } }))) throw new Error("Rival introuvable");
    if (!rivalStrategyId && cand.rivalBrandRefId && !(await tx.brandRef.findUnique({ where: { id: cand.rivalBrandRefId }, select: { id: true } }))) throw new Error("Rival introuvable");
    const claimed = await tx.epreuveCandidate.updateMany({ where: { id: cand.id, status: "PENDING" },
      data: { status: "APPROVED", reviewedBy: input.reviewedBy, reviewedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("Cette preuve a déjà été traitée");

    // APPROVE — la ligue vient du sujet (déterministe), la source du claim + URL.
    const league = await resolveLeagueForStrategy(cand.subjectStrategyId, tx);
    if (!rivalStrategyId && cand.rivalBrandRefId) {
      const ref = await tx.brandRef.findUniqueOrThrow({ where: { id: cand.rivalBrandRefId }, select: { fixedTheta: true } });
      if (ref.fixedTheta != null && (await loadAnchorsForLeague(league, tx))[cand.rivalBrandRefId] === undefined) throw new Error("Cet étalon ne concerne pas cette ligue");
    }
    const ep = await recordEpreuve({
      subjectStrategyId: cand.subjectStrategyId,
      opponentStrategyId: rivalStrategyId ?? null,
      opponentBrandRefId: rivalStrategyId ? null : cand.rivalBrandRefId,
      arena: cand.arena as "A" | "D" | "V",
      league: { sectorSlug: league.sectorSlug, marketScale: league.marketScale, countryCode: league.countryCode },
      result: cand.proposedResult as "WIN" | "LOSS",
      proofWeight: PROOF_WEIGHTS.moyen,
      source: `hunter-review:${cand.claim}${cand.sourceUrl ? ` @${cand.sourceUrl}` : ""}`,
      occurredAt: input.occurredAt,
    }, tx);
    await tx.epreuveCandidate.update({
      where: { id: cand.id },
      data: { rivalStrategyId, recordedEpreuveId: ep.id },
  });

  // Approval, observed duel and its public verdict commit together. A failure
  // leaves the review pending, so the same decision can be retried safely.
  const score = await scoreBrand(cand.subjectStrategyId, { persist: true, client: tx });
  return { status: "APPROVED", recordedEpreuveId: ep.id, strategyId: cand.subjectStrategyId, score };
  });
}

export async function listCandidates(args: { subjectStrategyId?: string; subjectStrategyIds?: string[]; status?: string; limit?: number }) {
  const rows = await db.epreuveCandidate.findMany({
    where: {
      ...(args.subjectStrategyId ? { subjectStrategyId: args.subjectStrategyId } : {}),
      ...(args.subjectStrategyIds ? { subjectStrategyId: { in: args.subjectStrategyIds } } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 200,
  });
  return rows;
}
