/**
 * src/domain/pillars.ts — Single source of truth for ADVERTIS pillars.
 *
 * Layer 0 (domain). Pure module. NO Prisma, NO tRPC, NO NextAuth, NO LLM, NO React.
 * Imports allowed: zod only.
 *
 * Two surface forms exist for historical reasons:
 *   - Canonical (uppercase): "A","D","V","E","R","T","I","S" — used in Zod
 *     enums, IntentLog audit, public API surface, manifests.
 *   - Storage (lowercase):   "a","d","v","e","r","t","i","s" — used in DB
 *     `Pillar.key`, `AdvertisVector` numeric fields, legacy advertis-vector.
 *
 * Rule: NEW code uses canonical (uppercase). Storage form is a serialisation
 * detail and should only appear inside DB adapters and the legacy
 * advertis-vector module (which now re-exports from here for compat).
 */

import { z } from "zod";

// ── Canonical keys ────────────────────────────────────────────────────

export const ADVE_KEYS = ["A", "D", "V", "E"] as const;
export const RTIS_KEYS = ["R", "T", "I", "S"] as const;
export const PILLAR_KEYS = [...ADVE_KEYS, ...RTIS_KEYS] as const;

export type AdveKey = (typeof ADVE_KEYS)[number];
export type RtisKey = (typeof RTIS_KEYS)[number];
export type PillarKey = (typeof PILLAR_KEYS)[number];

// ── Storage form (lowercase — DB column `Pillar.key`, legacy vector) ──

export const ADVE_STORAGE_KEYS = ["a", "d", "v", "e"] as const;
export const RTIS_STORAGE_KEYS = ["r", "t", "i", "s"] as const;
export const PILLAR_STORAGE_KEYS = [
  ...ADVE_STORAGE_KEYS,
  ...RTIS_STORAGE_KEYS,
] as const;

export type AdveStorageKey = (typeof ADVE_STORAGE_KEYS)[number];
export type RtisStorageKey = (typeof RTIS_STORAGE_KEYS)[number];
export type PillarStorageKey = (typeof PILLAR_STORAGE_KEYS)[number];

// ── Zod schemas ───────────────────────────────────────────────────────

export const PillarKeySchema = z.enum(PILLAR_KEYS);
export const AdveKeySchema = z.enum(ADVE_KEYS);
export const RtisKeySchema = z.enum(RTIS_KEYS);
export const PillarStorageKeySchema = z.enum(PILLAR_STORAGE_KEYS);

// ── Phase semantics ───────────────────────────────────────────────────

export type PillarPhase = "ADVE" | "RTIS";

// ── Metadata (label + cascade order + storage round-trip) ─────────────

export interface PillarMetadata {
  /** Canonical uppercase key. */
  readonly key: PillarKey;
  /** Lowercase form used in DB and legacy vector type. */
  readonly storageKey: PillarStorageKey;
  /** Cascade phase. */
  readonly phase: PillarPhase;
  /** 0-indexed position in cascade A→D→V→E→R→T→I→S. */
  readonly order: number;
  /** Display label (FR). */
  readonly label: string;
  /** One-line semantic blurb (FR). */
  readonly blurb: string;
}

export const PILLAR_METADATA: Readonly<Record<PillarKey, PillarMetadata>> = {
  A: {
    key: "A",
    storageKey: "a",
    phase: "ADVE",
    order: 0,
    label: "Authenticité",
    blurb: "Fondation du culte — qui est la marque, vraiment.",
  },
  D: {
    key: "D",
    storageKey: "d",
    phase: "ADVE",
    order: 1,
    label: "Distinction",
    blurb: "Ce qui différencie radicalement de la concurrence.",
  },
  V: {
    key: "V",
    storageKey: "v",
    phase: "ADVE",
    order: 2,
    label: "Valeur",
    blurb: "Promesse économique et fonctionnelle livrée.",
  },
  E: {
    key: "E",
    storageKey: "e",
    phase: "ADVE",
    order: 3,
    label: "Engagement",
    blurb: "Mécaniques relationnelles qui fidélisent.",
  },
  R: {
    key: "R",
    storageKey: "r",
    phase: "RTIS",
    order: 4,
    label: "Risk",
    blurb: "Diagnostic des risques sur ADVE.",
  },
  T: {
    key: "T",
    storageKey: "t",
    phase: "RTIS",
    order: 5,
    label: "Track",
    blurb: "Confrontation de ADVE+R à la réalité du marché.",
  },
  I: {
    key: "I",
    storageKey: "i",
    phase: "RTIS",
    order: 6,
    label: "Innovation",
    blurb: "Potentiel total de la marque, alimenté par ADVE+R+T.",
  },
  S: {
    key: "S",
    storageKey: "s",
    phase: "RTIS",
    order: 7,
    label: "Strategy",
    blurb: "Roadmap qui pioche dans I → superfan.",
  },
};

// ── Helpers (pure) ────────────────────────────────────────────────────

export const isAdve = (k: PillarKey): k is AdveKey =>
  (ADVE_KEYS as readonly string[]).includes(k);

export const isRtis = (k: PillarKey): k is RtisKey =>
  (RTIS_KEYS as readonly string[]).includes(k);

export const toCanonical = (k: PillarStorageKey | PillarKey): PillarKey =>
  k.toUpperCase() as PillarKey;

export const toStorage = (k: PillarKey | PillarStorageKey): PillarStorageKey =>
  k.toLowerCase() as PillarStorageKey;

/** Pillars that the given pillar depends on (everything strictly before it). */
export const pillarDependencies = (k: PillarKey): readonly PillarKey[] =>
  PILLAR_KEYS.slice(0, PILLAR_METADATA[k].order);

/** Pillars that depend on the given pillar (everything strictly after it). */
export const pillarDependents = (k: PillarKey): readonly PillarKey[] =>
  PILLAR_KEYS.slice(PILLAR_METADATA[k].order + 1);
