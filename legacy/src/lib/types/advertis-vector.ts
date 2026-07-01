/**
 * Legacy lowercase pillar surface — kept for the AdvertisVector numeric type
 * and the ~86 callsites that consume PillarKey lowercase.
 *
 * NEW code should import the canonical (uppercase) keys from `@/domain` directly.
 * This file is a compat shim and will be reduced over Phase 1+ of the refonte.
 */
import { z } from "zod";
import { PILLAR_STORAGE_KEYS, ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS, type BrandTier, classifyTier } from "@/domain";

export const AdvertisVectorSchema = z.object({
  a: z.number().min(0).max(25),  // Authenticité
  d: z.number().min(0).max(25),  // Distinction
  v: z.number().min(0).max(25),  // Valeur
  e: z.number().min(0).max(25),  // Engagement
  r: z.number().min(0).max(25),  // Risk
  t: z.number().min(0).max(25),  // Track
  i: z.number().min(0).max(25),  // Innovation (potentiel total de la marque)
  s: z.number().min(0).max(25),  // Strategy (roadmap qui pioche dans I → superfan)
  composite: z.number().min(0).max(200),
  confidence: z.number().min(0).max(1),
});

export type AdvertisVector = z.infer<typeof AdvertisVectorSchema>;

/**
 * @deprecated Use `BrandTier` from `@/domain`. Kept as an alias so the ~40
 * callsites that import `BrandClassification` keep compiling. The canonical
 * ladder is 6 tiers (LATENT…ICONE) — see `@/domain/brand-tier`.
 */
export type BrandClassification = BrandTier;

/** @deprecated Use `PILLAR_STORAGE_KEYS` from `@/domain` (or canonical `PILLAR_KEYS`). */
export const PILLAR_KEYS = PILLAR_STORAGE_KEYS;
/** @deprecated Use `PillarStorageKey` from `@/domain` (or canonical `PillarKey`). */
export type PillarKey = (typeof PILLAR_STORAGE_KEYS)[number];

export const PILLAR_NAMES: Record<PillarKey, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
  r: "Risk",
  t: "Track",
  i: "Innovation",
  s: "Strategy",
};

/**
 * Cascade order = ADVERTIS narrative. A → D → V → E → R → T → I → S.
 *
 * **Mais la dépendance staleness n'est PAS linéaire flat.** Modèle canonique
 * (NEFER §0.3 + ADR-0023 anti-drift) :
 *
 * - **ADVE = SOCLE FONDATEUR INDÉPENDANT.** Authenticité, Distinction, Valeur,
 *   Engagement sont 4 grounds parallèles. Modifier A ne marque PAS D, V, E
 *   stale (chacun adresse un axe distinct de l'identité). Le drift précédent
 *   (`PILLAR_KEYS.slice(idx + 1)`) traitait ADVE comme cascade linéaire et
 *   flippait E à "MAJ RECOMMANDÉE" dès qu'A bougeait — viole "ADVE mute
 *   uniquement sous action utilisateur explicite".
 *
 * - **ADVE → RTIS.** Tout pilier ADVE muté marque les 4 piliers RTIS stale,
 *   parce que R, T, I, S dérivent du socle complet (R = analyse(ADVE),
 *   T = analyse(ADVE+R), etc.).
 *
 * - **RTIS interne = cascade linéaire.** R → [T, I, S], T → [I, S], I → [S],
 *   S → []. Chaque pilier RTIS consomme strictement les RTIS précédents.
 */
export const PILLAR_CASCADE_ORDER = PILLAR_KEYS;

// Re-projection locale (lowercase) pour la cascade staleness — la source
// canonique des keys vit dans `@/domain` (`ADVE_STORAGE_KEYS`,
// `RTIS_STORAGE_KEYS`). Les Records ci-dessous encodent UNIQUEMENT la
// topologie de cascade RTIS interne (sequencement R→T→I→S).
type AdveLower = (typeof ADVE_STORAGE_KEYS)[number];
type RtisLower = (typeof RTIS_STORAGE_KEYS)[number];

const RTIS_DEPENDENTS: Record<RtisLower, readonly RtisLower[]> = {
  r: ["t", "i", "s"],
  t: ["i", "s"],
  i: ["s"],
  s: [],
};

const RTIS_DEPENDENCIES_OF: Record<RtisLower, readonly RtisLower[]> = {
  r: [],
  t: ["r"],
  i: ["r", "t"],
  s: ["r", "t", "i"],
};

function isAdve(k: string): k is AdveLower {
  return (ADVE_STORAGE_KEYS as readonly string[]).includes(k);
}

function isRtis(k: string): k is RtisLower {
  return (RTIS_STORAGE_KEYS as readonly string[]).includes(k);
}

/**
 * Piliers en amont d'un pilier donné — qui le rendent stale s'ils bougent.
 *
 * - ADVE : aucune dépendance amont (socle fondateur indépendant).
 * - RTIS : ADVE complet + RTIS antérieurs en cascade.
 */
