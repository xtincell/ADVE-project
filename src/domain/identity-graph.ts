/**
 * ADR-0145 — Identity Graph : cœur déterministe (Layer 0, pur, zéro-LLM, zéro-IO).
 *
 * Réconcilie une personne à travers ses réseaux/identifiants. Ce module ne fait
 * QUE de la logique pure : normalisation des identifiants et échelle de précédence
 * de fusion. Le hashing PII, le chiffrement et la persistance vivent dans le
 * service `server/services/seshat/identity-graph/` (single-writer gouverné).
 *
 * Invariants (brief §3 · D12) :
 *  - Fusion AUTO uniquement sur identifiant fort partagé (email/tel) VERIFIED/DECLARED.
 *  - Signal faible (handle/nom) → CANDIDATE à revue, JAMAIS de fusion auto.
 *  - Deux identifiants forts vérifiés mais différents → CONFLICT (drapeau, pas de merge).
 */

import { z } from "zod";

// ───────────────────────────────────────────────────────────── kinds & confiance

export const IDENTIFIER_KINDS = [
  "EMAIL",
  "PHONE",
  "HANDLE",
  "EXTERNAL_ID",
  "DEVICE",
] as const;
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];
export const IdentifierKindSchema = z.enum(IDENTIFIER_KINDS);

export const IDENTIFIER_SOURCES = [
  "MANUAL",
  "CONNECTOR",
  "CRM",
  "COMMERCE",
  "IMPORT",
] as const;
export type IdentifierSource = (typeof IDENTIFIER_SOURCES)[number];
export const IdentifierSourceSchema = z.enum(IDENTIFIER_SOURCES);

/** DECLARED (humain relie) > VERIFIED (identifiant fort partagé) > INFERRED (signal faible). */
export const CONFIDENCE_LEVELS = ["DECLARED", "VERIFIED", "INFERRED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  DECLARED: 3,
  VERIFIED: 2,
  INFERRED: 1,
};

/** Un identifiant "fort" prouve la même personne quand il est partagé + vérifié. */
const STRONG_KINDS: ReadonlySet<IdentifierKind> = new Set<IdentifierKind>([
  "EMAIL",
  "PHONE",
  "EXTERNAL_ID",
]);

export function isStrongKind(kind: IdentifierKind): boolean {
  return STRONG_KINDS.has(kind);
}

export function confidenceRank(c: ConfidenceLevel): number {
  return CONFIDENCE_RANK[c];
}

/** Précédence : renvoie la confiance la plus haute entre deux. */
export function strongerConfidence(
  a: ConfidenceLevel,
  b: ConfidenceLevel,
): ConfidenceLevel {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}

// ───────────────────────────────────────────────────────────── normalisation

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Email : minuscules, trim. Pour Gmail : points neutralisés dans le local-part +
 * plus-addressing supprimé (steph.b+promo@gmail.com ≡ stephb@gmail.com).
 * Renvoie null si structurellement invalide (pas de `@`).
 */
export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".")) return null;
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) local = local.replace(/\./g, "");
  if (!local) return null;
  return `${local}@${domain}`;
}

/**
 * Téléphone → E.164 best-effort : garde un `+` de tête si présent, ne conserve que
 * les chiffres. Renvoie null si < 6 chiffres (bruit).
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 6) return null;
  return (hasPlus ? "+" : "") + digits;
}

/** Handle : minuscules, `@` de tête retiré, espaces retirés. Platform-scopé au match. */
export function normalizeHandle(raw: string): string | null {
  const h = raw.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "");
  return h.length ? h : null;
}

/** Identifiant générique (EXTERNAL_ID/DEVICE) : trim + minuscules. */
export function normalizeGeneric(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return v.length ? v : null;
}

/**
 * Normalise selon le kind. Renvoie null si la valeur est invalide/vide pour ce kind
 * (une absence honnête — on n'invente jamais un identifiant).
 */
export function normalizeIdentifierValue(
  kind: IdentifierKind,
  raw: string,
): string | null {
  switch (kind) {
    case "EMAIL":
      return normalizeEmail(raw);
    case "PHONE":
      return normalizePhone(raw);
    case "HANDLE":
      return normalizeHandle(raw);
    case "EXTERNAL_ID":
    case "DEVICE":
      return normalizeGeneric(raw);
  }
}

