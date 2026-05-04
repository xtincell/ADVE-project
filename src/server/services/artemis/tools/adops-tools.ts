/**
 * AD/OPS Glory Tools — Art Direction Operations Console (ADR-0036).
 *
 * 6 outils atomiques qui exposent un poste de pilotage d'Art Direction senior :
 * expansion sémantique, hybridation conceptuelle, recherche multi-plateformes,
 * grille de décodage formel, génération de speech défensif, capture vault.
 *
 * Origine : prototype HTML standalone "AD/OPS — Art Direction Operations Console"
 * (6 modules connectés autour d'une seule query). Internalisé en Glory tools
 * Artemis pour intégration native dans la cascade Glory→Brief→Forge.
 *
 * Pas de cascade brief-to-forge (pas de `forgeOutput`) — ces outils produisent
 * des artefacts textuels (champ sémantique, brief hybride, grille d'analyse,
 * speech) qui alimentent en amont la Direction Artistique avant qu'un KV /
 * spot / packaging ne soit forgé par Ptah. Le `vault-capture` produit un
 * BrandAsset.kind=REFERENCE (capture documentaire).
 *
 * Tier : ces outils sont free (pas de `requiresPaidTier`) car ils tournent en
 * LLM/COMPOSE pur sans connecteur externe. La séquence orchestrée
 * `ADOPS-AD-DIRECTION` est paywall-able au niveau séquence si besoin.
 *
 * Layer : DC (Direction de Création) majoritaire — ces outils servent la
 * réflexion senior pré-production, pas la production en elle-même.
 *
 * Pillar source : D (Distinction) prioritaire — l'Art Direction est le bras
 * armé de Distinction. V (Value) en secondaire pour `defend-creative-direction`
 * qui articule la valeur défendue.
 */

import type { GloryToolDef } from "./registry";

/**
 * AD/OPS · EXPAND — Champ sémantique 5D.
 *
 * Pour une query courte (concept, mood, contrainte), génère un champ sémantique
 * structuré en 5 dimensions : mouvements graphiques, artistes/studios de
 * référence, matériaux/textures, époques, angles adjacents (cross-pollination).
 *
 * Output JSON exploitable par le module Decode et par la suggestion de
 * presets pour Cross.
 */
export const ADOPS_EXPAND_TOOL: GloryToolDef = {
  slug: "adops-expand-semantic-field",
  name: "AD/OPS Expand — Champ sémantique 5D",
  layer: "DC",
  order: 200,
  executionType: "LLM",
  pillarKeys: ["D"],
  requiredDrivers: [],
  dependencies: [],
  description:
    "Expanse une query courte (concept/mood/contrainte) en 5 dimensions sémantiques exploitables par un DA senior : mouvements, artistes, matériaux, époques, adjacents.",
  inputFields: ["query", "brand_dna", "constraints"],
  pillarBindings: {
    brand_dna: "a.noyauIdentitaire",
    constraints: "r.mitigationPriorities",
  },
  outputFormat: "semantic_field_json",
  promptTemplate: `En tant que Direction de Création senior, génère le champ sémantique 5D pour la query "{{query}}".
Contexte marque : {{brand_dna}}
Contraintes : {{constraints}}

Renvoie un JSON strict avec 5 clés :
{
  "movements": [string×6-12 — écoles/courants graphiques pertinents],
  "artists":   [string×6-12 — artistes/studios humains à creuser],
  "materials": [string×6-9  — textures, finitions, supports physiques],
  "eras":      [string×4-8  — fenêtres temporelles à fouiller, décennie près],
  "adjacent":  [string×4-6  — angles adjacents pour casser la bulle, cross-pollinate]
}

Discipline : noms propres réels, pas de jargon générique. Une école = un nom identifiable (ex: "Swiss Style", pas "design suisse").`,
  status: "ACTIVE",
};

/**
 * AD/OPS · CROSS — Hybridation conceptuelle A × B.
 *
 * Génère un brief hybride à partir de 2 concepts hétérogènes (ex: Brutalism ×
 * Afrofuturism). Produit le brief narratif + 3 tensions (formelle, lecture,
 * piège à éviter). Sert à forcer la distinctiveness en sortant des sentiers
 * battus de la catégorie.
 */
