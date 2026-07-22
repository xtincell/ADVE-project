/**
 * Thot — conversion de devise DÉTERMINISTE, bornée aux parités FIXES (ADR-0093).
 *
 * # Le trou que ce module ferme (F6)
 *
 * `resolveProviderRate` renvoie `{ rate, currency }` ; l'estimateur ne lisait que
 * `rate` et le sommait comme s'il était dans la devise du template. Un taux
 * prestataire en EUR composé dans un template XAF était sous-compté ~656× (le
 * coût réel d'une séance photo diaspora s'affichait en centimes de FCFA).
 *
 * # Pourquoi PAS un taux de change général
 *
 * La Fusée ne dépend pas d'une API FX externe (déterminisme, zéro dépendance
 * réseau, reproductibilité des devis). On ne convertit donc QUE les parités
 * *fixes* légalement gelées :
 *
 *   - **Franc CFA (XOF/XAF)** : les deux blocs sont arrimés à l'euro à
 *     `1 EUR = 655,957 CFA` (parité fixe depuis 1999). XOF ↔ XAF = 1:1.
 *
 * Toute autre paire (USD, NGN, GHS… — devises flottantes) renvoie `null` : elle
 * n'est PAS convertible sans source de taux → l'appelant retombe honnêtement sur
 * une autre source de taux (dans la devise du template) plutôt que de mécompter.
 * Ne JAMAIS inventer un taux (interdit NEFER n°3).
 */

/** Parité fixe franc CFA ↔ euro (gelée depuis l'adoption de l'euro, 1999). */
export const EUR_TO_CFA = 655.957;

/** Devises à parité fixe que ce module sait convertir exactement. */
const FIXED_PARITY = new Set(["XOF", "XAF", "EUR"]);

/** Nombre d'unités de la devise par euro (1 pour l'euro lui-même). */
function unitsPerEur(currency: string): number | null {
  if (currency === "EUR") return 1;
  if (currency === "XOF" || currency === "XAF") return EUR_TO_CFA;
  return null;
}

/**
 * Convertit `amount` de `from` vers `to`, UNIQUEMENT entre devises à parité fixe
 * (XOF/XAF/EUR). Renvoie `null` si l'une des deux devises est flottante (non
 * convertible sans source de taux) — l'appelant doit alors dégrader honnêtement.
 *
 * Pur, déterministe, zéro dépendance (ni DB ni réseau ni LLM).
 */
export function convertFixedParity(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (!FIXED_PARITY.has(from) || !FIXED_PARITY.has(to)) return null;
  const fromPerEur = unitsPerEur(from);
  const toPerEur = unitsPerEur(to);
  if (fromPerEur == null || toPerEur == null || fromPerEur <= 0) return null;
  // amount (from) → euros → to. XOF↔XAF donne exactement 1:1 (même parité).
  return (amount / fromPerEur) * toPerEur;
}
