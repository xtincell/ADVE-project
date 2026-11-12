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
 * pilier A (`publicCible`) + D (`personas`, concurrents) + E (portrait et
 * communauté, y compris les anciens champs) → dérivation
 * pure → sujets de veille → Gazette/panneau Veille. Manual-first (ADR-0060) :
 * `businessContext.watchSubjects` (édité par le founder/opérateur) PRIME sur
 * le dérivé quand il est non vide.
 */

import { declaredCompetitorNames } from "@/domain/creative-intelligence";

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
  pillarA?: Record<string, unknown> | null;
  pillarV?: Record<string, unknown> | null;
  pillarD?: Record<string, unknown> | null;
  pillarE?: Record<string, unknown> | null;
  /** Nom de pays lisible (« Cameroun ») — scope les sujets locaux. */
  countryName?: string | null;
}

const QUERY_STOPWORDS = new Set([
  "les", "des", "une", "pour", "avec", "dans", "sur", "qui", "que", "leur", "leurs", "aux",
  "the", "and", "for", "from", "with", "par", "est", "sont", "comme", "cette", "ces", "son", "ses",
  "communication", "persona", "trafic", "reference", "profil", "postulat", "postulats", "confirmer",
  "veulent", "veut", "cherche", "cherchent", "atteindre", "public", "qualifie", "premier", "plus",
  "repondre", "connaitre", "obtenir", "passer", "conserver", "proteger", "permettre", "doit", "doivent",
]);
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown): string[] => typeof value === "string" ? [value] :
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** Short search terms, not a copied persona biography or its private identity. */
function audienceTopic(value: string, excluded: string[] = []): string {
  const names = new Set(excluded.flatMap(contentWords).map(w => w.toLowerCase()));
  return [...new Set(contentWords(value).filter(w => !QUERY_STOPWORDS.has(w.toLowerCase()) &&
    !names.has(w.toLowerCase()) && !/\d/.test(w)))].slice(0, 4).join(" ");
}

/** Modern canon first; legacy E remains readable. Persona names and numbers are not topics. */
function audienceSubjects(input: DeriveWatchSubjectsInput): string[] {
  const a = input.pillarA ?? {}, d = input.pillarD ?? {}, e = input.pillarE ?? {};
  const scoped = (topic: string, location?: string) => topic ?
    `${topic}${location && !topic.toLowerCase().includes(location.toLowerCase()) ? ` ${location}` : ""}${input.countryName ? ` ${input.countryName}` : ""}` : "";
  const declared = strings(a.publicCible).flatMap(text => text.split(/[.;\n]+/))
    .slice(0, 3).map(clause => audienceTopic(clause.split(":").at(-1) ?? clause)).filter(Boolean);

  const personas = Array.isArray(d.personas) ? d.personas.map(record) : [];
  const portrait = record(e.superfanPortrait);
  const roles = (p: Record<string, unknown>) => strings(p.actorRoles);
  const ordered = [...personas].sort((x, y) => {
    const priority = (p: Record<string, unknown>) => roles(p).includes("COMMUNICATION_AUDIENCE") ||
      (typeof p.id === "string" && p.id === portrait.personaRef) ? 0 : roles(p).includes("PARTNER") ? 1 : 2;
    return priority(x) - priority(y);
  });
  const modern = ordered.slice(0, 3).map(persona => {
    const profile = persona.id === portrait.personaRef ? strings(portrait.profile).join(" ") : "";
    const description = strings(persona.csp)[0] ?? strings(persona.jobsToBeDone)[0] ?? profile;
    // Location is a declared scope, never a guess from the persona's given name.
    const location = strings(persona.location)[0]?.split(/[,;]/)[0]?.trim();
    return scoped(audienceTopic(description, strings(persona.name)), location);
  }).filter(Boolean);
  // Public statements and persona scopes complement one another. A populated
  // A.publicCible must not hide the locations and community vocabulary in D/E.
  const combined = [...declared.map(topic => scoped(topic)), ...modern]
    .filter((s): s is string => Boolean(s));
  if (combined.length) return [...new Set(combined)];
  const overton = Array.isArray(a.overtonPositions) ? a.overtonPositions.map(record) : [];
  const audience = strings(overton[0]?.audience)[0] ?? strings(e.cible ?? e.communaute ?? e.audience)[0] ??
    strings(portrait.profile)[0];
  return audience ? [scoped(audienceTopic(audience))].filter(Boolean) : [];
}

export interface WatchContext {
  subjects: string[];
  audienceSubjects: string[];
  /** Declared locations only. A country search edition is not geographic proof. */
  locations: string[];
  localLocations: string[];
}

/** Vocabulary shared by query construction and relevance, without persona names. */
export function watchTopicTerms(subject: string, locations: string[] = []): string[] {
  const geography = new Set(locations.flatMap(contentWords).map(w => w.toLowerCase()));
  const roles = new Set(["clients", "partenaires", "suiveurs", "spectateurs", "utilisateurs", "vises", "apportent", "local"]);
  // Preserve declared proper-name compounds: splitting "Local Guides" into
  // independent words would admit any local story or any unrelated guide.
  const compounds = [...subject.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g)]
    .map(m => contentWords(m[0]).map(w => w.toLowerCase()).filter(word => !geography.has(word)).join(" "))
    .filter(phrase => phrase.split(" ").length >= 2);
  const compoundWords = new Set(compounds.flatMap(phrase => phrase.split(" ")));
  return [...new Set(contentWords(subject).map(w => w.toLowerCase()).filter(w =>
    !QUERY_STOPWORDS.has(w) && !roles.has(w) && !geography.has(w) && !compoundWords.has(w) && !/\d/.test(w)).concat(compounds))];
}

export function deriveWatchContext(input: DeriveWatchSubjectsInput): WatchContext {
  const personas = Array.isArray(input.pillarD?.personas) ? input.pillarD.personas.map(record) : [];
  const personaLocations = personas.flatMap(p => strings(p.location))
    .map(s => s.split(/[,;()]/)[0]!.split(/\s(?:à|in|at)\s/i).at(-1)!.trim())
    .filter(s => s.length >= 3 && s.length <= 80 && !/pr[eé]ciser|inconn[uue]|confirmer|unknown/i.test(s));
  const locations = [...new Set([
    ...personaLocations,
    ...(input.countryName ? [input.countryName] : []),
  ])];
  return { subjects: deriveWatchSubjects(input), audienceSubjects: audienceSubjects(input), locations,
    localLocations: [...new Set(personaLocations.length ? personaLocations : locations)] };
}

/**
 * Six complementary topics at most. Reserve space for the actual audience,
 * distributed brands and rivals; a large catalogue must not erase the audience.
 * Only declared ADVE vocabulary is used; a search query is not an observation.
 */
export function deriveWatchSubjects(input: DeriveWatchSubjectsInput): string[] {
  const out: string[] = [];
  const audiences = audienceSubjects(input);
  const brands = extractCatalogBrands(input.pillarV?.produitsCatalogue);
  const competitors = declaredCompetitorNames(input.pillarD).slice(0, 2)
    .map(name => input.countryName ? `${name} ${input.countryName}` : name);
  const candidates = [audiences[0], brands[0], competitors[0], audiences[1], audiences[2],
    competitors[1], ...brands.slice(1)];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && value.length >= 3 && !out.some(o => o.toLowerCase() === value.toLowerCase())) out.push(value);
    if (out.length === 6) break;
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