export const ADOPS_CROSS_TOOL: GloryToolDef = {
  slug: "adops-cross-pollinate-concepts",
  name: "AD/OPS Cross — Hybridation conceptuelle A × B",
  layer: "DC",
  order: 201,
  executionType: "LLM",
  pillarKeys: ["D"],
  requiredDrivers: [],
  dependencies: [],
  description:
    "Hybride 2 concepts hétérogènes (ex: Brutalism × Afrofuturism) en un brief créatif distinctif + 3 tensions stratégiques (formelle, lecture, piège à éviter).",
  inputFields: ["concept_a", "concept_b", "brand_dna"],
  pillarBindings: {
    brand_dna: "a.noyauIdentitaire",
  },
  outputFormat: "hybrid_brief_json",
  promptTemplate: `Hybride les concepts "{{concept_a}}" × "{{concept_b}}" en un brief créatif distinctif pour la marque ({{brand_dna}}).

Renvoie un JSON :
{
  "brief": "1 paragraphe — la friction comme territoire visuel inoccupé",
  "ratio": "70/30 ou 60/40 — quelle école domine, quelle subvertit",
  "tensions": {
    "formal":  "tension entre les codes formels des deux écoles",
    "reading": "stratégie de double-take (premier regard → second regard)",
    "pitfall": "le piège classique à éviter (ex: faire 50/50 mou)"
  },
  "activation_query": "1 query courte pour relancer Expand sur l'hybride"
}

Discipline : pas de banalités, le brief doit révéler une grammaire visuelle qu'aucun concurrent n'occupe.`,
  status: "ACTIVE",
};

/**
 * AD/OPS · LAUNCH — Vecteur de recherche multi-plateformes.
 *
 * COMPOSE pur : pour une query, retourne la liste catégorisée des plateformes
 * de recherche d'inspiration avec leurs URLs construits. 9 catégories
 * (inspiration, portfolios, editorial, type, photo, motion, architecture,
 * color, geo non-occidentales). Pas de LLM — pure composition d'URLs avec
 * traduction CN/JP intégrée.
 */
export const ADOPS_LAUNCH_TOOL: GloryToolDef = {
  slug: "adops-launch-research-vector",
  name: "AD/OPS Launch — Vecteur de recherche multi-plateformes",
  layer: "HYBRID",
  order: 202,
  executionType: "COMPOSE",
  pillarKeys: ["D"],
  requiredDrivers: [],
  dependencies: [],
  description:
    "Compose un vecteur de recherche multi-plateformes (Pinterest, Behance, Are.na, Cosmos, Fonts In Use, ZCOOL, pixiv, Nataal, etc.) catégorisé en 9 axes pour DA senior. Auto-traduction CN/JP pour les plateformes locales.",
  inputFields: ["query", "limit_per_category", "categories_filter"],
  pillarBindings: {},
  outputFormat: "platform_url_matrix_json",
  promptTemplate: `Composer la matrice de recherche AD/OPS pour la query "{{query}}".
Limite par catégorie : {{limit_per_category}} (default: all)
Filtrage : {{categories_filter}} (default: all 9 catégories)

Catégories canoniques :
- inspiration (Pinterest, Cosmos, Are.na, Savee, Designspiration, Mymind, Niice)
- portfolios (Behance, Dribbble, The Brand Identity, Brand New UC, Awwwards)
- editorial (It's Nice That, Fubiz, Étapes, Eye Magazine, Design Indaba, Wallpaper, AIGA)
- type (Fonts In Use, Typewolf, Future Fonts, Letterform Archive, Lost Type, Klim)
- photography (Booooooom, iGNANT, BJP, C41, Lensculture, Magnum)
- motion (Vimeo Staff Picks, Stash Media, Motionographer, Art of the Title)
- architecture (ArchDaily, Dezeen, Divisare, Hidden Architecture)
- color (Coolors, Colourlovers, Pinterest palettes, Khroma)
- global_geo (ZCOOL CN/zh, Huaban CN/zh, pixiv JP/ja, Notefolio KR, Behance Brasil/Africa, Yaz MA, Domestika LatAm, Nataal AF)

Output JSON : { categories: [{key, label, platforms: [{name, tag, url, meta}]}] }
URLs construits par interpolation de la query (encodeURIComponent côté consommateur). Pour global_geo CN/JP, traduire la query si dictionary connu.`,
  status: "ACTIVE",
};

