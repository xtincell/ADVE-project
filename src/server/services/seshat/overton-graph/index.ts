/**
 * ADR-0148 — Overton Graph : LE single-writer de `OvertonPosition` /
 * `OvertonActorLink` / `OvertonZoneTransition` (sous-domaine SESHAT, mesure).
 *
 * On ne lit jamais « la fenêtre » : on trace des positions qui migrent de zone,
 * par polity, et on attribue les migrations (last-touch ADR-0135). Alimente
 * l'arène T du scoreur (ADR-0149) : duels de cadre + adoption de vocabulaire.
 *
 * 100 % déterministe, zéro LLM (LOI 9). Position sans preuve → zone null, jamais
 * fabriquée (P22-2). Verrou HARD `overton-graph-single-writer.test.ts`.
 */

import { db } from "@/lib/db";
import {
  vocabularyAdoption,
  zoneDelta,
  type LinkActorToPositionInput,
  type OvertonZone,
  type RecordZoneTransitionInput,
  type UpsertOvertonPositionInput,
  type VocabAdoption,
} from "@/domain/overton-graph";
import type { Prisma } from "@prisma/client";

type OvertonDbClient = typeof db;

/** Upsert idempotent d'une position (match déterministe sur strategyId+secteur+statement). */
export async function upsertOvertonPosition(
  client: OvertonDbClient,
  input: UpsertOvertonPositionInput,
): Promise<{ status: "OK"; positionId: string; created: boolean }> {
  const existing = await client.overtonPosition.findFirst({
    where: {
      strategyId: input.strategyId ?? null,
      sectorSlug: input.sectorSlug,
      statement: input.statement,
    },
    select: { id: true, evidenceCount: true },
  });
  const evidenceLen = input.evidence.length;
  if (existing) {
    await client.overtonPosition.update({
      where: { id: existing.id },
      data: {
        // zone n'est mise à jour que si fournie (jamais effacée par une omission).
        ...(input.zone !== undefined && input.zone !== null ? { zone: input.zone } : {}),
        marketScale: input.marketScale ?? undefined,
        countryCode: input.countryCode ?? undefined,
        evidenceCount: existing.evidenceCount + evidenceLen,
        lastEvidenceAt: evidenceLen ? new Date() : undefined,
        evidence: (input.evidence as unknown as Prisma.InputJsonValue) ?? undefined,
      },
    });
    return { status: "OK", positionId: existing.id, created: false };
  }
  const created = await client.overtonPosition.create({
    data: {
      strategyId: input.strategyId ?? null,
      sectorSlug: input.sectorSlug,
      marketScale: input.marketScale ?? null,
      countryCode: input.countryCode ?? null,
      statement: input.statement,
      zone: input.zone ?? null,
      evidenceCount: evidenceLen,
      lastEvidenceAt: evidenceLen ? new Date() : null,
      evidence: input.evidence as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { status: "OK", positionId: created.id, created: true };
}

/** Enregistre une migration de zone datée + bump la zone courante de la position. */
export async function recordZoneTransition(
  client: OvertonDbClient,
  input: RecordZoneTransitionInput,
): Promise<{ status: "OK" | "NOOP"; transitionId?: string; delta: number }> {
  const position = await client.overtonPosition.findUnique({
    where: { id: input.positionId },
    select: { id: true },
  });
  if (!position) return { status: "NOOP", delta: 0 };

  const delta = zoneDelta((input.fromZone ?? null) as OvertonZone | null, input.toZone);
  const transition = await client.overtonZoneTransition.create({
    data: {
      positionId: input.positionId,
      fromZone: input.fromZone ?? null,
      toZone: input.toZone,
      occurredAt: new Date(input.occurredAt),
      evidence: input.evidence as unknown as Prisma.InputJsonValue,
      attributedActorKind: input.attributedActorKind ?? null,
      attributedActorRef: input.attributedActorRef ?? null,
    },
    select: { id: true },
  });
  // La zone courante suit la dernière transition observée.
  await client.overtonPosition.update({
    where: { id: input.positionId },
    data: { zone: input.toZone, lastEvidenceAt: new Date(input.occurredAt) },
  });
  return { status: "OK", transitionId: transition.id, delta };
}

/** Relie un acteur (marque/concurrent/superfan/institution/média) à une position. */
export async function linkActorToPosition(
  client: OvertonDbClient,
  input: LinkActorToPositionInput,
): Promise<{ status: "OK" | "NOOP"; linkId?: string }> {
  const position = await client.overtonPosition.findUnique({
    where: { id: input.positionId },
    select: { id: true },
  });
  if (!position) return { status: "NOOP" };
  const link = await client.overtonActorLink.create({
    data: {
      positionId: input.positionId,
      actorKind: input.actorKind,
      actorRef: input.actorRef ?? null,
      edgeKind: input.edgeKind,
      datedAt: input.datedAt ? new Date(input.datedAt) : null,
      evidence: (input.evidence as unknown as Prisma.InputJsonValue) ?? undefined,
    },
    select: { id: true },
  });
  return { status: "OK", linkId: link.id };
}

// ─────────────────────────────────────────── lecture pour l'arène T (scoreur)

export interface OvertonBrandSignals {
  /** Positions tenues (HOLDS/SHIFTS_TOWARD) par la marque. */
  heldPositions: { id: string; statement: string; zone: OvertonZone | null }[];
  /** Transitions favorables attribuées à la marque (delta > 0). */
  favorableTransitions: { positionId: string; delta: number; occurredAt: Date }[];
  /** Transitions défavorables (delta < 0) — comptent comme défaites. */
  adverseTransitions: { positionId: string; delta: number; occurredAt: Date }[];
}

/**
 * Signaux Overton d'une marque pour compiler des épreuves T. Lecture pure DB, zéro
 * fabrication : pas de position tenue / pas de transition ⇒ tableaux vides (l'arène
 * T sera « absente », RD large en aval).
 */
export async function getOvertonSignalsForBrand(
  client: Pick<Prisma.TransactionClient, "overtonActorLink" | "overtonZoneTransition">,
  strategyId: string,
): Promise<OvertonBrandSignals> {
  const links = await client.overtonActorLink.findMany({
    where: { actorKind: "BRAND", actorRef: strategyId, edgeKind: { in: ["HOLDS", "SHIFTS_TOWARD"] } },
    select: { position: { select: { id: true, statement: true, zone: true } } },
  });
  const heldPositions = links.map((l) => ({
    id: l.position.id,
    statement: l.position.statement,
    zone: (l.position.zone ?? null) as OvertonZone | null,
  }));

  const transitions = await client.overtonZoneTransition.findMany({
    where: { attributedActorKind: "BRAND", attributedActorRef: strategyId },
    select: { positionId: true, fromZone: true, toZone: true, occurredAt: true },
  });
  const favorableTransitions: OvertonBrandSignals["favorableTransitions"] = [];
  const adverseTransitions: OvertonBrandSignals["adverseTransitions"] = [];
  for (const t of transitions) {
    const delta = zoneDelta((t.fromZone ?? null) as OvertonZone | null, t.toZone as OvertonZone);
    if (delta > 0) favorableTransitions.push({ positionId: t.positionId, delta, occurredAt: t.occurredAt });
    else if (delta < 0) adverseTransitions.push({ positionId: t.positionId, delta, occurredAt: t.occurredAt });
  }
  return { heldPositions, favorableTransitions, adverseTransitions };
}

/** Duel de cadre déterministe (ré-export IO-free pour la compilation T). */
export function measureVocabularyDuel(
  brandLexicon: readonly string[],
  incumbentLexicon: readonly string[],
  corpus: readonly string[],
): VocabAdoption {
  return vocabularyAdoption(brandLexicon, incumbentLexicon, corpus);
}
