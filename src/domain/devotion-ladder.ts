/**
 * Domain — Devotion Ladder canonique (rungs du parcours superfan).
 *
 * Source de vérité unique pour les paliers d'engagement d'une audience vers
 * une marque, du contact passif (spectateur) au porte-parole proactif
 * (evangeliste). Cf. CLAUDE.md philosophy_adve_rtis.md, ADR-0014, et
 * `pillar-schemas.ts` `pillarE` (déjà utilise les rungs comme champs `spectateurs/
 * interesses/participants/engages/ambassadeurs/evangelistes`).
 *
 * Audit ADR-0047 — observé sur Makrea (mai 2026) : `cultIndexSnapshots[0].tier`
 * stocké comme `String` libre côté Prisma, sans contrainte d'enum. Valeurs
 * invalides en DB (ex: `"APPRENTI"` venant de copy-paste depuis le `GuildTier`
 * creator) qui s'affichaient brutes côté Oracle. Cet enum + helper de parse
 * canonicalise au passage read-side.
 */

/**
 * 6 rungs Devotion Ladder, ordonnés du plus passif au plus engagé.
 *
 * - **SPECTATEUR** : connaissance passive, vue/scroll, aucune interaction.
 * - **INTERESSE** : engagement minimal (like, follow, lecture article).
 * - **PARTICIPANT** : interaction productive (commentaire, question, save).
 * - **ENGAGE** : achat / inscription / participation rituelle.
 * - **AMBASSADEUR** : recommandation organique (UGC, mention spontanée).
 * - **EVANGELISTE** : porte-parole proactif (défense de marque, prosélytisme,
 *   création de contenu dérivé qui élargit la fenêtre Overton).
 *
 * Anti-confusion :
 * - `BrandClassification` (`ZOMBIE | ORDINAIRE | FORTE | CULTE | ICONE`) est
 *   une mesure de la marque (composite ADVERTIS). Ne JAMAIS utiliser comme
 *   `cultIndex.tier`.
 * - `GuildTier` creator (`APPRENTI | COMPAGNON | MAITRE | ASSOCIE`) est le
 *   parcours interne talent. Aucun lien avec le Devotion Ladder.
 */
export const DEVOTION_LADDER_TIERS = [
  "SPECTATEUR",
  "INTERESSE",
  "PARTICIPANT",
  "ENGAGE",
  "AMBASSADEUR",
  "EVANGELISTE",
] as const;

export type DevotionLadderTier = (typeof DEVOTION_LADDER_TIERS)[number];

/**
 * Set of accepted lowercase / accented variants → canonical UPPERCASE rung.
 * Tolère les variations courantes (français accentué, casse) pour parser le
 * legacy DB qui stocke en string libre.
 */
const TIER_ALIASES: Record<string, DevotionLadderTier> = {
  // Canon
  spectateur: "SPECTATEUR",
  interesse: "INTERESSE",
  participant: "PARTICIPANT",
  engage: "ENGAGE",
  ambassadeur: "AMBASSADEUR",
  evangeliste: "EVANGELISTE",
  // Accentué
  intéressé: "INTERESSE",
  engagé: "ENGAGE",
  évangéliste: "EVANGELISTE",
  // Pluriels (pillar-schemas pillarE utilise pluriels)
  spectateurs: "SPECTATEUR",
  interesses: "INTERESSE",
  participants: "PARTICIPANT",
  engages: "ENGAGE",
  ambassadeurs: "AMBASSADEUR",
  evangelistes: "EVANGELISTE",
};

/**
 * Parse une valeur arbitraire (string libre DB, enum, snake_case, etc.) en
 * `DevotionLadderTier` canonique. Retourne `null` si la valeur n'est pas
 * reconnaissable comme un rung Devotion Ladder.
 *
 * @example
 * parseDevotionLadderTier("AMBASSADEUR") // "AMBASSADEUR"
 * parseDevotionLadderTier("ambassadeur") // "AMBASSADEUR"
 * parseDevotionLadderTier("Ambassadeurs") // "AMBASSADEUR"
 * parseDevotionLadderTier("APPRENTI") // null (GuildTier, pas DevotionLadder)
 * parseDevotionLadderTier("ICONE") // null (BrandClassification, pas DevotionLadder)
 * parseDevotionLadderTier(null) // null
 */
export function parseDevotionLadderTier(value: unknown): DevotionLadderTier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  // Direct uppercase match
  const upper = normalized.toUpperCase();
  if ((DEVOTION_LADDER_TIERS as readonly string[]).includes(upper)) {
    return upper as DevotionLadderTier;
  }
  return TIER_ALIASES[normalized] ?? null;
}

/**
 * Position 0-indexed du rung dans la cascade (SPECTATEUR=0 ... EVANGELISTE=5).
 * Utile pour comparaisons monotones (`pos(A) < pos(B)` ⟺ A est moins engagé que B).
 */
export function devotionLadderPosition(tier: DevotionLadderTier): number {
  return DEVOTION_LADDER_TIERS.indexOf(tier);
}