/**
 * AD/OPS · DECODE — Grille d'analyse formelle 8 axes.
 *
 * Pour une référence visuelle (description ou URL), produit l'analyse formelle
 * structurée sur 8 axes : composition, palette, typographie, lumière/matière,
 * posture humaine, mouvement référencé, stratégie narrative, distinctiveness.
 * Chaque axe = 4 questions analytiques répondues.
 */
export const ADOPS_DECODE_TOOL: GloryToolDef = {
  slug: "adops-decode-reference-grid",
  name: "AD/OPS Decode — Grille d'analyse formelle 8 axes",
  layer: "DC",
  order: 203,
  executionType: "LLM",
  pillarKeys: ["D"],
  requiredDrivers: [],
  dependencies: [],
  description:
    "Décode une référence visuelle (description ou URL) selon 8 axes d'analyse formelle de DA senior : composition, palette, typographie, lumière/matière, posture humaine, mouvement référencé, stratégie narrative, distinctiveness.",
  inputFields: ["reference_description", "reference_url", "brand_context"],
  pillarBindings: {
    brand_context: "d.directionArtistique.moodboard.theme",
  },
  outputFormat: "decode_grid_json",
  promptTemplate: `Décoder la référence visuelle suivante avec la grille AD/OPS 8 axes.
Référence : {{reference_description}}
URL : {{reference_url}}
Contexte marque : {{brand_context}}

Pour chaque axe, répondre aux 4 questions analytiques avec précision (pas de generalité) :

1. COMPOSITION (comment l'œil voyage) : focal point, structure, densité, hiérarchie
2. PALETTE (température émotionnelle) : nombre de couleurs réelles, famille, saturation, source culturelle
3. TYPOGRAPHIE (incarnation de la voix) : familles, posture, tracking/leading, intervention sur lettres
4. LUMIÈRE & MATIÈRE (touch quotient) : type de lumière, texture dominante, profondeur, ce qu'on a envie de toucher
5. POSTURE HUMAINE (rapport au corps) : présence, regard, posture, qui est inclus/exclu
6. MOUVEMENT RÉFÉRENCÉ (école/époque) : école identifiable, décennie, influences secondaires, distance critique
7. STRATÉGIE NARRATIVE (ce que ça raconte sans le dire) : promesse implicite, contre quel concurrent, rituel d'usage suggéré, persona sociologique
8. DISTINCTIVENESS (pourquoi ça marque) : élément critique non-substituable, transgression de catégorie, ce qui est copiable / non

Renvoyer un JSON { axes: [{key, title, answers: [...4]}] }.`,
  status: "ACTIVE",
};

/**
 * AD/OPS · DEFEND — Speech défensif 6 sections.
 *
 * Construit un speech structuré pour défendre une direction créative en
 * comité ou devant client : ouverture (pari), ancrage stratégique (tension
 * résolue), audience & résonance, ancrage formel & références, distinctiveness,
 * closing (pari assumé). Sert directement la Value pillar.
 */
