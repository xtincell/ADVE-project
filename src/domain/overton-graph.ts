/**
 * ADR-0148 — Overton Graph : cœur déterministe (Layer 0, pur, zéro-LLM zéro-IO).
 *
 * La fenêtre d'Overton ne se mesure JAMAIS directement — c'est une déflexion. On
 * trace des POSITIONS qui migrent entre 6 zones d'acceptabilité, par polity, et on
 * ATTRIBUE les migrations (même méca last-touch qu'ADR-0135). Signal clé pour
 * l'arène T du scoreur (ADR-0149) : l'adoption de vocabulaire (comptage
 * déterministe de tokens — le dialecte de la marque remplace-t-il celui de
 * l'incumbent dans les flux datés ?).
 */

import { z } from "zod";
import { MarketScaleSchema } from "./market-scale";

// ───────────────────────────────────────────────────────────── zones & acteurs

/** Du plus rejeté au plus institué. L'index CROÎT vers la norme. */
export const OVERTON_ZONES = [
  "UNTHINKABLE",
  "RADICAL",
  "ACCEPTABLE",
  "SENSIBLE",
  "POPULAR",
  "POLICY",
] as const;
export type OvertonZone = (typeof OVERTON_ZONES)[number];
export const OvertonZoneSchema = z.enum(OVERTON_ZONES);

export function zoneIndex(z: OvertonZone): number {
  return OVERTON_ZONES.indexOf(z);
}

/** Δ de zone : > 0 = la position a migré vers l'institué (fenêtre déplacée). */
export function zoneDelta(from: OvertonZone | null, to: OvertonZone): number {
  if (from == null) return 0;
  return zoneIndex(to) - zoneIndex(from);
}

export const OVERTON_ACTOR_KINDS = [
  "BRAND",
  "COMPETITOR",
  "SUPERFAN",
  "INSTITUTION",
  "MEDIA",
] as const;
export type OvertonActorKind = (typeof OVERTON_ACTOR_KINDS)[number];
export const OvertonActorKindSchema = z.enum(OVERTON_ACTOR_KINDS);

export const OVERTON_EDGE_KINDS = [
  "HOLDS",
  "PROPAGATES",
  "OPPOSES",
  "SHIFTS_TOWARD",
] as const;
export type OvertonEdgeKind = (typeof OVERTON_EDGE_KINDS)[number];
export const OvertonEdgeKindSchema = z.enum(OVERTON_EDGE_KINDS);

// ───────────────────────────────────────────────────────────── vocab adoption

/** Tokenisation déterministe : minuscules, mots (unicode letters+digits), ≥ 2 car. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
}

/** Compte les occurrences des termes du lexique (multi-mots supportés) dans un texte. */
export function countLexiconHits(text: string, lexicon: readonly string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const term of lexicon) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    // Comptage non-chevauchant du terme (mot ou expression).
    let idx = 0;
    for (;;) {
      const found = lower.indexOf(t, idx);
      if (found < 0) break;
      hits++;
      idx = found + t.length;
    }
  }
  return hits;
}

export interface VocabAdoption {
  brandHits: number;
  incumbentHits: number;
  /** Part du lexique marque sur le total mesuré (0-1) ; null si rien de mesuré. */
  adoptionShare: number | null;
  /** WIN si le lexique marque domine, LOSS si l'incumbent domine, DRAW si égal. */
  verdict: "WIN" | "LOSS" | "DRAW" | "ABSENT";
  corpusSize: number;
}

/**
 * Duel de cadre déterministe : le dialecte de la marque remplace-t-il celui de
 * l'incumbent dans un corpus daté ? Aucune fabrication — corpus vide = ABSENT
 * (RD large en aval), jamais un faux 0.
 */
