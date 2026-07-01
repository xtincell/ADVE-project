/**
 * Phase 18-A1-α (audit MATANGA V4) — auto-générateur `Campaign.code` aligné
 * sur la nomenclature opératrice formelle :
 *
 *   `[CLIENT_PREFIX]-[PAYS_ISO2]-[MARQUE_SLUG]-NNN`     (FrieslandCampina)
 *   `[CLIENT_PREFIX]-NNN`                               (Cadyst Group, Fokou, etc.)
 *
 * Exemples :
 *   - `FC-TG-PEAK-001`        — FrieslandCampina, Togo, Peak, projet 001
 *   - `FC-CD-BR-001`          — FC, RDC (Congo), Bonnet Rouge
 *   - `FC-XX-MULTI-001`       — FC multi-pays/multi-marques (XX = pas de pays cible)
 *   - `PZ-001`                — Panzani / Cadyst Group sans cascade pays
 *   - `CF-001`                — Cadyst Farming
 *   - `FK-001`                — Fokou
 *
 * Le `CLIENT_PREFIX` est par convention attaché au `BrandNode { nodeKind: CORPORATE }`
 * via `nodeRole: ["CODE_PREFIX:FC"]`. Si non défini, le helper dérive du slug
 * du corporate (FrieslandCampina → "FC", Panzani → "PZ", ...). En cas d'ambiguïté,
 * fallback vers les 2 premières lettres uppercase du nom corporate.
 *
 * Tâches : `[ID_PROJET].NN` (ex: `FC-TG-PEAK-001.03`). Helper séparé
 * `generateTaskCode(campaignCode, taskIndex)`.
 */

import type { BrandNode, Campaign } from "@prisma/client";

/** Tag nodeRole conventionnel pour le préfixe code corporate. */
export const CODE_PREFIX_ROLE_TAG = "CODE_PREFIX";

/** Tag nodeRole conventionnel pour les nœuds multi-pays/multi-marques (XX placeholder). */
export const NO_COUNTRY_PLACEHOLDER = "XX";
export const NO_BRAND_PLACEHOLDER = "MULTI";

export interface CampaignCodeContext {
  /** BrandNode racine (CORPORATE typically) qui porte le client_prefix. */
  corporateNode: Pick<BrandNode, "id" | "name" | "slug" | "nodeRole" | "nodeKind">;
  /** BrandNode pays ciblé (REGIONAL_BRAND). null = multi-pays. */
  regionalNode?: Pick<BrandNode, "countryCode"> | null;
  /** BrandNode marque ciblée (MASTER_BRAND ou PRODUCT_LINE). null = multi-marques. */
  brandNode?: Pick<BrandNode, "name" | "slug"> | null;
  /** Numéro séquentiel (depuis count Campaign + 1). */
  sequenceNumber: number;
}

/**
 * Extrait le code prefix client depuis `nodeRole`. Si non défini, dérive du slug
 * du corporate (premières lettres uppercase, max 3 chars).
 *
 * Exemples :
 * - corporateNode { name: "FrieslandCampina", nodeRole: ["CODE_PREFIX:FC"] } → "FC"
 * - corporateNode { name: "Panzani", nodeRole: ["CODE_PREFIX:PZ"] } → "PZ"
 * - corporateNode { name: "Fokou", nodeRole: [] } → "FK" (dérivé)
 * - corporateNode { name: "Cadyst Farming", nodeRole: [] } → "CF" (initiales)
 */
export function extractCodePrefix(corporate: Pick<BrandNode, "name" | "slug" | "nodeRole">): string {
  const explicit = corporate.nodeRole.find((r) => r.startsWith(`${CODE_PREFIX_ROLE_TAG}:`));
  if (explicit) {
    return explicit.split(":")[1]!.toUpperCase().trim();
  }
  // Dérivation : initiales des mots significatifs du nom (max 3 chars)
  const words = corporate.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["de", "du", "la", "le", "and", "&"].includes(w.toLowerCase()));
  if (words.length === 1) {
    // Mot unique : 2 premières lettres
    return words[0]!.slice(0, 2).toUpperCase();
  }
  // Multi-mots : initiales (max 3 chars)
  return words
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 3);
}

/**
 * Slug court d'une marque pour insertion dans le code projet (max 6 chars uppercase).
 *
 * Exemples :
 * - "Bonnet Rouge" → "BR"
 * - "Belle Hollandaise" → "BH"
 * - "Peak" → "PEAK"
 * - "La Pasta Gold" → "LPG"
 * - "ROBUSTE" → "ROBUST" (premier mot, tronqué)
 */
