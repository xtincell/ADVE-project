/**
 * Taxonomie de secteurs CANONIQUE — la clé de ligue universelle du scoreur.
 *
 * Problème résolu : `Client.sector` est un texte libre (« Équipement audiovisuel
 * & créateurs »). Slugifié tel quel, chaque marque tombe dans sa propre micro-
 * ligue → un « championnat » de 1. On mappe donc tout texte de secteur vers UN
 * code canonique (aligné sur `INTAKE_SECTORS`) par mots-clés pertinents, de sorte
 * que deux concurrents réels partagent la même ligue.
 *
 * 100 % déterministe, zéro LLM, zéro IO. Matching par mot entier (accents
 * strippés) pour éviter les faux positifs (« art » dans « carte »).
 */

export interface CanonicalSector {
  /** Code canon (aligné INTAKE_SECTORS). */
  readonly code: string;
  /** Slug de ligue (minuscule, stable). */
  readonly slug: string;
  readonly label: string;
  /** Mots-clés pertinents (normalisés : minuscule, sans accents). */
  readonly keywords: readonly string[];
}

/**
 * 24 secteurs canon (⊇ INTAKE_SECTOR_VALUES — vérifié par test de sync).
 * Ordre = priorité de départage en cas d'égalité de score.
 */
export const SECTOR_TAXONOMY: readonly CanonicalSector[] = [
  { code: "FOOD", slug: "food", label: "Alimentation & boissons", keywords: ["alimentation", "aliment", "boisson", "food", "pates", "snack", "nutrition", "brasserie", "jus", "eau minerale", "biscuit", "confiserie", "lait"] },
  { code: "AGRO", slug: "agro", label: "Agro-industrie & agriculture", keywords: ["agro", "agriculture", "agroalimentaire", "agro-industrie", "elevage", "ferme", "cacao", "cafe", "coton", "plantation", "semence"] },
  { code: "FMCG", slug: "fmcg", label: "FMCG (grande consommation)", keywords: ["fmcg", "grande consommation", "biens de consommation", "pgc", "produits menagers", "hygiene"] },
  { code: "MODE", slug: "mode", label: "Mode & beauté", keywords: ["mode", "beaute", "fashion", "vetement", "textile", "cosmetique", "maquillage", "pret-a-porter", "chaussure", "bijou", "parfum", "coiffure"] },
  { code: "RETAIL", slug: "retail", label: "Retail & distribution", keywords: ["retail", "distribution", "boutique", "magasin", "supermarche", "commerce", "e-commerce", "ecommerce", "vente au detail", "shop", "store", "grande surface"] },
  { code: "TECH", slug: "tech", label: "Tech & startup", keywords: ["tech", "startup", "logiciel", "software", "saas", "application", "numerique", "digital", "plateforme", "intelligence artificielle", "informatique", "web3"] },
  { code: "TELECOM", slug: "telecom", label: "Télécom & opérateurs", keywords: ["telecom", "operateur", "mobile", "internet", "telephonie", "fibre", "reseau mobile", "connectivite"] },
  { code: "MEDIA", slug: "media", label: "Média & édition", keywords: ["media", "edition", "presse", "journal", "television", "radio", "magazine", "streaming", "podcast", "chaine"] },
  { code: "CULTURE", slug: "culture", label: "Culture & créativité", keywords: ["culture", "creativite", "creatif", "createur", "audiovisuel", "artiste", "artistique", "musique", "cinema", "film", "production", "photo", "video", "design", "evenementiel", "spectacle", "galerie"] },
  { code: "TOURISME", slug: "tourisme", label: "Tourisme & hôtellerie", keywords: ["tourisme", "hotellerie", "hotel", "voyage", "restauration", "hospitality", "resort", "restaurant", "auberge", "tour operateur"] },
  { code: "BANQUE", slug: "banque", label: "Banque, finance & fintech", keywords: ["banque", "finance", "fintech", "credit", "microfinance", "paiement", "bancaire", "mobile money", "monnaie", "investissement"] },
  { code: "ASSURANCE", slug: "assurance", label: "Assurance", keywords: ["assurance", "assureur", "mutuelle", "prevoyance", "reassurance"] },
  { code: "IMMOBILIER", slug: "immobilier", label: "Immobilier & construction", keywords: ["immobilier", "promotion immobiliere", "logement", "foncier", "agence immobiliere"] },
  { code: "BTP", slug: "btp", label: "BTP & infrastructure", keywords: ["btp", "infrastructure", "batiment", "travaux publics", "genie civil", "chantier", "construction"] },
  { code: "ENERGIE", slug: "energie", label: "Énergie & utilities", keywords: ["energie", "utilities", "electricite", "solaire", "petrole", "gaz", "renouvelable", "photovoltaique"] },
  { code: "LOGISTIQUE", slug: "logistique", label: "Transport & logistique", keywords: ["transport", "logistique", "fret", "livraison", "mobilite", "taxi", "vtc", "coursier", "supply chain", "expedition"] },
  { code: "SANTE", slug: "sante", label: "Santé & pharma", keywords: ["sante", "pharma", "pharmacie", "medical", "clinique", "hopital", "medicament", "diagnostic", "soin"] },
  { code: "EDUCATION", slug: "education", label: "Éducation & formation", keywords: ["education", "formation", "ecole", "universite", "e-learning", "elearning", "cours", "academie", "edtech", "enseignement"] },
  { code: "CONSEIL", slug: "conseil", label: "Conseil & services pro", keywords: ["conseil", "consulting", "cabinet", "audit", "avocat", "comptable", "agence conseil", "expertise"] },
  { code: "SERVICES", slug: "services", label: "Services aux particuliers", keywords: ["services aux particuliers", "pressing", "reparation", "artisan", "nettoyage", "depannage", "menage"] },
  { code: "B2B", slug: "b2b", label: "B2B / industrie", keywords: ["b2b", "industrie", "industriel", "manufacture", "usine", "equipement industriel", "machinerie", "fabrication"] },
  { code: "ONG", slug: "ong", label: "ONG, impact & associatif", keywords: ["ong", "impact", "associatif", "association", "humanitaire", "fondation", "non lucratif", "solidarite"] },
  { code: "PUBLIC", slug: "public", label: "Secteur public & institution", keywords: ["secteur public", "institution", "gouvernement", "administration", "mairie", "ministere", "collectivite"] },
  { code: "AUTRE", slug: "autre", label: "Autre", keywords: [] },
] as const;