export function vocabularyAdoption(
  brandLexicon: readonly string[],
  incumbentLexicon: readonly string[],
  corpus: readonly string[],
): VocabAdoption {
  if (corpus.length === 0 || (brandLexicon.length === 0 && incumbentLexicon.length === 0)) {
    return { brandHits: 0, incumbentHits: 0, adoptionShare: null, verdict: "ABSENT", corpusSize: corpus.length };
  }
  let brandHits = 0;
  let incumbentHits = 0;
  for (const text of corpus) {
    brandHits += countLexiconHits(text, brandLexicon);
    incumbentHits += countLexiconHits(text, incumbentLexicon);
  }
  const total = brandHits + incumbentHits;
  if (total === 0) {
    return { brandHits, incumbentHits, adoptionShare: null, verdict: "ABSENT", corpusSize: corpus.length };
  }
  const adoptionShare = brandHits / total;
  const verdict = brandHits > incumbentHits ? "WIN" : brandHits < incumbentHits ? "LOSS" : "DRAW";
  return { brandHits, incumbentHits, adoptionShare, verdict, corpusSize: corpus.length };
}

// ───────────────────────────────────────────────────────────── attribution

export interface DatedAction {
  readonly ref: string;
  readonly actorKind: OvertonActorKind;
  readonly occurredAt: Date;
}

export interface LastTouchOpts {
  readonly recallDays?: number; // fenêtre de rappel avant l'observation
  readonly graceDays?: number; // latence d'effet minimale
}

/**
 * Attribution « last-touch dans la fenêtre » (méca ADR-0135) : parmi les actions
 * datées AVANT la transition, prend la plus récente qui tombe dans
 * [transition − recallDays, transition − 0] avec au moins `graceDays` de latence.
 * Renvoie null si aucune (absence honnête — la transition reste non attribuée).
 */
export function attributeLastTouch(
  transitionAt: Date,
  actions: readonly DatedAction[],
  opts: LastTouchOpts = {},
): DatedAction | null {
  const recallDays = opts.recallDays ?? 45;
  const graceDays = opts.graceDays ?? 14;
  const t = transitionAt.getTime();
  const dayMs = 86_400_000;
  const windowStart = t - recallDays * dayMs;
  const latestAllowed = t - graceDays * dayMs;
  let best: DatedAction | null = null;
  for (const a of actions) {
    const at = a.occurredAt.getTime();
    if (at < windowStart || at > latestAllowed) continue;
    if (best == null || at > best.occurredAt.getTime()) best = a;
  }
  return best;
}

// ───────────────────────────────────────────────────────────── zod payloads

const polityShape = {
  sectorSlug: z.string().min(1),
  marketScale: MarketScaleSchema.nullish(),
  countryCode: z.string().max(2).nullish(),
};

export const upsertOvertonPositionInputSchema = z.object({
  strategyId: z.string().nullish(),
  ...polityShape,
  statement: z.string().min(1),
  /** null = pas de preuve (jamais fabriquée). */
  zone: OvertonZoneSchema.nullish(),
  evidence: z.array(z.object({ source: z.string(), at: z.string().optional(), note: z.string().optional() })).default([]),
});
export type UpsertOvertonPositionInput = z.infer<typeof upsertOvertonPositionInputSchema>;

export const recordZoneTransitionInputSchema = z.object({
  positionId: z.string().min(1),
  fromZone: OvertonZoneSchema.nullish(),
  toZone: OvertonZoneSchema,
  occurredAt: z.string(), // ISO
  evidence: z.array(z.object({ source: z.string(), at: z.string().optional() })).default([]),
  attributedActorKind: OvertonActorKindSchema.nullish(),
  attributedActorRef: z.string().nullish(),
});
export type RecordZoneTransitionInput = z.infer<typeof recordZoneTransitionInputSchema>;

export const linkActorToPositionInputSchema = z.object({
  positionId: z.string().min(1),
  actorKind: OvertonActorKindSchema,
  actorRef: z.string().nullish(),
  edgeKind: OvertonEdgeKindSchema,
  datedAt: z.string().nullish(),
  evidence: z.record(z.string(), z.unknown()).nullish(),
});
export type LinkActorToPositionInput = z.infer<typeof linkActorToPositionInputSchema>;
