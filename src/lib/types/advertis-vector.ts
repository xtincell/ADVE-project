import { z } from "zod";

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

export const PILLAR_KEYS = ["a", "d", "v", "e", "r", "t", "i", "s"] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

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

export function classifyBrand(composite: number): BrandClassification {
  if (composite <= 80) return "ZOMBIE";
  if (composite <= 120) return "ORDINAIRE";
  if (composite <= 160) return "FORTE";
  if (composite <= 180) return "CULTE";
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