export const ADOPS_DEFEND_TOOL: GloryToolDef = {
  slug: "adops-defend-creative-direction",
  name: "AD/OPS Defend — Speech défensif 6 sections",
  layer: "DC",
  order: 204,
  executionType: "LLM",
  pillarKeys: ["D", "V"],
  requiredDrivers: [],
  dependencies: ["adops-expand-semantic-field"],
  description:
    "Construit un speech 6 sections pour défendre une direction créative devant client/comité : pari créatif, ancrage stratégique, audience, références, distinctiveness, closing.",
  inputFields: [
    "concept",
    "audience",
    "tension",
    "references",
    "movement",
    "brand_positioning",
  ],
  pillarBindings: {
    audience: "d.personas",
    brand_positioning: "d.positionnement",
  },
  outputFormat: "defense_speech_json",
  promptTemplate: `Construire le speech défensif AD/OPS pour la direction créative suivante.
Concept central : {{concept}}
Audience visée : {{audience}}
Tension stratégique résolue : {{tension}}
Références citées (séparées par ;) : {{references}}
Mouvement / époque dominante : {{movement}}
Positionnement marque : {{brand_positioning}}

Renvoyer un JSON { sections: [{h, body}] } avec exactement ces 6 sections :
1. OUVERTURE — LE PARI CRÉATIF (1 paragraphe punchy qui pose la proposition comme pari conscient)
2. ANCRAGE STRATÉGIQUE (résolution par déplacement, pas compromis — territoire 3ème voie)
3. AUDIENCE & RÉSONANCE (la cible reconnaît immédiatement les codes — ne pas lui apprendre, lui rappeler)
4. ANCRAGE FORMEL & RÉFÉRENCES (filiation revendiquée — pas nostalgie, héritage actualisé)
5. DISTINCTIVENESS — POURQUOI ÇA NE PEUT PAS VENIR D'AILLEURS (ce qu'aucun concurrent n'oserait, défendable parce que découle de la promesse)
6. CLOSING — LE PARI ASSUMÉ (refuser le compromis = transformer la marque en repère mental)

Discipline : prose défendable, ZÉRO superlatif vague, références citées explicitement (italique markdown).`,
  status: "ACTIVE",
};

/**
 * AD/OPS · VAULT CAPTURE — Capture documentaire structurée.
 *
 * COMPOSE pur : produit un BrandAsset.kind=REFERENCE structuré (titre, source
 * URL, tags, why-it-matters, query d'origine, date). Le caller décide ensuite
 * via mestor.emitIntent({ kind: "BRAND_ASSET_CREATE_REFERENCE" }) de promouvoir
 * la capture en BrandAsset matériel dans le vault de la marque.
 */
export const ADOPS_VAULT_TOOL: GloryToolDef = {
  slug: "adops-vault-capture",
  name: "AD/OPS Vault — Capture documentaire structurée",
  layer: "HYBRID",
  order: 205,
  executionType: "COMPOSE",
  pillarKeys: ["D"],
  requiredDrivers: [],
  dependencies: [],
  description:
    "Capture structurée d'une référence visuelle dans le vault DA : titre, source URL, tags, why-it-matters (l'angle qui frappe), query d'origine. Composé par le caller en BrandAsset.kind=REFERENCE.",
  inputFields: ["title", "source_url", "tags", "why_it_matters", "origin_query"],
  pillarBindings: {},
  outputFormat: "vault_reference_json",
  promptTemplate: `Composer une entrée de capture vault AD/OPS.
Titre : {{title}}
Source URL : {{source_url}}
Tags (csv) : {{tags}}
Why-it-matters : {{why_it_matters}}
Query d'origine : {{origin_query}}

Renvoyer un JSON :
{
  "title": string,
  "source": string (URL),
  "tags": string[],
  "why": string (l'angle qui frappe — pourquoi cette référence mérite d'être au vault),
  "originQuery": string,
  "capturedAt": ISO date,
  "suggestedBrandAssetKind": "REFERENCE",
  "suggestedPillar": "D"
}`,
  status: "ACTIVE",
};

/**
 * Set complet des Glory tools AD/OPS, à splatter dans EXTENDED_GLORY_TOOLS.
 *
 * Ajout EXTENDED only (pas CORE) — préserve la cardinalité 57 du test legacy
 * `glory-tools.test.ts` qui enforce le compte canonique.
 *
 * Cf. ADR-0036 — "AD/OPS Art Direction Operations Glory tools".
 */
export const ADOPS_TOOLS: GloryToolDef[] = [
  ADOPS_EXPAND_TOOL,
  ADOPS_CROSS_TOOL,
  ADOPS_LAUNCH_TOOL,
  ADOPS_DECODE_TOOL,
  ADOPS_DEFEND_TOOL,
  ADOPS_VAULT_TOOL,
];
