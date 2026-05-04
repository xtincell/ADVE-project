/**
 * Legacy lowercase pillar surface — kept for the AdvertisVector numeric type
 * and the ~86 callsites that consume PillarKey lowercase.
 *
 * NEW code should import the canonical (uppercase) keys from `@/domain` directly.
 * This file is a compat shim and will be reduced over Phase 1+ of the refonte.
 */
import { z } from "zod";
import { PILLAR_STORAGE_KEYS } from "@/domain";

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

export type BrandClassification = "ZOMBIE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

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
 * Cascade order = ADVERTIS. Each pillar feeds the next.
 * A → D → V → E → R → T → I → S
 *
 * ADVE = fondation du culte (saisie humaine)
 * R = diagnostic des risques (analyse ADVE)
 * T = confrontation à la réalité (ADVE + R)
 * I = potentiel total de la marque (ADVE + R + T)
 * S = roadmap stratégique qui pioche dans I (ADVE + R + T + I) → superfan
 */
export const PILLAR_CASCADE_ORDER = PILLAR_KEYS;

/** Pillar N depends on all pillars before it in ADVERTIS order */
export function getPillarDependencies(key: PillarKey): PillarKey[] {
  const idx = PILLAR_KEYS.indexOf(key);
  return idx <= 0 ? [] : PILLAR_KEYS.slice(0, idx) as unknown as PillarKey[];
}

/** Pillar N feeds all pillars after it in ADVERTIS order */
export function getPillarDependents(key: PillarKey): PillarKey[] {
  const idx = PILLAR_KEYS.indexOf(key);
  return idx < 0 ? [] : PILLAR_KEYS.slice(idx + 1) as unknown as PillarKey[];
}

/**
 * Classify a brand based on its composite score.
 * Thresholds are defined on a /200 scale; pass maxScore to normalise from other scales.
 *   /200: ZOMBIE ≤80, ORDINAIRE ≤120, FORTE ≤160, CULTE ≤180, ICONE >180
 *   /100: ZOMBIE ≤40, ORDINAIRE ≤60,  FORTE ≤80,  CULTE ≤90,  ICONE >90
 */
export function classifyBrand(composite: number, maxScore = 200): BrandClassification {
  // Normalise to /200 so thresholds are consistent
  const normalised = maxScore === 200 ? composite : (composite / maxScore) * 200;
  if (normalised <= 80) return "ZOMBIE";
  if (normalised <= 120) return "ORDINAIRE";
  if (normalised <= 160) return "FORTE";
  if (normalised <= 180) return "CULTE";
  return "ICONE";
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
