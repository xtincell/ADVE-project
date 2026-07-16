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
import { recordEpreuve, resolveLeagueForStrategy } from "./index";

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
    const hasSource = !!c.sourceUrl && c.sourceUrl.trim().length > 0;
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
}

/**
 * Décision opérateur. APPROVE → `recordEpreuve` (voie unique) dans la ligue du
 * sujet ; REJECT → statut, aucune écriture `Epreuve`.
 */
export async function decideCandidate(input: DecideCandidateInput): Promise<{ status: string; recordedEpreuveId: string | null }> {
  const cand = await db.epreuveCandidate.findUnique({ where: { id: input.candidateId } });
  if (!cand) throw new Error("EpreuveCandidate introuvable");
  if (cand.status !== "PENDING") throw new Error(`Candidate déjà traitée (${cand.status})`);

  if (input.decision === "REJECT") {
    await db.epreuveCandidate.update({
      where: { id: cand.id },
      data: { status: "REJECTED", reviewedBy: input.reviewedBy, reviewedAt: new Date() },
    });
    return { status: "REJECTED", recordedEpreuveId: null };
  }

  // APPROVE — la ligue vient du sujet (déterministe), la source du claim + URL.
  const league = await resolveLeagueForStrategy(cand.subjectStrategyId);
  const ep = await recordEpreuve({
    subjectStrategyId: cand.subjectStrategyId,
    opponentStrategyId: cand.rivalStrategyId ?? null,
    opponentBrandRefId: cand.rivalBrandRefId ?? null,
    arena: cand.arena as "A" | "D" | "V",
    league: { sectorSlug: league.sectorSlug, marketScale: league.marketScale, countryCode: league.countryCode },
    result: cand.proposedResult as "WIN" | "LOSS",
    proofWeight: PROOF_WEIGHTS.moyen,
    source: `hunter-review:${cand.claim}${cand.sourceUrl ? ` @${cand.sourceUrl}` : ""}`,
    occurredAt: new Date().toISOString(),
  });
  await db.epreuveCandidate.update({
    where: { id: cand.id },
    data: { status: "APPROVED", reviewedBy: input.reviewedBy, reviewedAt: new Date(), recordedEpreuveId: ep.id },
  });

  // Re-score immédiat du sujet — SANS ça, l'épreuve validée ne « comptait »
  // nulle part : le leaderboard gardait le verdict d'AVANT la validation tant
  // que l'opérateur ne relançait pas toute la moulinette (audit 2026-07-16,
  // `victoire-validee-score-jamais-recalcule`). Best-effort : un échec de
  // rescore ne défait pas la validation.
  try {
    const { scoreBrand } = await import("./index");
    await scoreBrand(cand.subjectStrategyId, { persist: true });
  } catch (err) {
    console.warn("[scoreur] rescore post-validation échoué (non bloquant):", err instanceof Error ? err.message : err);
  }

  return { status: "APPROVED", recordedEpreuveId: ep.id };
}

export async function listCandidates(args: { subjectStrategyId?: string; status?: string; limit?: number }) {
  const rows = await db.epreuveCandidate.findMany({
    where: {
      ...(args.subjectStrategyId ? { subjectStrategyId: args.subjectStrategyId } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 200,
  });
  return rows;
}
