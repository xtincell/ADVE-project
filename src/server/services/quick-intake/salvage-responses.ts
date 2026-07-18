/**
 * quick-intake/salvage-responses.ts — re-clé déterministe des réponses brutes
 * vers les champs de schéma pilier (zéro LLM).
 *
 * POURQUOI. L'extraction structurée (`extractStructuredPillarContent`) mappe les
 * réponses question-bank (`a_noyau`, `d_positioning`…) vers la shape Zod des
 * piliers (`noyauIdentitaire`, `positionnement`…) via un appel LLM par pilier.
 * Quand ce LLM est indisponible (aucun provider, quota, JSON imparsable), le
 * chemin retombait sur les réponses BRUTES telles quelles — clés `a_*` que le
 * scorer déterministe (contrat de maturité → paths de schéma) ne sait pas lire.
 * Résultat : une marque au dossier riche affichait un score de ~0 (« tout à
 * zéro ») et un rapport de clés techniques illisibles.
 *
 * CE MODULE est le maillon manquant de la doctrine « Fusée non-dépendante du
 * LLM » (PR #258, `composeDeterministicReport`) : il re-clé les réponses vers
 * les champs de schéma AU MÊME TITRE que l'aurait fait le LLM, mais de façon
 * déterministe et bornée — UNIQUEMENT les correspondances sémantiquement
 * exactes (la question demande littéralement le contenu de ce champ). Les
 * champs non-inférables déterministe­ment (archétype-enum, ton de voix, journey
 * du héros…) restent au LLM : on ne fabrique rien (ADR-0046).
 *
 * Le scorer ne valide pas la shape Zod complète d'un item de collection — il
 * exige ≥1 des sous-clés attendues (assessor `min_items`/`is_object`
 * expectedKeys). On peuple donc la clé PRIMAIRE réelle de chaque item
 * (`customName`/`name`/`nom`/`description`/`profile`) avec la déclaration du
 * dirigeant : honnête, lisible, scorable. Le contenu reste INCOMPLET (état
 * first-class du contrat de maturité) — « Enrichir » le complètera.
 *
 * Pur : aucune IO, aucun LLM. Testé sur fixtures.
 */

export type AdvePillar = "a" | "d" | "v" | "e";

// ── Shapers (réponse texte → valeur de champ schéma) ─────────────────────

/** Découpe une réponse « liste » (valeurs, concurrents, produits) en items. */
function splitList(v: string): string[] {
  return v
    .split(/\r?\n|;|·|•|–|\s-\s|,/)
    .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
    .filter((s) => s.length > 1)
    .slice(0, 8);
}

/** Première proposition d'un texte (pour un `name`/`nom` court). */
function firstClause(v: string, max: number): string {
  const head = v.split(/[.!?\n]/)[0]?.trim() || v.trim();
  return head.slice(0, max);
}

const asString = (v: string) => v.trim().slice(0, 4000);
const asValueArray = (v: string) => splitList(v).map((x) => ({ customName: x.slice(0, 200) }));
const asNamedArray = (v: string) => splitList(v).map((x) => ({ name: x.slice(0, 200) }));
const asProductArray = (v: string) => splitList(v).map((x) => ({ nom: x.slice(0, 200) }));
const asPersona = (v: string) => [{ name: firstClause(v, 120), lifestyle: v.trim().slice(0, 400) }];
const asRitual = (v: string) => [{ nom: firstClause(v, 120), description: v.trim().slice(0, 400) }];
const asSuperfan = (v: string) => ({ profile: v.trim().slice(0, 600) });

interface Mapping {
  /** Champ de schéma cible (path top-level). */
  field: string;
  /** Transforme la réponse texte en valeur de champ. */
  shape: (v: string) => unknown;
  /** Concatène au tableau existant du même champ (ex: 2 personas). */
  append?: boolean;
}

/**
 * Correspondances DÉTERMINISTES question-bank → champ de schéma. Uniquement
 * les mappings sémantiquement exacts (la question demande le contenu du champ).
 * Les questions select/scale (d_visual, e_loyalty…) et les champs non-inférables
 * (archetype-enum, tonDeVoix, herosJourney…) sont volontairement absents —
 * ils restent au LLM (ADR-0046, pas de fabrication).
 */
const SALVAGE_MAP: Record<AdvePillar, Record<string, Mapping>> = {
  a: {
    a_noyau: { field: "noyauIdentitaire", shape: asString },
    a_citation: { field: "citationFondatrice", shape: asString },
    a_mission: { field: "missionStatement", shape: asString },
    a_values: { field: "valeurs", shape: asValueArray },
  },
  d: {
    d_positioning: { field: "positionnement", shape: asString },
    d_promise: { field: "promesseMaitre", shape: asString },
    d_persona_principal: { field: "personas", shape: asPersona, append: true },
    d_persona_secondary: { field: "personas", shape: asPersona, append: true },
    d_competitors: { field: "paysageConcurrentiel", shape: asNamedArray },
  },
  v: {
    v_promise: { field: "promesseDeValeur", shape: asString },
    v_products: { field: "produitsCatalogue", shape: asProductArray },
  },
  e: {
    e_rituals: { field: "rituels", shape: asRitual, append: true },
    e_superfan: { field: "superfanPortrait", shape: asSuperfan },
  },
};

/**
 * Re-clé les réponses brutes d'un pilier vers les champs de schéma quand une
 * correspondance déterministe existe. Les réponses SANS mapping sont
 * conservées telles quelles (le rapport les restitue, le scorer les ignore) —
 * zéro perte de donnée. N'écrase jamais un champ déjà présent (sauf `append`).
 */
export function salvageRawResponses(
  pillar: string,
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const map = SALVAGE_MAP[pillar as AdvePillar];
  if (!map) return { ...raw };

  const out: Record<string, unknown> = {};
  const mappedFromQids = new Set<string>();

  for (const [qid, mapping] of Object.entries(map)) {
    const val = raw[qid];
    if (typeof val !== "string" || val.trim().length < 2) continue;
    mappedFromQids.add(qid);
    const shaped = mapping.shape(val);
    if (mapping.append && Array.isArray(shaped)) {
      const existing = Array.isArray(out[mapping.field]) ? (out[mapping.field] as unknown[]) : [];
      out[mapping.field] = [...existing, ...shaped];
    } else if (out[mapping.field] === undefined) {
      out[mapping.field] = shaped;
    }
  }

  // Conserver les réponses non-mappées (a_vision, a_origin, d_visual, e_loyalty…)
  // pour la restitution du rapport — sans jamais écraser un champ de schéma posé.
  for (const [qid, val] of Object.entries(raw)) {
    if (mappedFromQids.has(qid)) continue;
    if (out[qid] === undefined) out[qid] = val;
  }

  return out;
}

/** Vrai si le pilier a au moins une correspondance déterministe. */
export function hasSalvageMapping(pillar: string): boolean {
  return Boolean(SALVAGE_MAP[pillar as AdvePillar]);
}
