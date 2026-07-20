/**
 * Seshat — Entity Gate (ADR-0162) : gate adversarial de collecte publique.
 *
 * Problème (incident « Top » 2026-07-20) : la garde `mentionsBrand` est
 * LEXICALE (frontière de mot). Pour une marque dont le nom est un mot du
 * dictionnaire (« Top », soda des Brasseries du Cameroun), tout titre
 * contenant le mot ordinaire (« le top 10 des… ») passe légitimement la
 * frontière de mot → 100 % de bruit collecté sans distinction.
 *
 * Réponse : un gate D'ENTITÉ, pipeline hunter-like en 3 crans :
 *   1. PLAN  — `assessBrandNameAmbiguity` + `buildDiscriminants` : le nom
 *      est-il un mot commun ? quels tokens du contexte déclaré (secteur,
 *      pays, domaine, handles) discriminent LA marque de l'homonyme ?
 *   2. GATE  — `judgeEvidence` (déterministe, zéro LLM) : mention de marque
 *      en frontière de mot TOUJOURS exigée ; si le nom est ambigu, une
 *      co-occurrence discriminante est exigée EN PLUS. Verdict + preuves.
 *   3. REFUTE — `adversarial.ts` (LLM optionnel, demote-only) : tente de
 *      RÉFUTER chaque candidat accepté. Ne peut jamais repêcher un rejeté
 *      ni fabriquer — sans LLM, le verdict déterministe est le plancher.
 *
 * Doctrine : aucune fabrication (ADR-0046) — un candidat écarté est compté
 * (`filtered`), jamais remplacé. Mieux vaut 0 mention qu'une fausse.
 * Sub-composant Seshat (télémétrie/observabilité), PAS un Neter — cap 7/7.
 */

// ── Normalisation (partagée avec l'historique mentionsBrand) ────────────

/** Casse/diacritiques/ponctuation → tokens séparés par espaces. */
export function normalizeEntityText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Mention de marque en FRONTIÈRE DE MOT (séquence complète pour un nom
 * multi-mots). Garde de longueur : nom normalisé < 3 caractères purement
 * alphabétique refusé (fix prod 2026-07-19 — « a » matchait « Gironde »).
 * Source canonique — `quick-intake/public-enrichment.mentionsBrand` délègue ici.
 */
export function mentionsEntity(text: string, name: string): boolean {
  const brand = normalizeEntityText(name);
  if (!brand) return false;
  if (brand.length < 3 && !/[0-9]/.test(brand)) return false;
  return ` ${normalizeEntityText(text)} `.includes(` ${brand} `);
}

// ── 1. PLAN — ambiguïté du nom + discriminants du contexte ─────────────

/**
 * Mots communs FR/EN plausibles comme noms de marque. Un nom dont TOUS les
 * mots de contenu figurent ici est AMBIGU : la frontière de mot ne suffit
 * plus, une co-occurrence discriminante devient obligatoire. Liste STATIQUE
 * et délibérément conservatrice (un faux « distinctif » coûte du bruit ; un
 * faux « ambigu » coûte juste une exigence de contexte en plus).
 */
const COMMON_WORD_LEXICON = new Set<string>([
  // FR — noms/adjectifs fréquents vus comme noms de marque
  "top", "plus", "max", "star", "force", "action", "azur", "eclair", "eclat",
  "or", "orange", "citron", "soleil", "lion", "aigle", "royal", "royale",
  "premier", "premiere", "national", "nationale", "central", "centrale",
  "nouveau", "nouvelle", "grand", "grande", "petit", "petite", "bon", "bonne",
  "beau", "belle", "vrai", "vraie", "pur", "pure", "fort", "forte", "doux",
  "douce", "frais", "fraiche", "source", "ideal", "ideale", "parfait",
  "parfaite", "unique", "moderne", "populaire", "special", "speciale",
  "extra", "super", "ultra", "mega", "elite", "excellence", "victoire",
  "succes", "avenir", "horizon", "etoile", "lumiere", "energie", "vitale",
  "vital", "sante", "saveur", "delice", "plaisir", "confort", "liberte",
  "union", "alliance", "espoir", "progres", "avantage", "prestige",
  "harmonie", "equilibre", "nature", "naturel", "naturelle", "tradition",
  "heritage", "famille", "maison", "village", "capitale", "continental",
  "continentale", "atlantique", "pacifique", "tropical", "tropicale",
  "express", "rapide", "direct", "directe", "simple", "facile", "pratique",
  "total", "totale", "global", "globale", "general", "generale", "univers",
  "universel", "universelle", "monde", "mondial", "mondiale", "planete",
  // EN — common brandable words
  "one", "two", "first", "prime", "gold", "silver", "sun", "sky", "sea",
  "land", "home", "life", "live", "light", "power", "energy", "fresh",
  "pure", "true", "real", "best", "good", "great", "big", "small", "new",
  "old", "fast", "smart", "easy", "free", "open", "next", "future", "now",
  "today", "daily", "world", "city", "urban", "metro", "link", "connect",
  "unity", "spirit", "dream", "vision", "focus", "impact", "boost", "peak",
  "summit", "apex", "crown", "king", "queen", "master", "chief", "hero",
  "eagle", "tiger", "panther", "falcon", "phoenix", "diamond", "pearl",
  "crystal", "spark", "flash", "wave", "flow", "stream", "bridge", "gate",
  "point", "zone", "space", "place", "spot", "hub", "base", "core", "edge",
]);