export function getPillarDependencies(key: PillarKey): PillarKey[] {
  const k = key.toLowerCase();
  if (isAdve(k)) return [];
  if (isRtis(k)) {
    return [...ADVE_STORAGE_KEYS, ...RTIS_DEPENDENCIES_OF[k]] as unknown as PillarKey[];
  }
  return [];
}

/**
 * Piliers en aval — qui deviennent stale quand le pilier donné mute.
 *
 * - ADVE : marque tous les RTIS stale (R, T, I, S sont dérivés du socle).
 * - RTIS : cascade interne linéaire (R→T,I,S ; T→I,S ; I→S ; S→aucun).
 *
 * Inversion volontaire du `slice(idx + 1)` legacy qui incluait les ADVE
 * suivants dans la cascade et propageait le drift "modifier A flippe E".
 */
export function getPillarDependents(key: PillarKey): PillarKey[] {
  const k = key.toLowerCase();
  if (isAdve(k)) return [...RTIS_STORAGE_KEYS] as unknown as PillarKey[];
  if (isRtis(k)) return [...RTIS_DEPENDENTS[k]] as unknown as PillarKey[];
  return [];
}

/**
 * Classify a brand based on its composite score.
 *
 * Thin delegate to the canonical `classifyTier` (`@/domain/brand-tier`) — the
 * single source of truth for the 6-tier ladder. Kept here for backward compat
 * with the ~40 callsites importing `classifyBrand`.
 *
 *   /200: LATENT ≤40, FRAGILE ≤80, ORDINAIRE ≤120, FORTE ≤160, CULTE ≤180, ICONE >180
 */
export function classifyBrand(composite: number, maxScore = 200): BrandClassification {
  return classifyTier(composite, maxScore);
}

export function createEmptyVector(): AdvertisVector {
  return { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0, composite: 0, confidence: 0 };
}

export function sumPillars(vector: AdvertisVector): number {
  return vector.a + vector.d + vector.v + vector.e + vector.r + vector.t + vector.i + vector.s;
}

export function validateVector(vector: AdvertisVector): boolean {
  const result = AdvertisVectorSchema.safeParse(vector);
  if (!result.success) return false;
  return Math.abs(sumPillars(vector) - vector.composite) < 0.01;
}

/**
 * Sanitize an `AdvertisVector` loaded from DB. Source-of-truth fix for the
 * dirty pillar scores observed on Makrea (mai 2026, ADR-0045 audit) :
 * `Distinction = 27.33`, `Strategy = 25.93` — au-dessus du cap schema /25.
 *
 * `AdvertisVectorSchema` (Zod `.max(25)` per pillar, `.max(200)` composite)
 * protège les writes mais le load path historiquement trust la DB telle quelle.
 * Ce helper interpose un safeParse + clamp défensif sur le path read.
 *
 * Strategy :
 * - Si `safeParse` succeeds → return as-is (chemin chaud, zéro coût).
 * - Si fail → clamp tous les piliers à `[0, 25]`, composite à `[0, 200]`,
 *   confidence à `[0, 1]`. Log warning structuré avec liste des champs
 *   violés (pour observabilité Seshat / triage error-vault). Ne throw PAS —
 *   l'UI doit rester rendue même si la DB contient du legacy dirty.
 *
 * Le source-fix amont (gateway de write qui empêche les writes invalides) reste
 * en open work — actuellement Zod validation côté create/update mais des chemins
 * écrits avant Phase 17 contournent. Ce helper est defense-in-depth permanente.
 */
export function sanitizeVector(
  rawVector: unknown,
  context?: { strategyId?: string },
): { vector: AdvertisVector; sanitized: boolean; violations: string[] } {
  const parsed = AdvertisVectorSchema.safeParse(rawVector);
  if (parsed.success) {
    return { vector: parsed.data, sanitized: false, violations: [] };
  }

  // Build a defensive vector from the raw input, clamping out-of-range numbers.
  const r = (rawVector ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback = 0): number =>
    typeof v === "number" && !isNaN(v) && isFinite(v) ? v : fallback;
  const clamp = (v: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, v));

  const sanitized: AdvertisVector = {
    a: clamp(num(r.a), 0, 25),
    d: clamp(num(r.d), 0, 25),
    v: clamp(num(r.v), 0, 25),
    e: clamp(num(r.e), 0, 25),
    r: clamp(num(r.r), 0, 25),
    t: clamp(num(r.t), 0, 25),
    i: clamp(num(r.i), 0, 25),
    s: clamp(num(r.s), 0, 25),
    composite: clamp(num(r.composite), 0, 200),
    confidence: clamp(num(r.confidence), 0, 1),
  };

  const violations = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[sanitizeVector] dirty AdvertisVector clamped${
        context?.strategyId ? ` (strategy=${context.strategyId})` : ""
      }: ${violations.join(" | ")}`,
    );
  }

  return { vector: sanitized, sanitized: true, violations };
}
