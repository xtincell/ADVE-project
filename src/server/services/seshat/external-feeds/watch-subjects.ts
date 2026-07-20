/**
 * Sujets de veille dérivés de l'ADVE (ADR-0165) — 100 % déterministe, zéro LLM.
 *
 * Constat (cas Motion19, 2026-07-20) : la veille n'interrogeait que le nom de
 * la marque + le terme-tête du secteur (« équipement audiovisuel ») → presse
 * générique française, articles de 3 010 jours. Ce que l'opérateur attend :
 * l'actu des MARQUES DISTRIBUÉES (Canon, Nikon…), les événements de la
 * COMMUNAUTÉ CIBLE sur son marché (Yaoundé PhotoFest), les CONCURRENTS.
 * Toute cette matière est DANS les piliers ADVE — le crochet `extraSubjects`
 * existait, personne ne le branchait.
 *
 * Chaîne de propagation (PROPAGATION-MAP) : pilier V (`produitsCatalogue`) +
 * pilier D (`concurrents`) + pilier E (`cible`/`communaute`) → dérivation
 * pure → sujets de veille → Gazette/panneau Veille. Manual-first (ADR-0060) :
 * `businessContext.watchSubjects` (édité par le founder/opérateur) PRIME sur
 * le dérivé quand il est non vide.
 */

/** Mots génériques de catalogue — jamais des marques. */
const GENERIC_PRODUCT_WORDS = new Set([
  "pack", "kit", "lot", "set", "cable", "câble", "support", "trepied", "trépied",
  "batterie", "chargeur", "sac", "housse", "filtre", "carte", "adaptateur",
  "objectif", "flash", "micro", "microphone", "ecran", "écran", "lampe", "led",
  "fond", "studio", "pied", "rallonge", "boitier", "boîtier", "telecommande",
  "télécommande", "casque", "enceinte", "stabilisateur", "perche", "bras",
  "mini", "pro", "max", "plus", "new", "the", "les", "des", "pour", "avec",
]);

function contentWords(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length >= 3);
}

/**
 * Marques distribuées depuis le catalogue V : fréquence des PREMIERS tokens
 * des noms de produits (« Canon EOS R5 », « Canon RF 24-70 » → « Canon » ×2).
 * Un token en tête d'au moins 2 produits, non générique, est une marque.
 */
export function extractCatalogBrands(
  produitsCatalogue: unknown,
  opts?: { max?: number },
): string[] {
  if (!Array.isArray(produitsCatalogue)) return [];
  const freq = new Map<string, { count: number; display: string }>();
  for (const item of produitsCatalogue) {
    const name =
      typeof item === "string"
        ? item
        : item && typeof item === "object"
          ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).nom ?? "")
          : "";
    const first = contentWords(name)[0];
    if (!first) continue;
    const key = first.toLowerCase();
    if (GENERIC_PRODUCT_WORDS.has(key) || /^\d+$/.test(key)) continue;
    const cur = freq.get(key);
    if (cur) cur.count += 1;
    else freq.set(key, { count: 1, display: first[0]!.toUpperCase() + first.slice(1) });
  }
  return [...freq.values()]
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, opts?.max ?? 4)
    .map((f) => f.display);
}

export interface DeriveWatchSubjectsInput {
  pillarV?: Record<string, unknown> | null;
  pillarD?: Record<string, unknown> | null;
  pillarE?: Record<string, unknown> | null;
  /** Nom de pays lisible (« Cameroun ») — scope les sujets locaux. */
  countryName?: string | null;
}

/**
 * Sujets dérivés, ≤ 6, dédupliqués :
 *   - marques du catalogue (mondiales — l'actu vendeur est globale) ;
 *   - concurrents déclarés (+ pays) ;
 *   - communauté cible (+ pays) — les événements locaux de l'audience.
 * Jamais d'invention : uniquement ce que les piliers contiennent.
 */
export function deriveWatchSubjects(input: DeriveWatchSubjectsInput): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (v.length >= 3 && !out.some((o) => o.toLowerCase() === v.toLowerCase()) && out.length < 6) out.push(v);
  };
  const country = (input.countryName ?? "").trim();

  // 1. Marques distribuées (pilier V).
  for (const brand of extractCatalogBrands(input.pillarV?.produitsCatalogue)) push(brand);

  // 2. Concurrents déclarés (pilier D).
  const concurrents = input.pillarD?.concurrents;
  if (Array.isArray(concurrents)) {
    for (const c of concurrents.slice(0, 2)) {
      const name =
        typeof c === "string"
          ? c
          : c && typeof c === "object"
            ? String((c as Record<string, unknown>).nom ?? (c as Record<string, unknown>).name ?? "")
            : "";
      if (name.trim()) push(country ? `${name.trim()} ${country}` : name.trim());
    }
  }

  // 3. Communauté cible (pilier E) — 3 premiers mots de contenu + pays.
  const cible = input.pillarE?.cible ?? input.pillarE?.communaute ?? input.pillarE?.audience;
  if (typeof cible === "string" && cible.trim()) {
    const words = contentWords(cible).slice(0, 3).join(" ");
    if (words) push(country ? `${words} ${country}` : words);
  }

  return out;
}

/** ISO-2 → nom de pays FR (référentiel statique, même famille que COUNTRY_TLD). */
const COUNTRY_NAME_FR: Record<string, string> = {
  CM: "Cameroun", CI: "Côte d'Ivoire", SN: "Sénégal", FR: "France", MA: "Maroc",
  NG: "Nigeria", GH: "Ghana", TN: "Tunisie", CD: "RDC", BJ: "Bénin", TG: "Togo",
  GA: "Gabon", BF: "Burkina Faso", ML: "Mali",
};

export function countryDisplayNameFr(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_NAME_FR[countryCode.trim().toUpperCase()] ?? null;
}

/** Sujets effectifs : l'édition manuelle PRIME, sinon le dérivé (ADR-0060). */
export function effectiveWatchSubjects(
  manual: unknown,
  derived: string[],
): { subjects: string[]; source: "MANUAL" | "DERIVED" | "NONE" } {
  const manualList = Array.isArray(manual)
    ? manual.filter((s): s is string => typeof s === "string" && s.trim().length >= 3).map((s) => s.trim()).slice(0, 8)
    : [];
  if (manualList.length > 0) return { subjects: manualList, source: "MANUAL" };
  if (derived.length > 0) return { subjects: derived, source: "DERIVED" };
  return { subjects: [], source: "NONE" };
}
