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

import { readOvertonPositioning, type OvertonPositioning } from "@/domain/overton-positioning";
import { db } from "@/lib/db";
import {
  vocabularyAdoption,
  readOvertonEvidence,
  qualifyingOvertonEvidence,
  zoneDelta,
  type LinkActorToPositionInput,
  type OvertonZone,
  type RecordZoneTransitionInput,
  type UpsertOvertonPositionInput,
  type VocabAdoption,
} from "@/domain/overton-graph";
import type { Prisma } from "@prisma/client";

type OvertonDbClient = typeof db;

function mergeEvidence(previous: unknown, incoming: UpsertOvertonPositionInput["evidence"]) {
  return [...new Map([...readOvertonEvidence(previous).items, ...incoming].map(item => [JSON.stringify(Object.keys(item).sort().map(key => [key, item[key as keyof typeof item]])), item])).values()];
}
function latestEvidenceAt(items: UpsertOvertonPositionInput["evidence"]): Date | null {
  const dates = items.flatMap(item => item.at && Number.isFinite(Date.parse(item.at)) && Date.parse(item.at) <= Date.now() ? [Date.parse(item.at)] : []);
  return dates.length ? new Date(Math.max(...dates)) : null;
}

/** Existing graph, identity includes polity and the stable ADVE concept when supplied. */
export async function upsertOvertonPosition(
  client: OvertonDbClient,
  input: UpsertOvertonPositionInput,
): Promise<{ status: "OK"; positionId: string; created: boolean }> {
  return client.$transaction(async tx => {
    const existing = await tx.overtonPosition.findFirst({
      where: {
        strategyId: input.strategyId ?? null, sectorSlug: input.sectorSlug,
        marketScale: input.marketScale ?? null, countryCode: input.countryCode ?? null,
        ...(input.concept ? { evidence: { path: ["concept", "key"], equals: input.concept.key } } : { statement: input.statement }),
      }, select: { id: true, zone: true, statement: true, evidence: true },
    });
    const prior = readOvertonEvidence(existing?.evidence);
    if (existing && existing.statement !== input.statement && prior.items.length) {
      throw new Error("La proposition a changé : enregistrez une nouvelle position pour conserver la portée des preuves antérieures.");
    }
    const concept = input.concept ?? prior.concept;
    if (prior.concept && input.concept && (prior.concept.audience !== input.concept.audience || prior.concept.kind !== input.concept.kind || prior.concept.targetZone !== input.concept.targetZone)) {
      throw new Error("Un changement de public, de sujet ou de cible nécessite une position distincte.");
    }
    const items = mergeEvidence(existing?.evidence, input.evidence);
    if (input.zone && (!concept || !qualifyingOvertonEvidence(items, input.zone, concept.audience, input.countryCode ?? null).length)) {
      throw new Error("Une zone observée exige une preuve datée, une méthode et le même public et territoire.");
    }
    if (existing?.zone && input.zone && existing.zone !== input.zone) {
      throw new Error("Enregistrez une transition datée pour déplacer une position déjà observée.");
    }
    const evidence = { schema: "overton-evidence-v2", ...(concept ? { concept } : {}), items } as unknown as Prisma.InputJsonValue;
    const values = { statement: input.statement, evidence, evidenceCount: items.length, lastEvidenceAt: latestEvidenceAt(items),
      ...(input.zone ? { zone: input.zone } : {}) };
    if (existing) {
      await tx.overtonPosition.update({ where: { id: existing.id }, data: values });
      return { status: "OK" as const, positionId: existing.id, created: false };
    }
    const created = await tx.overtonPosition.create({ data: { ...values,
      strategyId: input.strategyId ?? null, sectorSlug: input.sectorSlug,
      marketScale: input.marketScale ?? null, countryCode: input.countryCode ?? null,
    }, select: { id: true } });
    return { status: "OK" as const, positionId: created.id, created: true };
  }, { isolationLevel: "Serializable" });
}