/**
 * Clé de match logique (avant hash) : kind·platform·valeurNormalisée. Le service
 * la passe au HMAC. Deux identifiants qui produisent la même clé sont le même
 * identifiant réel.
 */
export function matchKey(
  kind: IdentifierKind,
  normalizedValue: string,
  platform?: string | null,
): string {
  const p = kind === "HANDLE" ? (platform ?? "").trim().toLowerCase() : "";
  return `${kind}:${p}:${normalizedValue}`;
}

// ───────────────────────────────────────────────────────────── décision de fusion

export type MergeVerdict = "AUTO_MERGE" | "CANDIDATE" | "CONFLICT" | "NONE";

export interface MergeSignal {
  readonly kind: IdentifierKind;
  /** Deux personnes partagent-elles cet identifiant (même matchHash) ? */
  readonly shared: boolean;
  readonly confidence: ConfidenceLevel;
}

/**
 * Décide, à partir d'un identifiant PARTAGÉ entre deux personnes, ce qu'on en fait.
 * Pur : le service applique le verdict.
 *  - identifiant fort partagé + (VERIFIED|DECLARED)      → AUTO_MERGE
 *  - identifiant faible partagé, ou fort mais INFERRED    → CANDIDATE (revue humaine)
 *  - pas partagé                                          → NONE
 */
export function mergeVerdictForSharedIdentifier(sig: MergeSignal): MergeVerdict {
  if (!sig.shared) return "NONE";
  const strongEnough = sig.confidence === "VERIFIED" || sig.confidence === "DECLARED";
  if (isStrongKind(sig.kind) && strongEnough) return "AUTO_MERGE";
  return "CANDIDATE";
}

/**
 * Conflit : deux personnes portent CHACUNE un identifiant fort vérifié du même kind
 * mais de valeur DIFFÉRENTE (deux emails primaires vérifiés distincts) → jamais de
 * fusion silencieuse, on lève un drapeau.
 */
export function isStrongConflict(
  kind: IdentifierKind,
  aValueHash: string,
  aConfidence: ConfidenceLevel,
  bValueHash: string,
  bConfidence: ConfidenceLevel,
): boolean {
  if (!isStrongKind(kind)) return false;
  const aVer = aConfidence !== "INFERRED";
  const bVer = bConfidence !== "INFERRED";
  return aVer && bVer && aValueHash !== bValueHash;
}

/**
 * Anti-inflation (ADR-0126) : une fusion ne peut que BAISSER ou MAINTENIR le compte
 * de personnes/superfans, jamais l'augmenter. Prédicat pur pour le test HARD.
 */
export function mergePreservesMonotonicity(
  countBefore: number,
  countAfter: number,
): boolean {
  return countAfter <= countBefore;
}

// ───────────────────────────────────────────────────────────── zod payloads

export const upsertPersonIdentifierInputSchema = z.object({
  strategyId: z.string().min(1),
  kind: IdentifierKindSchema,
  value: z.string().min(1),
  platform: z.string().nullish(),
  source: IdentifierSourceSchema,
  confidence: ConfidenceLevelSchema,
  /** Rattacher à une personne existante (sinon création / résolution auto). */
  personId: z.string().nullish(),
  displayName: z.string().nullish(),
});
export type UpsertPersonIdentifierInput = z.infer<
  typeof upsertPersonIdentifierInputSchema
>;

export const mergePersonsInputSchema = z.object({
  strategyId: z.string().min(1),
  sourcePersonId: z.string().min(1),
  targetPersonId: z.string().min(1),
  confidence: ConfidenceLevelSchema,
  reason: z.string().min(1),
});
export type MergePersonsInput = z.infer<typeof mergePersonsInputSchema>;

export const splitPersonInputSchema = z.object({
  strategyId: z.string().min(1),
  personId: z.string().min(1),
});
export type SplitPersonInput = z.infer<typeof splitPersonInputSchema>;
