/**
 * PILLAR FIELD NAMING — convention `<lettre>_<champ>` (decision Alexandre, 2026-06).
 *
 * But : aligner la convention de nommage de TOUS les piliers sur le format
 * `pillar+letter+underscore+name` (ex: `noyauIdentitaire` -> `a_noyauIdentitaire`),
 * comme les `id` du question-bank (`biz_model`, `a_*`). Deux usages :
 *
 *   1. **Normalisation interne** (phase A, en cours) — la carte deterministe
 *      `PILLAR_FIELD_PREFIX_MAP` (canonique -> prefixe) pilote le codemod des
 *      consommateurs + la migration de donnees, pillier par pillier.
 *   2. **Projection plate externe** (directive #3 Odoo/PowerBI) — `flattenStrategy`
 *      aplatit les 8 blobs piliers `{a:{content},...}` en UN objet a cles plates
 *      prefixees `{a_noyauIdentitaire, e_touchpoints, ...}`. Le prefixe desambigue
 *      les champs homonymes entre piliers (ex: `hierarchieCommunautaire` existe en
 *      A ET en E -> `a_hierarchieCommunautaire` vs `e_hierarchieCommunautaire`).
 *      C'est exactement la raison d'etre du prefixe pour l'exposition externe.
 *
 * La carte (1) est ancree sur les **schemas Zod** (`pillar-schemas.ts`), source de
 * verite du stockage — pas sur le field-registry (sous-ensemble editeur) ni la
 * variable-bible. Les helpers de projection (2) sont **mecaniques** : ils prefixent
 * TOUTE cle de premier niveau (y compris les champs RTIS ad-hoc hors-schema comme
 * `catalogueParCanal`), donc zero perte de donnee a l'aplatissement.
 */

import {
  PillarASchema, PillarDSchema, PillarVSchema, PillarESchema,
  PillarRSchema, PillarTSchema, PillarISchema, PillarSSchema,
} from "./pillar-schemas";

const SCHEMAS = {
  a: PillarASchema, d: PillarDSchema, v: PillarVSchema, e: PillarESchema,
  r: PillarRSchema, t: PillarTSchema, i: PillarISchema, s: PillarSSchema,
} as const;

/**
 * Clés de stockage lowercase des piliers (`a`..`s`) — ce sont les VRAIES clés de
 * `SCHEMAS` et du `Pillar.key` en base. NB : `domain/pillars` PILLAR_KEYS est en
 * MAJUSCULES (A..S) ; ces cartes sont indexées en minuscules (runtime), donc on
 * type sur `keyof typeof SCHEMAS` pour que le type colle au runtime.
 */
type PillarStorageKey = keyof typeof SCHEMAS;

/**
 * Cles de premier niveau d'un schema pilier. Gere ZodObject (`.shape`) et
 * ZodEffects (schema `.refine()`/`.superRefine()` -> `._def.schema.shape`).
 */
function topLevelKeys(schema: unknown): string[] {
  const s = schema as { shape?: Record<string, unknown>; _def?: { schema?: { shape?: Record<string, unknown> } } };
  const shape = s.shape ?? s._def?.schema?.shape;
  return shape ? Object.keys(shape) : [];
}

/** Champs canoniques de premier niveau, par pilier (depuis les schemas Zod). */
export const PILLAR_TOPLEVEL_FIELDS: Record<PillarStorageKey, readonly string[]> = Object.fromEntries(
  (Object.keys(SCHEMAS) as PillarStorageKey[]).map((k) => [k, topLevelKeys(SCHEMAS[k])]),
) as unknown as Record<PillarStorageKey, readonly string[]>;

/** Prefixe canonique d'un champ : `noyauIdentitaire` -> `a_noyauIdentitaire`. */
export function prefixField(pillarKey: string, fieldName: string): string {
  const pre = `${pillarKey}_`;
  return fieldName.startsWith(pre) ? fieldName : `${pillarKey}${"_"}${fieldName}`;
}

/** Retire le prefixe : `a_noyauIdentitaire` -> `noyauIdentitaire` (no-op si absent). */
export function unprefixField(pillarKey: string, fieldName: string): string {
  const pre = `${pillarKey}_`;
  return fieldName.startsWith(pre) ? fieldName.slice(pre.length) : fieldName;
}

/**
 * Carte deterministe canonique -> prefixe, par pilier, ancree sur les schemas Zod.
 * Pilote le codemod des consommateurs et la migration de donnees (phase A).
 * Ex: `PILLAR_FIELD_PREFIX_MAP.a.noyauIdentitaire === "a_noyauIdentitaire"`.
 */
export const PILLAR_FIELD_PREFIX_MAP: Record<PillarStorageKey, Record<string, string>> = Object.fromEntries(
  (Object.keys(SCHEMAS) as PillarStorageKey[]).map((k) => [
    k,
    Object.fromEntries(PILLAR_TOPLEVEL_FIELDS[k].map((f) => [f, prefixField(k, f)])),
  ]),
) as Record<PillarStorageKey, Record<string, string>>;

/** Carte inverse prefixe -> canonique, par pilier. */
export const PILLAR_FIELD_UNPREFIX_MAP: Record<PillarStorageKey, Record<string, string>> = Object.fromEntries(
  (Object.keys(PILLAR_FIELD_PREFIX_MAP) as PillarStorageKey[]).map((k) => [
    k,
    Object.fromEntries(Object.entries(PILLAR_FIELD_PREFIX_MAP[k]).map(([canon, pre]) => [pre, canon])),
  ]),
) as Record<PillarStorageKey, Record<string, string>>;

/**
 * MECANIQUE : aplatit le `content` d'UN pilier en prefixant TOUTE cle de premier
 * niveau par `<key>_`. Idempotent (ne double-prefixe pas). Couvre les champs
 * hors-schema (RTIS ad-hoc) -> aucune perte.
 */
export function flattenPillarContent(
  pillarKey: string,
  content: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!content || typeof content !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) out[prefixField(pillarKey, k)] = v;
  return out;
}

/** Inverse de `flattenPillarContent` pour UN pilier : ne garde que ses cles `<key>_*`. */
export function unflattenPillarContent(
  pillarKey: string,
  flat: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!flat || typeof flat !== "object") return {};
  const pre = `${pillarKey}_`;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (k.startsWith(pre)) out[k.slice(pre.length)] = v;
  }
  return out;
}

/**
 * Projection plate d'une strategie complete (directive #3 Odoo/PowerBI) :
 * `{ a: {content}, e: {content}, ... }` -> `{ a_noyauIdentitaire, e_touchpoints, ... }`.
 * Le prefixe desambigue les homonymes inter-piliers.
 */
export function flattenStrategy(
  pillars: Partial<Record<string, Record<string, unknown> | null | undefined>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, content] of Object.entries(pillars)) {
    Object.assign(out, flattenPillarContent(key, content));
  }
  return out;
}

/** Inverse : `{ a_x, e_y, ... }` -> `{ a: {x}, e: {y}, ... }` (regroupe par prefixe pilier). */
export function unflattenStrategy(
  flat: Record<string, unknown> | null | undefined,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  if (!flat || typeof flat !== "object") return out;
  for (const [k, v] of Object.entries(flat)) {
    const us = k.indexOf("_");
    if (us <= 0) continue;
    const key = k.slice(0, us);
    const field = k.slice(us + 1);
    (out[key] ??= {})[field] = v;
  }
  return out;
}