/** Atomic, chronological and repeat-safe. A postulate cannot create a scoreur victory. */
export async function recordZoneTransition(
  client: OvertonDbClient,
  input: RecordZoneTransitionInput,
): Promise<{ status: "OK" | "NOOP"; transitionId?: string; delta: number }> {
  return client.$transaction(async tx => {
    const position = await tx.overtonPosition.findUnique({ where: { id: input.positionId },
      select: { id: true, zone: true, countryCode: true, evidence: true, lastEvidenceAt: true } });
    if (!position) return { status: "NOOP" as const, delta: 0 };
    const existing = await tx.overtonZoneTransition.findFirst({ where: { positionId: input.positionId }, orderBy: { occurredAt: "desc" } });
    if (existing?.occurredAt.getTime() === Date.parse(input.occurredAt) && existing.toZone === input.toZone) return { status: "NOOP" as const, transitionId: existing.id, delta: 0 };
    const envelope = readOvertonEvidence(position.evidence);
    const at = Date.parse(input.occurredAt);
    if (!Number.isFinite(at) || at > Date.now() || (existing && at <= existing.occurredAt.getTime()) || (!existing && position.lastEvidenceAt && at < position.lastEvidenceAt.getTime())) throw new Error("La transition doit être datée après la dernière observation, sans date future.");
    if (input.fromZone !== undefined && input.fromZone !== position.zone) throw new Error("La position de départ a changé ; relisez-la avant de poursuivre.");
    if (!envelope.concept || !qualifyingOvertonEvidence(input.evidence, input.toZone, envelope.concept.audience, position.countryCode, at).length) {
      throw new Error("La transition exige une preuve datée du même public et territoire, qualifiant la zone visée.");
    }
    if (position.zone === input.toZone) return { status: "NOOP" as const, delta: 0 };
    if (position.zone && !qualifyingOvertonEvidence(envelope.items, position.zone as OvertonZone, envelope.concept.audience, position.countryCode, at).length) {
      throw new Error("La position de départ exige sa propre observation avant de mesurer un déplacement.");
    }
    const delta = zoneDelta(position.zone as OvertonZone | null, input.toZone);
    const transition = await tx.overtonZoneTransition.create({ data: {
      positionId: input.positionId, fromZone: position.zone, toZone: input.toZone, occurredAt: new Date(at),
      evidence: input.evidence as unknown as Prisma.InputJsonValue,
      attributedActorKind: input.attributedActorKind ?? null, attributedActorRef: input.attributedActorRef ?? null,
    }, select: { id: true } });
    const items = mergeEvidence(position.evidence, input.evidence);
    await tx.overtonPosition.update({ where: { id: position.id }, data: { zone: input.toZone,
      lastEvidenceAt: latestEvidenceAt(items), evidenceCount: items.length,
      evidence: { schema: "overton-evidence-v2", concept: envelope.concept, items } as unknown as Prisma.InputJsonValue,
    } });
    return { status: "OK" as const, transitionId: transition.id, delta };
  }, { isolationLevel: "Serializable" });
}