export function shortenBrandForCode(brand: Pick<BrandNode, "name" | "slug">): string {
  const words = brand.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["de", "du", "la", "le", "and", "&", "the"].includes(w.toLowerCase()));
  if (words.length === 1) {
    return words[0]!.slice(0, 6).toUpperCase();
  }
  if (words.length === 2 && words[0]!.length <= 4) {
    // 2 mots courts : full word (Peak Green → PEAKGR ?) — privilégier initiales
    return words.map((w) => w[0]!.toUpperCase()).join("");
  }
  // 3+ mots : initiales
  return words
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 6);
}

/**
 * Génère le code Campaign formaté.
 *
 * Format choisi en fonction du contexte :
 * - Si `regionalNode + brandNode` fournis (cas FC-TG-PEAK style) → `[PREFIX]-[PAYS]-[MARQUE]-NNN`
 * - Si seulement `regionalNode` → `[PREFIX]-[PAYS]-NNN`
 * - Si seulement `brandNode` → `[PREFIX]-[MARQUE]-NNN`
 * - Sinon (ex: PZ Cadyst Group sans cascade pays) → `[PREFIX]-NNN`
 */
export function generateCampaignCode(ctx: CampaignCodeContext): string {
  const prefix = extractCodePrefix(ctx.corporateNode);
  const seqStr = String(ctx.sequenceNumber).padStart(3, "0");

  const parts = [prefix];
  if (ctx.regionalNode?.countryCode) {
    parts.push(ctx.regionalNode.countryCode.toUpperCase());
  } else if (ctx.brandNode) {
    // Cas multi-pays mais marque spécifique
    parts.push(NO_COUNTRY_PLACEHOLDER);
  }
  if (ctx.brandNode) {
    parts.push(shortenBrandForCode(ctx.brandNode));
  } else if (ctx.regionalNode?.countryCode) {
    parts.push(NO_BRAND_PLACEHOLDER);
  }
  parts.push(seqStr);

  return parts.join("-");
}

/**
 * Génère le code de tâche depuis un campaignCode + index séquentiel.
 *
 * Exemple : `generateTaskCode("FC-TG-PEAK-001", 3) === "FC-TG-PEAK-001.03"`.
 */
export function generateTaskCode(campaignCode: string, taskIndex: number): string {
  return `${campaignCode}.${String(taskIndex).padStart(2, "0")}`;
}

/**
 * Génère le code de ticket modif depuis un taskCode + index R.
 *
 * Exemple : `generateChangeRequestCode("FC-TG-PEAK-001.03", 1) === "FC-TG-PEAK-001.03-R01"`.
 */
export function generateChangeRequestCode(taskCode: string, revisionIndex: number): string {
  return `${taskCode}-R${String(revisionIndex).padStart(2, "0")}`;
}

/**
 * Parse un campaignCode pour en extraire les composants (utile pour les routes URL,
 * les filtres dashboard, et la validation runtime).
 *
 * Retourne `null` si le format n'est pas reconnu.
 */
export interface ParsedCampaignCode {
  prefix: string;
  countryCode: string | null;
  brandShort: string | null;
  sequence: number;
}

export function parseCampaignCode(code: string): ParsedCampaignCode | null {
  // Format complet : PREFIX-COUNTRY-BRAND-NNN ou PREFIX-XX-MULTI-NNN
  // Format réduit : PREFIX-NNN
  const parts = code.split("-");
  if (parts.length === 2) {
    const seq = parseInt(parts[1]!, 10);
    if (isNaN(seq)) return null;
    return { prefix: parts[0]!, countryCode: null, brandShort: null, sequence: seq };
  }
  if (parts.length === 4) {
    const seq = parseInt(parts[3]!, 10);
    if (isNaN(seq)) return null;
    const country = parts[1] === NO_COUNTRY_PLACEHOLDER ? null : parts[1]!;
    const brand = parts[2] === NO_BRAND_PLACEHOLDER ? null : parts[2]!;
    return { prefix: parts[0]!, countryCode: country, brandShort: brand, sequence: seq };
  }
  return null;
}

/**
 * Calcule le prochain `sequenceNumber` pour un context donné en regardant les
 * Campaign existantes qui matchent le pattern (PREFIX[-COUNTRY[-BRAND]]-NNN).
 *
 * À utiliser depuis un service backend qui a accès à la DB Prisma.
 */
export async function computeNextSequenceNumber(
  fetchExistingCodes: () => Promise<Pick<Campaign, "code">[]>,
  patternPrefix: string,
): Promise<number> {
  const rows = await fetchExistingCodes();
  let maxSeq = 0;
  for (const row of rows) {
    if (!row.code || !row.code.startsWith(`${patternPrefix}-`)) continue;
    const parsed = parseCampaignCode(row.code);
    if (parsed && parsed.sequence > maxSeq) maxSeq = parsed.sequence;
  }
  return maxSeq + 1;
}