const AUTRE = SECTOR_TAXONOMY[SECTOR_TAXONOMY.length - 1]!;
const BY_CODE = new Map(SECTOR_TAXONOMY.map((s) => [s.code, s]));

/** Normalise pour comparaison : minuscule, accents strippés, espaces compactés. */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Vrai si `kw` apparaît comme mot entier dans `haystack` (évite art⊂carte),
 * OU comme PRÉFIXE d'un mot quand le keyword fait ≥ 5 caractères (fix
 * 2026-07-20, test qualité 5 marques : « Télécommunications » ne matchait pas
 * `telecom`, « Boissons » ne matchait pas `boisson` — pluriels et dérivés
 * classés AUTRE). Le seuil de 5 évite les débordements courts (`mode` ⊄
 * `modele`, `tech` reste mot entier).
 */
function matchesWord(haystack: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re =
    kw.length >= 5
      ? new RegExp(`(?:^|[^a-z0-9])${escaped}`)
      : new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`);
  return re.test(haystack);
}

/**
 * Classe un texte de secteur (libre ou déjà un code) vers un secteur canon.
 * - Code exact (« FOOD ») → ce secteur.
 * - Sinon score = nombre de mots-clés présents ; le plus haut gagne (départage
 *   par ordre de la taxonomie).
 * - Aucun mot-clé → AUTRE.
 */
export function classifyCanonicalSector(raw: string | null | undefined): CanonicalSector {
  if (!raw || !raw.trim()) return AUTRE;
  const direct = BY_CODE.get(raw.trim().toUpperCase());
  if (direct) return direct;

  const norm = normalize(raw);
  let best: CanonicalSector = AUTRE;
  let bestScore = 0;
  for (const sector of SECTOR_TAXONOMY) {
    let score = 0;
    for (const kw of sector.keywords) if (matchesWord(norm, kw)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = sector;
    }
  }
  return best;
}

/** Slug de ligue canonique (raccourci). */
export function canonicalSectorSlug(raw: string | null | undefined): string {
  return classifyCanonicalSector(raw).slug;
}

/**
 * Libellé humain d'un secteur (code canon ou texte libre) pour les surfaces
 * client — un rapport ne doit jamais rendre le CODE brut (« pour Orange dans
 * AUTRE », test qualité 2026-07-20). AUTRE → null (l'appelant choisit sa
 * périphrase : « votre secteur », « son secteur »…).
 */
export function sectorDisplayLabel(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const s = classifyCanonicalSector(raw);
  return s.code === "AUTRE" ? null : s.label;
}