/** Relie un acteur (marque/concurrent/superfan/institution/média) à une position. */
export async function linkActorToPosition(
  client: OvertonDbClient,
  input: LinkActorToPositionInput,
): Promise<{ status: "OK" | "NOOP"; linkId?: string }> {
  return client.$transaction(async tx => {
    const position = await tx.overtonPosition.findUnique({ where: { id: input.positionId }, select: { id: true } });
    if (!position) return { status: "NOOP" as const };
    const identity = { positionId: input.positionId, actorKind: input.actorKind,
      actorRef: input.actorRef ?? null, edgeKind: input.edgeKind,
      datedAt: input.datedAt ? new Date(input.datedAt) : null };
    const prior = await tx.overtonActorLink.findFirst({ where: { ...identity,
      ...(input.evidence ? { evidence: { equals: input.evidence as Prisma.InputJsonValue } } : {}),
    }, select: { id: true } });
    if (prior) return { status: "NOOP" as const, linkId: prior.id };
    const link = await tx.overtonActorLink.create({ data: { ...identity,
      evidence: (input.evidence as unknown as Prisma.InputJsonValue) ?? undefined,
    }, select: { id: true } });
    return { status: "OK" as const, linkId: link.id };
  }, { isolationLevel: "Serializable" });
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
    select: { position: { select: { id: true, statement: true, zone: true, evidence: true, countryCode: true } } },
  });
  const heldPositions = links.map(({ position }) => {
    const envelope = readOvertonEvidence(position.evidence);
    const zone = position.zone && envelope.concept && qualifyingOvertonEvidence(envelope.items,
      position.zone as OvertonZone, envelope.concept.audience, position.countryCode).length
      ? position.zone as OvertonZone : null;
    return { id: position.id, statement: position.statement, zone };
  });

  const transitions = await client.overtonZoneTransition.findMany({
    where: { attributedActorKind: "BRAND", attributedActorRef: strategyId },
    select: { positionId: true, fromZone: true, toZone: true, occurredAt: true, evidence: true, position: { select: { evidence: true, countryCode: true } } },
  });
  const favorableTransitions: OvertonBrandSignals["favorableTransitions"] = [];
  const adverseTransitions: OvertonBrandSignals["adverseTransitions"] = [];
  for (const t of transitions) {
    const concept = readOvertonEvidence(t.position.evidence).concept;
    if (!concept || !qualifyingOvertonEvidence(readOvertonEvidence(t.evidence).items, t.toZone as OvertonZone,
      concept.audience, t.position.countryCode, Math.min(t.occurredAt.getTime(), Date.now())).length) continue;
    // A brand can seek rejection of a practice: success is movement toward its
    // explicit target, not automatically movement toward institutionalisation.
    if (!t.fromZone || !concept.targetZone || !qualifyingOvertonEvidence(
      readOvertonEvidence(t.position.evidence).items, t.fromZone as OvertonZone,
      concept.audience, t.position.countryCode, t.occurredAt.getTime()).length) continue;
    const delta = Math.abs(zoneDelta(t.fromZone as OvertonZone, concept.targetZone))
      - Math.abs(zoneDelta(t.toZone as OvertonZone, concept.targetZone));
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

/** Read-only projection: exact ADVE concept/public/polity, never a baseline promoted to a measurement. */
export async function readBrandOvertonPositioning(client: Pick<Prisma.TransactionClient, "overtonPosition">,
  strategyId: string, pillars: Parameters<typeof readOvertonPositioning>[0], countryCode: string | null, marketScale: import("@/domain/market-scale").MarketScale | null = null,
): Promise<OvertonPositioning> {
  const readout = readOvertonPositioning(pillars);
  const rows = await client.overtonPosition.findMany({ where: { strategyId, countryCode, marketScale }, orderBy: { updatedAt: "desc" },
    select: { id: true, zone: true, statement: true, evidence: true, countryCode: true } });
  for (const item of readout.positions) {
    for (const row of rows) {
      const evidence = readOvertonEvidence(row.evidence);
      if ((item.countryCode && item.countryCode !== countryCode) || row.statement !== item.statement || !row.zone || evidence.concept?.key !== item.id || evidence.concept.audience !== item.audience || evidence.concept.kind !== item.kind) continue;
      const proof = qualifyingOvertonEvidence(evidence.items, row.zone as OvertonZone, item.audience, countryCode);
      if (!proof.length) continue;
      item.observation = { zone: row.zone as OvertonZone, positionId: row.id,
        observedAt: latestEvidenceAt(proof)!.toISOString(), sources: [...new Set(proof.map(p => p.source))] };
      break;
    }
  }
  return readout;
}