/** Stopwords FR/EN ignorés dans l'analyse d'ambiguïté et les discriminants. */
const STOPWORDS = new Set<string>([
  "le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "au", "aux",
  "d", "l", "a", "the", "of", "and", "in", "on", "for", "by", "to", "sa",
  "sarl", "inc", "ltd", "llc", "group", "groupe", "company", "cie", "co",
]);

export interface AmbiguityAssessment {
  ambiguous: boolean;
  /** null si distinctif. */
  reason: string | null;
}

/**
 * Un nom est AMBIGU si tous ses mots de contenu sont des mots communs du
 * lexique (ou s'il ne reste aucun mot de contenu après stopwords). Un seul
 * token distinctif (« Chococam », « Motion19 ») suffit à lever l'ambiguïté.
 */
export function assessBrandNameAmbiguity(name: string): AmbiguityAssessment {
  const words = normalizeEntityText(name).split(" ").filter((w) => w && !STOPWORDS.has(w));
  if (words.length === 0) {
    return { ambiguous: true, reason: "Nom vide ou composé uniquement de mots-outils" };
  }
  const commons = words.filter((w) => COMMON_WORD_LEXICON.has(w));
  if (commons.length === words.length) {
    return {
      ambiguous: true,
      reason: `Nom composé uniquement de mots communs du dictionnaire (${commons.join(", ")})`,
    };
  }
  return { ambiguous: false, reason: null };
}

/**
 * Démonymes/toponymes par pays (table STATIQUE de référence, même esprit que
 * COUNTRY_TLD de web-footprint — pas une invention, un référentiel). Tokens
 * déjà normalisés.
 */
const COUNTRY_DISCRIMINANTS: Record<string, string[]> = {
  CM: ["cameroun", "cameroon", "camerounais", "camerounaise", "douala", "yaounde"],
  CI: ["ivoire", "ivoirien", "ivoirienne", "abidjan"],
  SN: ["senegal", "senegalais", "senegalaise", "dakar"],
  FR: ["france", "francais", "francaise", "paris"],
  MA: ["maroc", "marocain", "marocaine", "casablanca", "rabat"],
  NG: ["nigeria", "nigerian", "lagos", "abuja"],
  GH: ["ghana", "ghanaian", "accra"],
  TN: ["tunisie", "tunisien", "tunisienne", "tunis"],
  CD: ["congo", "congolais", "congolaise", "kinshasa", "rdc"],
  BJ: ["benin", "beninois", "beninoise", "cotonou"],
  TG: ["togo", "togolais", "togolaise", "lome"],
  GA: ["gabon", "gabonais", "gabonaise", "libreville"],
  BF: ["burkina", "burkinabe", "ouagadougou"],
  ML: ["mali", "malien", "malienne", "bamako"],
};

export interface DiscriminantContext {
  /** Secteur déclaré à l'intake (texte libre). */
  sector?: string | null;
  /** Pays déclaré (nom libre « Cameroun » ou ISO-2). */
  country?: string | null;
  /** ISO-2 si connu (countryCodeGuess). */
  countryCode?: string | null;
  /** Site déclaré/découvert — son slug de domaine discrimine. */
  websiteUrl?: string | null;
  /** Handles sociaux déclarés ou trouvés sur le site déclaré. */
  socialHandles?: readonly string[] | null;
  /** Termes additionnels déclarés (jamais inventés). */
  extraTerms?: readonly string[] | null;
}

/**
 * Discriminants déterministes depuis le contexte DÉCLARÉ uniquement —
 * jamais de fabrication. Tokens normalisés, dédupliqués, sans le nom de
 * marque lui-même (il ne peut pas se discriminer tout seul).
 */
export function buildDiscriminants(name: string, ctx: DiscriminantContext): string[] {
  const brandWords = new Set(normalizeEntityText(name).split(" ").filter(Boolean));
  const out = new Set<string>();
  const add = (raw: string | null | undefined) => {
    if (!raw) return;
    for (const w of normalizeEntityText(raw).split(" ")) {
      if (w.length >= 3 && !STOPWORDS.has(w) && !brandWords.has(w)) out.add(w);
    }
  };

  add(ctx.sector);
  add(ctx.country);
  const cc = ctx.countryCode?.toUpperCase();
  if (cc && COUNTRY_DISCRIMINANTS[cc]) {
    for (const t of COUNTRY_DISCRIMINANTS[cc]) if (!brandWords.has(t)) out.add(t);
  }
  if (ctx.websiteUrl) {
    try {
      const host = new URL(/^https?:\/\//i.test(ctx.websiteUrl) ? ctx.websiteUrl : `https://${ctx.websiteUrl}`).hostname
        .replace(/^www\./, "")
        .split(".")[0];
      if (host && host.length >= 4 && !brandWords.has(host)) out.add(host);
    } catch {
      /* URL malformée — ignorée */
    }
  }
  for (const h of ctx.socialHandles ?? []) add(h);
  for (const t of ctx.extraTerms ?? []) add(t);

  return [...out];
}

// ── 2. GATE — verdict déterministe par candidat ────────────────────────

export type EvidenceRejection = "NO_BRAND_MENTION" | "AMBIGUOUS_NO_DISCRIMINANT";

export interface EvidenceVerdict {
  accepted: boolean;
  brandMatched: boolean;
  /** Discriminants co-occurrents trouvés dans le texte (preuve). */
  matchedDiscriminants: string[];
  rejection: EvidenceRejection | null;
}

export interface EntityGate {
  brandName: string;
  ambiguity: AmbiguityAssessment;
  discriminants: string[];
  judge: (text: string) => EvidenceVerdict;
}

/**
 * Construit le gate une fois par collecte (PLAN), puis `judge(texte)` par
 * candidat. Règles :
 *   - mention de marque en frontière de mot TOUJOURS exigée ;
 *   - nom AMBIGU → au moins un discriminant co-occurrent exigé EN PLUS ;
 *   - nom distinctif → la mention suffit (discriminants = preuve bonus).
 * Cas limite honnête : nom ambigu SANS aucun discriminant disponible
 * (aucun secteur/pays/site déclaré) → tout est rejeté ; l'appelant doit
 * le savoir via `discriminants.length === 0` et le restituer honnêtement.
 */
export function createEntityGate(name: string, ctx: DiscriminantContext): EntityGate {
  const ambiguity = assessBrandNameAmbiguity(name);
  const discriminants = buildDiscriminants(name, ctx);

  const judge = (text: string): EvidenceVerdict => {
    const brandMatched = mentionsEntity(text, name);
    if (!brandMatched) {
      return { accepted: false, brandMatched: false, matchedDiscriminants: [], rejection: "NO_BRAND_MENTION" };
    }
    const hay = ` ${normalizeEntityText(text)} `;
    const matchedDiscriminants = discriminants.filter((d) => hay.includes(` ${d} `));
    if (ambiguity.ambiguous && matchedDiscriminants.length === 0) {
      return { accepted: false, brandMatched: true, matchedDiscriminants, rejection: "AMBIGUOUS_NO_DISCRIMINANT" };
    }
    return { accepted: true, brandMatched: true, matchedDiscriminants, rejection: null };
  };

  return { brandName: name, ambiguity, discriminants, judge };
}

// ── Rapport de gate (persisté dans EnrichedFootprint.entityGate) ───────

export interface EntityGateReport {
  ambiguousName: boolean;
  ambiguityReason: string | null;
  discriminants: string[];
  /** DETERMINISTIC_ONLY = LLM indisponible/désactivé — plancher honnête. */
  judge: "DETERMINISTIC_ONLY" | "DETERMINISTIC_PLUS_LLM";
  /** Candidats écartés par source (bruit supprimé, jamais remplacé). */
  filtered: { press: number; discovery: number; maps: number; site: number; adversarial: number };
}
