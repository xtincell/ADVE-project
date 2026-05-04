/**
 * BIBLE DES VARIABLES — Format de fond pour chaque variable ADVERTIS
 *
 * Pour chaque variable atomique, définit :
 *   - description : ce que cette variable représente (pour le LLM + l'UI)
 *   - format : le format attendu du CONTENU (pas le type TS — le fond)
 *   - examples : 1-2 exemples concrets
 *   - minLength / maxLength : contraintes de longueur (strings)
 *   - rules : règles métier spécifiques
 *   - derivedFrom : si dérivable, d'où
 *   - feedsInto : quels champs d'autres piliers en dépendent
 *
 * Utilisé par :
 *   - Le vault-enrichment (prompt LLM pour le format des proposedValue)
 *   - L'auto-filler (format des champs générés)
 *   - Le design system (labels, tooltips, placeholders)
 *   - La validation (au-delà du type Zod)
 */

// ── Types ──────────────────────────────────────────────────────────────

/**
 * Edition mode for OPERATOR_AMEND_PILLAR (ADR-0023).
 *  - INFERRED_NO_EDIT: derived/calculated; never editable manually.
 *  - PATCH_DIRECT: short scalar (name, enum, date, currency); operator types
 *    the new value directly.
 *  - LLM_REPHRASE: qualitative free text where the operator describes intent
 *    in natural language and Notoria proposes the rephrased value.
 *  - STRATEGIC_REWRITE: destructive or LOCKED-pillar field; requires
 *    overrideLocked + reason ≥20 chars + double-confirm.
 *
 * Set explicitly when the heuristic in {@link getEditableMode} is wrong
 * for a given field; otherwise the heuristic decides.
 */
export type EditableMode =
  | "INFERRED_NO_EDIT"
  | "PATCH_DIRECT"
  | "LLM_REPHRASE"
  | "STRATEGIC_REWRITE";

export interface VariableSpec {
  description: string;
  format: string;
  examples?: string[];
  minLength?: number;
  maxLength?: number;
  rules?: string[];
  derivedFrom?: string;
  feedsInto?: string[];
  /** Override the heuristic edition mode (ADR-0023). */
  editableMode?: EditableMode;
  /**
   * Canonical code from the ADVE manuel (ADR-0037 PR-K).
   * Format examples : "A1", "A6", "D5", "V12", "E4". Set to null
   * for fields that are derived (RTIS) or code-only (no manual
   * counterpart). Surfaced in cockpit pillar editor badges so the
   * operator who knows the manual recognises the field instantly.
   */
  canonicalCode?: string | null;
  /**
   * Human label from the ADVE manuel ("Le Messie", "Origin Myth",
   * "Compétences Divines", "Devotion Ladder", etc.). Used in tooltip
   * + auto-doc régen `docs/governance/VARIABLE-BIBLE-CANON.md`.
   */
  canonicalLabel?: string;
  /**
   * Section reference in the manual ("PILIER 1 §1.1", "PILIER 4 §4.5").
   * Mostly cosmetic — appears in `VARIABLE-BIBLE-CANON.md` to help
   * operators cross-reference. Optional.
   */
  manualSection?: string;
}

// ── PILIER A — AUTHENTICITÉ ───────────────────────────────────────────

export const BIBLE_A: Record<string, VariableSpec> = {
  nomMarque: {
    description: "Le nom commercial de la marque",
    format: "Nom propre, 1-5 mots, tel qu'il apparait sur les produits et communications",
    examples: ["CIMENCAM", "Brasseries du Cameroun", "UPgraders"],
    maxLength: 50,
    rules: ["Pas de description, juste le nom", "Majuscules si c'est le style de la marque"],
    feedsInto: ["d.assetsLinguistiques", "i.brandPlatform.name"],
  },
  accroche: {
    description: "Phrase identitaire qui résume l'essence de la marque en moins de 15 mots",
    format: "Une phrase courte, percutante, identitaire (pas un slogan publicitaire — c'est dans D)",
    examples: ["Le ciment qui protège les familles camerounaises", "De la Poussière à l'Étoile"],
    maxLength: 100,
    rules: ["Pas un slogan pub (ça c'est D.assetsLinguistiques.slogan)", "Doit refléter l'identité, pas vendre"],
  },
  description: {
    description: "Ce que fait la marque, en 2-3 phrases factuelles",
    format: "Texte descriptif : secteur, activité principale, taille/positionnement",
    examples: ["Cimenteries du Cameroun — leader du ciment en Afrique centrale. Filiale du groupe LafargeHolcim."],
    minLength: 50,
    maxLength: 500,
    rules: ["Factuel, pas marketing", "Doit permettre à quelqu'un qui ne connaît pas la marque de comprendre en 10 secondes"],
  },
  secteur: {
    description: "Le secteur d'activité de la marque",
    format: "Nom du secteur, 1-3 mots",
    examples: ["FMCG", "Matériaux de construction", "Tech fintech", "Hospitality"],
    maxLength: 50,
    feedsInto: ["t.triangulation", "i.catalogueParCanal"],
  },
  pays: {
    description: "Le pays/marché principal de la marque",
    format: "Code pays ISO 2 lettres ou nom complet",
    examples: ["CM", "Cameroun", "CI", "SN"],
    maxLength: 30,
    feedsInto: ["t.tamSamSom"],
  },
  brandNature: {
    description: "La nature fondamentale de ce que la marque EST",
    format: "Une des valeurs : PRODUCT, SERVICE, FESTIVAL_IP, MEDIA_IP, RETAIL_SPACE, PLATFORM, INSTITUTION",
    rules: ["Doit correspondre à l'enum BrandNature"],
  },
  langue: {
    description: "La langue principale de communication de la marque",
    format: "Code langue (fr, en, ar) ou nom complet",
    examples: ["fr", "en", "fr-CM"],
    feedsInto: ["d.assetsLinguistiques.languePrincipale"],
  },
  publicCible: {
    description: "Description générale de l'audience cible, en 1-2 phrases",
    format: "Phrase descriptive qui pose la cible AVANT que D.personas ne la détaille",
    examples: ["Les bâtisseurs camerounais : entrepreneurs BTP, familles en autoconstruction, architectes exigeants"],
    minLength: 20,
    maxLength: 300,
    rules: ["Pas une liste, une phrase", "D.personas détaillera ensuite chaque segment"],
    feedsInto: ["d.personas"],
  },
  promesseFondamentale: {
    description: "La croyance intime qui fonde le projet — pas un slogan, une CONVICTION",
    format: "Phrase commençant par 'Nous croyons que...' ou 'Le monde a besoin de...'",
    examples: ["Nous croyons que chaque famille camerounaise mérite un toit solide et durable", "Le monde créatif africain mérite des outils de classe mondiale"],
    minLength: 30,
    maxLength: 300,
    rules: ["Ce n'est PAS le positionnement (D)", "Ce n'est PAS le slogan (D)", "C'est la raison d'être profonde"],
    feedsInto: ["d.positionnement", "s.visionStrategique"],
  },
  archetype: {
    description: "L'archétype jungien primaire de la marque (pattern narratif profond)",
    format: "Un des 12 archétypes : INNOCENT, SAGE, EXPLORATEUR, REBELLE, MAGICIEN, HEROS, AMOUREUX, BOUFFON, CITOYEN, SOUVERAIN, CREATEUR, PROTECTEUR",
    rules: ["L'archétype n'est PAS un adjectif — c'est un pattern narratif", "Guide le ton de voix (D) et la direction artistique (D)"],
    feedsInto: ["d.archetypalExpression", "d.tonDeVoix", "d.directionArtistique"],
  },
  citationFondatrice: {
    description: "La conviction intime du fondateur qui a engendré le projet",
    format: "Citation entre guillemets, voix du fondateur, 1-3 phrases",
    examples: ["\"Je crois que chaque famille camerounaise mérite un toit solide et durable.\""],
    minLength: 30,
    maxLength: 300,
    rules: ["Pas un slogan — une croyance personnelle", "Si le fondateur a une vraie citation, la reprendre verbatim"],
  },
  noyauIdentitaire: {
    description: "L'ADN de la marque en 2-3 phrases — ce qu'elle fait, pour qui, pourquoi différemment",
    format: "Texte introspectif (regarde vers l'intérieur, pas vers le marché)",
    examples: ["CIMENCAM transforme la terre camerounaise en fondations durables depuis 60 ans. Notre ciment n'est pas un matériau — c'est une promesse de sécurité pour chaque famille qui construit."],
    minLength: 100,
    maxLength: 500,
    rules: ["N'est PAS le positionnement (D) — le noyau regarde l'intérieur, le positionnement regarde le marché", "Overlap < 50% avec D.positionnement"],
  },
  herosJourney: {
    description: "Le parcours héroïque de la marque en 5 actes narratifs",
    format: "Array de 3-5 objets { actNumber, title, narrative (100+ chars), emotionalArc, causalLink }",
    rules: ["Chaque acte doit avoir un lien causal avec le précédent", "L'acte 3 (épreuves) doit contenir au moins 1 obstacle concret", "L'arc émotionnel doit progresser"],
  },
  ikigai: {
    description: "Le framework Ikigai appliqué à la marque — 4 quadrants",
    format: "Objet { love (passion), competence (savoir-faire), worldNeed (besoin du monde), remuneration (modèle économique) }",
    rules: ["Chaque quadrant doit faire 50+ chars", "Les 4 doivent être cohérents entre eux"],
    minLength: 50,
  },
  valeurs: {
    description: "Les 1-3 valeurs fondamentales de la marque (modèle Schwartz — roue de 10 valeurs, la marque en choisit 3 MAXIMUM)",
    format: "Array d'objets { value (enum Schwartz parmi les 10: POUVOIR, ACCOMPLISSEMENT, HEDONISME, STIMULATION, AUTONOMIE, UNIVERSALISME, BIENVEILLANCE, TRADITION, CONFORMITE, SECURITE), customName, rank, justification (50+ chars), costOfHolding }",
    rules: ["3 maximum (une marque forte se concentre)", "Minimum 1 valeur", "Chaque valeur doit avoir une justification spécifique, pas générique", "Le costOfHolding = ce que ça coûte de maintenir cette valeur", "Les tensions entre valeurs (tensionWith) enrichissent l'identité"],
  },
  enemy: {
    description: "L'ennemi déclaré de la marque — ce contre quoi elle se bat",
    format: "Objet { name, manifesto, narrative, overtonMap { ourPosition, enemyPosition, battleground, shiftDirection } }",
    rules: ["L'ennemi n'est PAS un concurrent (c'est dans D)", "C'est un concept, un problème, une injustice", "Ex: 'Les contrefaçons qui mettent en danger les familles'"],
    examples: ["{ name: 'Les contrefaçons', manifesto: 'La sécurité n'est pas négociable' }"],
  },
  prophecy: {
    description: "La vision transformatrice de la marque — le monde qu'elle veut créer",
    format: "Objet { worldTransformed (100+ chars), pioneers, urgency, horizon } ou string legacy (100+ chars)",
    rules: ["worldTransformed = description du futur désiré", "pioneers = qui seront les premiers à adopter", "urgency = pourquoi maintenant"],
    feedsInto: ["s.visionStrategique", "s.fenetreOverton.perceptionCible"],
  },
  doctrine: {
    description: "Les dogmes et principes non-négociables de la marque",
    format: "Objet { dogmas (3+ strings), principles (3+ strings), practices (optional) } ou string legacy",
    rules: ["Les dogmes sont des affirmations absolues, non-négociables", "Les principes sont des règles de conduite"],
  },
  livingMythology: {
    description: "Le récit mythologique vivant de la marque — son canon narratif",
    format: "Objet { canon (200+ chars), extensionRules, captureSystem }",
    rules: ["Le canon = l'histoire officielle de la marque", "extensionRules = comment étendre l'histoire sans la trahir"],
  },
  equipeDirigeante: {
    description: "Les profils des membres de l'équipe dirigeante",
    format: "Array d'objets { nom, role, bio (2-3 phrases), experiencePasse[], competencesCles[], credentials[] }",
    rules: ["1 minimum, 10 maximum", "Chaque profil doit avoir au moins nom + role + bio"],
  },
  archetypeSecondary: {
    description: "Archétype jungien secondaire (nuance le primaire)",
    format: "Un des 12 archétypes (meme enum que archetype). Optionnel.",
    rules: ["Doit être différent de l archetype primaire", "Apporte une nuance, pas une contradiction"],
  },
  hierarchieCommunautaire: {
    description: "Les niveaux de la communauté de marque, mappés sur la Devotion Ladder",
    format: "Array de 4-6 objets { level (enum Devotion), description (40+ chars), privileges (30+ chars), entryCriteria }",
    rules: ["4 niveaux minimum", "Chaque niveau a un nom mémorable propre à la marque (pas 'Niveau 1')", "Les privilèges sont cumulatifs (chaque niveau a ce que le précédent n'a pas)"],
    feedsInto: ["e.gamification", "e.ladderProductAlignment"],
  },
  timelineNarrative: {
    description: "L histoire de la marque en 4 époques : origines, transformation, présent, futur",
    format: "Objet { origine (60+ chars), transformation (60+ chars), present (60+ chars), futur (60+ chars) }",
    rules: ["Au moins 3 des 4 sections remplies", "Cohérent avec le Hero's Journey (les 4 temps correspondent aux 5 actes)"],
    minLength: 60,
  },
  equipeComplementarite: {
    description: "Score de complémentarité de l'équipe dirigeante (dérivé automatiquement)",
    format: "Objet { scoreGlobal (0-10), couvertureTechnique (bool), couvertureCommerciale (bool), couvertureOperationnelle (bool), capaciteExecution (enum), lacunes[], verdict (1-2 phrases) }",
    rules: ["Calculé depuis equipeDirigeante", "Les lacunes sont les compétences manquantes"],
    derivedFrom: "a.equipeDirigeante (calcul)",
  },

  // ── ADR-0037 PR-K : nouveaux fields canon manuel ADVE ──────────────
  messieFondateur: {
    description: "Le Messie — figure charismatique principale qui incarne la marque (fondateur ou autre)",
    format: "Objet { nom, role, charismaScore { conviction (0-10), storytelling (0-10), presence (0-10), authenticity (0-10) }, narrative (50+ chars sur pourquoi c'est cette personne) }",
    rules: ["Si la marque n'a pas de figure incarnée, laisser null", "Le Messie peut être autre que le fondateur (ex: ambassadeur emblématique)"],
    canonicalCode: "A1bis",
    canonicalLabel: "Le Messie",
    manualSection: "PILIER 1 §1.1",
    feedsInto: ["a.equipeDirigeante"],
  },
  competencesDivines: {
    description: "Les 1-3 compétences que SEUL la marque peut accomplir (Compétences Divines du manuel)",
    format: "Array de 1-3 objets { competence (50+ chars), justification (pourquoi nous seuls), exclusivityProof (preuve concrète) }",
    rules: ["1 minimum, 3 maximum (concentration)", "Chaque compétence doit avoir une exclusivityProof factuelle, pas marketing"],
    canonicalCode: "A6",
    canonicalLabel: "Compétences Divines",
    manualSection: "PILIER 1 §1.6",
    examples: ["{ competence: 'Intégration hardware+software parfaite', justification: 'Apple contrôle stack complet vs Android fragmenté', exclusivityProof: '50%+ marges gross vs concurrents' }"],
  },
  preuvesAuthenticite: {
    description: "Les preuves tangibles d'origine et légitimité (ancienneté, certifications, reconnaissance fondateur)",
    format: "Array d'objets { type (heritage|certification|recognition|press|datapoint), claim, evidence, source, year? }",
    rules: ["≥2 preuves avec claim + evidence non vides", "Distinct de d.proofPoints qui prouve la différenciation/positionnement"],
    canonicalCode: "A8",
    canonicalLabel: "Preuves d'authenticité",
    manualSection: "PILIER 1 §1.8",
  },
  indexReputation: {
    description: "Index public de réputation — Google Reviews, Trustpilot, NPS, etc.",
    format: "Objet { source (enum: GOOGLE_REVIEWS|TRUSTPILOT|NPS|YELP|TRIPADVISOR|OTHER), score (0-10 ou 0-5 selon source), sampleSize, lastMeasured (ISO date), publicProofUrl? }",
    rules: ["score doit être normalisé selon la source", "publicProofUrl recommandé pour social proof"],
    canonicalCode: "A10",
    canonicalLabel: "Index de réputation",
    manualSection: "PILIER 1 §1.10",
  },
  eNps: {
    description: "Employee Net Promoter Score — engagement interne (proxy turnover)",
    format: "Objet { score (-100 à +100), sampleSize, frequency (QUARTERLY|ANNUAL), lastMeasured (ISO date), verbatims? (3 citations clés) }",
    rules: ["score = % promoters - % detractors (échelle 9-10 promoteurs, 0-6 détracteurs)", "Si non mesuré, laisser null + flag in dashboard"],
    canonicalCode: "A11",
    canonicalLabel: "eNPS",
    manualSection: "PILIER 1 §1.11",
  },
  turnoverRate: {
    description: "Taux de rotation interne — % collaborateurs partis sur 12 mois",
    format: "Number (0-1.0). 0.10 = 10% turnover annuel.",
    rules: ["Référence sectoriel : <10% = sain, 10-20% = surveillé, >20% = alarme"],
    canonicalCode: "A11bis",
    canonicalLabel: "Turnover interne",
    manualSection: "PILIER 1 §1.11",
  },
  missionStatement: {
    description: "Mission Statement — comment la marque réalise sa Vision (max 25 mots)",
    format: "Phrase commençant par un verbe d'action. Distinct du noyauIdentitaire (qui est l'ADN) et de la prophecy (qui est la Vision).",
    examples: ["Créer des produits qui changent la façon dont les gens interagissent avec la technologie"],
    maxLength: 200,
    canonicalCode: "A-Mission",
    canonicalLabel: "Mission Statement",
    manualSection: "PILIER 1 §1.3",
    feedsInto: ["s.syntheseExecutive"],
  },
  originMyth: {
    description: "Origin Myth en 3 versions — l'histoire fondatrice qui justifie l'existence",
    format: "Objet { elevator (≤50 mots), storytelling (3-7 paragraphes), longue (essai 1500+ mots optionnel) }",
    rules: ["L'elevator doit être mémorisable en 1 lecture", "Le storytelling raconte une lutte concrète", "Distinct du Hero's Journey 5-actes (qui est plus structurel)"],
    canonicalCode: "A5myth",
    canonicalLabel: "Origin Myth",
    manualSection: "PILIER 1 §1.5",
    feedsInto: ["a.herosJourney", "d.assetsLinguistiques"],
  },
};

// ── PILIER D — DISTINCTION ────────────────────────────────────────────

export const BIBLE_D: Record<string, VariableSpec> = {
  positionnement: {
    description: "La position unique de la marque sur le marché, en 1-2 phrases",
    format: "Texte qui regarde vers l'EXTÉRIEUR (le marché), pas l'intérieur (l'identité)",
    examples: ["Le ciment premium qui protège là où les low-cost trahissent"],
    maxLength: 200,
    rules: ["N'est PAS le noyauIdentitaire (A)", "Doit répondre à 'Pourquoi nous et pas un autre ?'"],
  },
  promesseMaitre: {
    description: "La promesse principale de la marque au client, en 1 phrase",
    format: "Phrase de 150 chars max, orientée bénéfice client",
    examples: ["Un ciment dont vous n'aurez jamais à douter"],
    maxLength: 150,
    feedsInto: ["e.promesseExperience", "v.promesseDeValeur"],
  },
  personas: {
    description: "Les 2-5 profils types de clients de la marque",
    format: "Array d'objets { name, age, csp, location, motivations (texte), fears (texte), hiddenDesire, jobsToBeDone[], devotionPotential (enum Devotion), rank }",
    rules: ["2 minimum, 5 maximum", "Rank 1 = persona principal", "Chaque persona doit avoir motivations + fears minimum"],
    derivedFrom: "a.publicCible",
    feedsInto: ["v.personaSegmentMap", "e.superfanPortrait"],
  },
  tonDeVoix: {
    description: "Le ton et la personnalité verbale de la marque",
    format: "Objet { personnalite (5-7 adjectifs), onDit (3+ phrases qu'on utilise), onNeditPas (2+ phrases qu'on n'utilise jamais) }",
    rules: ["personnalite = adjectifs, pas des phrases", "onDit et onNeditPas = exemples concrets de formulations"],
    derivedFrom: "a.archetype",
  },
  paysageConcurrentiel: {
    description: "Les 3+ concurrents directs avec forces/faiblesses",
    format: "Array d'objets { name, partDeMarcheEstimee, avantagesCompetitifs[], faiblesses[], strategiePos }",
    rules: ["3 minimum", "Chaque concurrent doit avoir au moins 1 avantage et 1 faiblesse"],
    feedsInto: ["t.triangulation.competitiveAnalysis", "t.competitorOvertonPositions"],
  },
  archetypalExpression: {
    description: "Comment l archetype A se traduit en expression visuelle et verbale",
    format: "Objet { visualTranslation (description visuelle), verbalTranslation (ton verbal), emotionalRegister (registre émotionnel) }",
    derivedFrom: "a.archetype",
    feedsInto: ["d.directionArtistique"],
  },
  sousPromesses: {
    description: "Déclinaisons de la promesse maître pour chaque segment/produit/contexte",
    format: "Array de 2+ strings. Chaque sous-promesse est 1 phrase qui décline la promesseMaitre.",
    rules: ["2 minimum", "Chaque sous-promesse cible un segment ou usage différent"],
    feedsInto: ["v.productLadder"],
  },
  assetsLinguistiques: {
    description: "Le vocabulaire propriétaire de la marque — slogan, tagline, mantras, lexique",
    format: "Objet { languePrincipale, languesSecondaires[], slogan (≤50 chars), tagline (≤100 chars), motto, mantras[] (≥1), lexiquePropre[] (≥3 termes { word, definition }) }",
    rules: ["Le slogan est publicitaire (pas l'accroche de A)", "Les mantras sont internes", "Le lexique crée un dialecte de marque (≥3 termes)"],
  },
  directionArtistique: {
    description: "Système de production visuelle — 11 sous-composites produits par le pipeline BRAND GLORY",
    format: "Objet avec 11 sous-objets : semioticAnalysis, visualLandscape, moodboard, chromaticStrategy, typographySystem, logoTypeRecommendation, logoValidation, designTokens, motionIdentity, brandGuidelines, lsiMatrix",
    rules: ["Rempli progressivement par les outils GLORY", "Les sous-composites #1-#4 + LSI doivent être complétés pour un score DA non-nul", "Chaque sous-objet a un gloryOutputId qui trace l'outil qui l'a produit"],
  },
  sacredObjects: {
    description: "Les objets sacrés de la marque — artefacts qui incarnent son identité",
    format: "Array d'objets { name, form, narrative, stage, socialSignal }",
    rules: ["≥1 objet avec nom + narrative non vides", "L'objet doit incarner une valeur ou un mythe de la marque"],
  },
  proofPoints: {
    description: "Les preuves tangibles des promesses de la marque",
    format: "Array d'objets { type, claim, evidence, source }",
    rules: ["≥2 preuves avec claim + evidence non vides", "type = le type de preuve (chiffre, témoignage, certification, test, etc.)"],
  },
  symboles: {
    description: "Les symboles visuels et culturels associés à la marque",
    format: "Array d'objets { symbol, meanings[], usageContexts[] }",
    rules: ["≥1 symbole avec meanings non vides"],
  },

  // ── ADR-0037 PR-K : nouveaux fields canon manuel ADVE ──────────────
  positionnementEmotionnel: {
    description: "Le ressenti unique que la marque déclenche chez son audience (distinct du positionnement business)",
    format: "Phrase à la 1ère personne, ≤200 chars. Capture l'émotion principale.",
    examples: ["Je me sens armé et inspiré", "Je deviens membre de l'élite créative"],
    maxLength: 200,
    canonicalCode: "D6",
    canonicalLabel: "Positionnement émotionnel",
    manualSection: "PILIER 2 §2.6",
    feedsInto: ["e.promesseExperience"],
  },
  swotFlash: {
    description: "SWOT version courte (1 phrase par quadrant) — usage marketing rapide vs r.globalSwot exhaustif",
    format: "Objet { strength, weakness, opportunity, threat } — 1 phrase chacun ≤120 chars",
    rules: ["Distinct de r.globalSwot (qui demande 3+ items par quadrant)", "Pour pitch deck / one-pager rapide"],
    canonicalCode: "D7",
    canonicalLabel: "SWOT Flash",
    manualSection: "PILIER 2 §2.7",
  },
  esov: {
    description: "Excess Share of Voice — écart entre part de voix et part de marché",
    format: "Objet { value (-1.0 à +1.0), measurementMethod, lastMeasured (ISO), source }",
    rules: ["value > 0 = SoV > SoM (croissance attendue)", "value < 0 = SoV < SoM (perte de pdm probable)", "Source typique : Nielsen, Ebiquity, ou benchmark sectoriel interne"],
    canonicalCode: "D10",
    canonicalLabel: "ESOV (Excess Share of Voice)",
    manualSection: "PILIER 2 §2.10",
  },
  barriersImitation: {
    description: "Barrières à l'imitation par la concurrence (au-delà de la PI)",
    format: "Array d'objets { barrier (40+ chars), defensibility (LOW|MEDIUM|HIGH), expectedDuration (months), category (data|network|brand|process|cost) }",
    rules: ["≥2 barrières avec defensibility ≥ MEDIUM", "Distinct de v.proprieteIntellectuelle (qui est juridique)"],
    canonicalCode: "D11",
    canonicalLabel: "Barrières imitation",
    manualSection: "PILIER 2 §2.11",
  },
  storyEvidenceRatio: {
    description: "Ratio Storytelling/Evidence dans la communication (équilibre récit / preuve)",
    format: "Objet { storytellingPct (0-100), evidencePct (0-100), target (objectif optimal pour le secteur) }",
    rules: ["storytellingPct + evidencePct = 100", "Le ratio cible varie par secteur : tech B2B = 30/70, mode = 70/30, FMCG = 50/50"],
    canonicalCode: "D12",
    canonicalLabel: "Ratio Storytelling/Evidence",
    manualSection: "PILIER 2 §2.12",
  },
};

// ── PILIER V — VALEUR ─────────────────────────────────────────────────

export const BIBLE_V: Record<string, VariableSpec> = {
  produitsCatalogue: {
    description: "Le catalogue complet des produits/services de la marque",
    format: "Array d'objets { nom, categorie (enum), prix, cout, margeUnitaire, gainClientConcret, lienPromesse, segmentCible, phaseLifecycle (enum) }",
    rules: ["1 minimum, 50 maximum", "gainClientConcret = bénéfice tangible, pas marketing", "segmentCible = ref D.personas"],
  },
  unitEconomics: {
    description: "Les métriques économiques unitaires de la marque",
    format: "Objet { cac (coût acquisition), ltv (lifetime value), ltvCacRatio (calculé), pointMort, margeNette, budgetCom (annuel), caVise (CA annuel visé) }",
    rules: ["cac et ltv en devise locale (XAF)", "ltvCacRatio ≥ 3 = sain, < 3 = alarme", "budgetCom et caVise sont des objectifs annuels"],
  },
  businessModel: {
    description: "Le modèle d'affaires fondamental",
    format: "String enum : PRODUCTION, DISTRIBUTION, SERVICES, ABONNEMENT, PLATEFORME, FREEMIUM_AD, LICENSING_IP, etc.",
    derivedFrom: "Strategy.businessContext",
  },
  pricingJustification: {
    description: "Pourquoi CE prix pour CE positionnement",
    format: "Texte 1-3 phrases qui lie D.positionnement → V.prix",
    examples: ["Notre premium de 15-20% est justifié par la garantie qualité blockchain et le réseau de 5000 distributeurs experts"],
    derivedFrom: "d.positionnement",
  },
  economicModels: {
    description: "Les modèles économiques de capture de valeur",
    format: "Array de strings : VENTE_DIRECTE, ABONNEMENT, COMMISSION, FREEMIUM, PUBLICITE, LICENCE, etc.",
    derivedFrom: "Strategy.businessContext",
  },
  positioningArchetype: {
    description: "L'archétype de positionnement prix (de ultra-luxe à low-cost)",
    format: "String enum : ULTRA_LUXE, LUXE, PREMIUM, MASSTIGE, MAINSTREAM, VALUE, LOW_COST",
    derivedFrom: "Strategy.businessContext",
  },
  salesChannel: {
    description: "Le canal de vente principal — comment le produit atteint le client final",
    format: "String enum : DIRECT, INTERMEDIATED, HYBRID",
    derivedFrom: "Strategy.businessContext",
  },
  freeLayer: {
    description: "Pour les modèles freemium : ce qui est gratuit vs payant",
    format: "Objet { whatIsFree, whatIsPaid, conversionLever }",
    rules: ["Rempli uniquement si le modèle est freemium"],
  },
  personaSegmentMap: {
    description: "Quel persona (D) achète quel produit (V) à quel niveau Devotion",
    format: "Array d'objets { personaName (ref D.personas), productNames[] (ref V.produits), devotionLevel (enum), revenueContributionPct }",
    derivedFrom: "d.personas + v.produitsCatalogue",
    rules: ["Chaque persona de D doit avoir au moins 1 produit", "La somme des revenueContributionPct ≈ 100%"],
  },
  productLadder: {
    description: "L'échelle de produits par tier (entrée de gamme → premium)",
    format: "Array de 2-5 objets { tier (nom, pas 'Tier 1'), prix, produitIds[], cible (ref persona), position (rang) }",
    rules: ["2 minimum", "Prix croissants", "Chaque tier cible un persona ou un usage distinct"],
    feedsInto: ["e.ladderProductAlignment"],
  },
  promesseDeValeur: {
    description: "La proposition de valeur globale de la marque (synthèse V)",
    format: "Texte 1-3 phrases, orienté bénéfice client global",
    maxLength: 300,
  },
  valeurMarqueTangible: { description: "Valeurs tangibles créées pour la marque", format: "Array de strings, ≥1 item", rules: ["Avantages concrets, mesurables"] },
  valeurMarqueIntangible: { description: "Valeurs intangibles créées pour la marque", format: "Array de strings, ≥1 item", rules: ["Réputation, image, capital marque"] },
  valeurClientTangible: { description: "Bénéfices fonctionnels pour le client", format: "Array de strings, ≥1 item", rules: ["Gains concrets : temps, argent, qualité"] },
  valeurClientIntangible: { description: "Bénéfices émotionnels et sociaux pour le client", format: "Array de strings, ≥1 item", rules: ["Statut, appartenance, sérénité, fierté"] },
  coutMarqueTangible: { description: "Coûts tangibles pour la marque (CAPEX, production)", format: "Array de strings, ≥1 item" },
  coutMarqueIntangible: { description: "Coûts cachés pour la marque (complexité, risques)", format: "Array de strings, ≥1 item" },
  coutClientTangible: { description: "Frictions pour le client (prix, délai, effort)", format: "Array de strings avec solutions, ≥1 item" },
  coutClientIntangible: { description: "Coûts psychologiques pour le client (peur, honte, doute)", format: "Array de strings, ≥1 item" },
  mvp: {
    description: "Statut du produit/prototype (Berkus: Product/Prototype milestone)",
    format: "Objet { exists (bool), stage (IDEA→POC→PROTOTYPE→MVP→PRODUCT→SCALED), description, features[], launchDate, userCount, feedbackSummary }",
  },
  proprieteIntellectuelle: {
    description: "Brevets, secrets commerciaux, barrières à l'entrée (Berkus: IP milestone)",
    format: "Objet { brevets[], secretsCommerciaux[], technologieProprietary, barrieresEntree[], licences[], protectionScore (0-10) }",
  },

  // ── ADR-0037 PR-K : nouveaux fields canon manuel ADVE ──────────────
  roiProofs: {
    description: "Preuves chiffrées de ROI client — testimoniaux quantifiés",
    format: "Array d'objets { client?, beforeMetric, afterMetric, lift (% ou x), timeframe, attestation? (citation client) }",
    rules: ["≥2 preuves avec before/after concrets", "Distinct de unitEconomics (LTV/CAC) qui est interne"],
    canonicalCode: "V7",
    canonicalLabel: "ROI Proof",
    manualSection: "PILIER 3 §3.7",
    examples: ["{ client: 'Matanga Agency', beforeMetric: '12 leads/mois', afterMetric: '40 leads/mois', lift: '+233%', timeframe: '90j' }"],
  },
  experienceMultisensorielle: {
    description: "Architecture des 5 sens — comment la marque engage chaque modalité sensorielle",
    format: "Objet { vue, ouie, odorat, toucher, gout } — chaque champ : 1-2 phrases ou null si non-applicable",
    rules: ["Au moins 2 sens doivent être adressés", "Pour B2B : vue + ouïe au minimum (interfaces, présentation)"],
    canonicalCode: "V-MultiSens",
    canonicalLabel: "Architecture Multisensorielle",
    manualSection: "PILIER 3 §3.3",
  },
  sacrificeRequis: {
    description: "Le sacrifice demandé au client (prix, temps, effort) et sa justification",
    format: "Objet { prix (montant ou range), temps (durée onboarding/usage), effort (cognitif/physique), justification (pourquoi ça vaut le coup) }",
    rules: ["Le sacrifice doit être nommé explicitement, pas masqué", "La justification doit lier au bénéfice multiplicateur"],
    canonicalCode: "V-Sacrifice",
    canonicalLabel: "Sacrifice Requis",
    manualSection: "PILIER 3 §3.6",
  },
  packagingExperience: {
    description: "L'expérience d'unboxing / réception / découverte du produit",
    format: "Objet { unboxingRitual (steps), packagingMaterial (premium/standard/eco), deliveryMode (express/standard/event), sensoryNotes (texte court), instagrammable (bool) }",
    rules: ["Pour produits physiques : remplir intégralement", "Pour services digitaux : décrire l'onboarding equivalent"],
    canonicalCode: "V-Packaging",
    canonicalLabel: "Packaging & Delivery",
    manualSection: "PILIER 3 §3.7",
  },
};

// ── PILIER E — ENGAGEMENT ─────────────────────────────────────────────

export const BIBLE_E: Record<string, VariableSpec> = {
  promesseExperience: {
    description: "L'expérience que chaque interaction avec la marque garantit",
    format: "1 phrase, orientée sensation/émotion du client",
    examples: ["La certitude que votre chantier tiendra"],
    derivedFrom: "d.promesseMaitre",
  },
  superfanPortrait: {
    description: "Le profil du superfan cible — l'évangéliste qu'on vise",
    format: "Objet { personaRef (ref D.personas), motivations[], barriers[], profile (texte) }",
    rules: ["personaRef = le persona de D qui a le plus haut devotionPotential", "barriers = ce qui empêche la montée dans la Devotion Ladder"],
    derivedFrom: "d.personas (le plus haut devotionPotential)",
  },
  touchpoints: {
    description: "Les 5-15 points de contact entre la marque et son audience",
    format: "Array d'objets { canal, type (enum), channelRef (enum), role (texte), aarrStage (enum AARRR), devotionLevel[] }",
    rules: ["5 minimum, 15 maximum", "Chaque touchpoint doit avoir un rôle clair et un stage AARRR"],
  },
  rituels: {
    description: "Les 3-10 rituels de marque qui créent l'habitude et la fidélité",
    format: "Array d'objets { nom, type (enum), frequency (enum), description (texte), devotionLevels[], aarrPrimary (enum), kpiMeasure }",
    rules: ["3 minimum", "Chaque rituel doit cibler au moins 1 niveau Devotion"],
  },
  primaryChannel: { description: "Canal principal d'engagement de la marque", format: "Enum canal : INSTAGRAM, FACEBOOK, TIKTOK, WEBSITE, EVENT, etc.", derivedFrom: "Strategy.primaryChannel" },
  productExperienceMap: { description: "Comment chaque produit (V) se traduit en expérience", format: "Array d'objets { productRef (ref V.produit), experienceDescription, touchpointRefs[], emotionalOutcome }", derivedFrom: "v.produitsCatalogue" },
  ladderProductAlignment: { description: "Mapping Devotion Ladder ↔ Product Ladder", format: "Array d'objets { devotionLevel (enum), productTierRef (ref V.productLadder), entryAction, upgradeAction }", derivedFrom: "v.productLadder + e.touchpoints" },
  channelTouchpointMap: { description: "Quels touchpoints sur quels canaux de vente", format: "Array d'objets { salesChannel (DIRECT|INTERMEDIATED|HYBRID), touchpointRefs[] }", derivedFrom: "v.salesChannel" },
  conversionTriggers: { description: "Ce qui fait passer quelqu'un d'un niveau Devotion au suivant", format: "Array d'objets { fromLevel (enum), toLevel (enum), trigger (texte), channel }", rules: ["1 trigger par transition de niveau"] },
  barriersEngagement: { description: "Ce qui bloque la montée dans la Devotion Ladder", format: "Array d'objets { level (enum), barrier (texte), mitigation }", rules: ["Identifier les points de friction par niveau"] },
  principesCommunautaires: { description: "Les règles de la communauté de marque", format: "Array d'objets { principle (texte), enforcement (comment c'est appliqué) }", rules: ["3 minimum"] },
  gamification: { description: "Système de progression ludique", format: "Objet { niveaux[] (3+ objets { niveau, condition, reward, duration }), recompenses[] }", rules: ["3 niveaux minimum", "Doit correspondre aux niveaux de A.hierarchieCommunautaire"] },
  aarrr: { description: "Le funnel AARRR appliqué à la marque", format: "Objet { acquisition (80+ chars), activation (80+ chars), retention (80+ chars), revenue (80+ chars), referral (80+ chars) }", rules: ["Chaque étape doit être spécifique à la marque, pas générique"], minLength: 80 },
  kpis: { description: "Les KPIs de mesure d'engagement", format: "Array de 6+ objets { name, metricType (ENGAGEMENT|FINANCIAL|BEHAVIORAL|SATISFACTION), target (nombre), frequency (DAILY|WEEKLY|MONTHLY) }", rules: ["6 minimum"] },
  taboos: { description: "Les tabous de la communauté — ce qu'on ne fait JAMAIS", format: "Array d'objets { taboo (texte), consequence }", rules: ["Ce qui est interdit dans l'écosystème de la marque"] },
  sacredCalendar: { description: "Le calendrier sacré de la marque — dates et moments clés", format: "Array de 4+ objets { date, name, significance }", rules: ["4 minimum", "Les dates qui rythment la vie de la communauté"] },
  commandments: { description: "Les commandements de la marque — règles non-négociables", format: "Array de max 10 objets { commandment, justification }", rules: ["Formulés comme des impératifs", "Justifiés par les valeurs"] },
  ritesDePassage: { description: "Les rituels de transition entre niveaux Devotion", format: "Array d'objets { fromStage (enum), toStage (enum), rituelEntree, symboles[] }", rules: ["Un rite par transition de niveau"] },
  sacraments: { description: "Les sacrements de la marque — moments d'engagement profond", format: "Array de 5+ objets { nomSacre, trigger, action, reward, kpi, aarrStage (enum) }", rules: ["5 minimum", "Chaque sacrement doit être lié à un stade AARRR"] },

  // ── ADR-0037 PR-K : nouveaux fields canon manuel ADVE ──────────────
  clergeStructure: {
    description: "Le Clergé — équipe d'incarnation de la marque (CM, ambassadeurs, evangelists, support)",
    format: "Objet { communityManager { name, role, status (FULL_TIME|PART_TIME|VOLUNTEER) } | null, ambassadeurs (array d'objets { name, reach, tier ALPHA|BETA|MICRO }), supportTeam { size, sla }, specialists (array { name, expertise }) }",
    rules: ["communityManager peut être null si solo founder", "ambassadeurs ≥1 dès Devotion 5 atteint"],
    canonicalCode: "E-Clerge",
    canonicalLabel: "Le Clergé",
    manualSection: "PILIER 4 §4.5",
  },
  pelerinages: {
    description: "Les Pèlerinages — événements majeurs (vs touchpoints quotidiens en e.touchpoints)",
    format: "Array d'objets { name, frequency (ANNUAL|BIANNUAL|QUARTERLY), location (physical address ou 'virtual'), expectedAttendance, devotionLevelTarget (enum), entryRitual? }",
    rules: ["≥1 pèlerinage pour brands en stage CULTE+", "Un pèlerinage = événement de transformation, pas une simple promo"],
    canonicalCode: "E-Pelerinages",
    canonicalLabel: "Les Pèlerinages",
    manualSection: "PILIER 4 §4.6",
    examples: ["{ name: 'WWDC', frequency: 'ANNUAL', location: 'Cupertino', expectedAttendance: 5000, devotionLevelTarget: 'EVANGELISTE' }"],
  },
  programmeEvangelisation: {
    description: "Système qui transforme clients en recruteurs actifs",
    format: "Objet { referralProgram { incentive, viralCoefficient (k), launchedAt? } | null, brandAdvocacyProgram { tiers, rewards, kpi } | null, communityRecruitment { channels, conversionRate? } | null }",
    rules: ["Au moins UN programme actif", "viralCoefficient k ≥ 1.0 = croissance organique virale"],
    canonicalCode: "E-Evangelisation",
    canonicalLabel: "Programme d'Évangélisation",
    manualSection: "PILIER 4 §4.7",
  },
  communityBuilding: {
    description: "Architecture de construction communautaire (vs e.principesCommunautaires qui sont les règles)",
    format: "Objet { platforms (array { name, type DISCORD|SLACK|FACEBOOK_GROUP|FORUM|CIRCLE|OTHER, memberCount }), moderationRules (3+ rules), growthMechanics (referral|content|events) }",
    rules: ["≥1 plateforme active", "moderationRules doivent inclure : code de conduite + escalation + sanctions"],
    canonicalCode: "E-Community",
    canonicalLabel: "Community Building",
    manualSection: "PILIER 4 §4.8",
  },
};

// ── PILIER R — RISK ───────────────────────────────────────────────────

export const BIBLE_R: Record<string, VariableSpec> = {
  globalSwot: {
    description: "Analyse SWOT globale de la marque",
    format: "Objet { strengths[3+], weaknesses[3+], opportunities[3+], threats[3+] }",
    rules: ["3 items minimum par quadrant", "Chaque item = 1 phrase spécifique, pas générique"],
  },
  overtonBlockers: {
    description: "Les risques qui bloquent spécifiquement le déplacement de la Fenêtre d'Overton",
    format: "Array d'objets { risk, blockingPerception (quelle perception est bloquée), mitigation, devotionLevelBlocked }",
    rules: ["Chaque blocker doit nommer la perception bloquée et le niveau Devotion impacté"],
  },
  riskScore: {
    description: "Score de risque global 0-100 (0 = pas de risque, 100 = risque maximal)",
    format: "Nombre entier 0-100, calculé comme la moyenne pondérée de probabilité × impact",
    rules: ["Calculable automatiquement depuis probabilityImpactMatrix"],
    derivedFrom: "r.probabilityImpactMatrix (calcul)",
  },
  pillarGaps: { description: "Diagnostic par pilier ADVE — score + lacunes", format: "Objet { a: { score, gaps[] }, d: {...}, v: {...}, e: {...} }", derivedFrom: "Maturity assessment des piliers ADVE (calcul)" },
  coherenceRisks: { description: "Contradictions détectées entre piliers", format: "Array d'objets { pillar1, pillar2, field1, field2, contradiction, severity (LOW|MEDIUM|HIGH) }", rules: ["Ex: A dit 'premium' mais V a des prix low-cost"] },
  devotionVulnerabilities: { description: "Niveaux de la Devotion Ladder où la marque perd du monde", format: "Array d'objets { level (enum Devotion), churnCause (texte), mitigation }" },
  microSWOTs: { description: "SWOT detaille par pilier ADVE — forces/faiblesses/opportunites/menaces specifiques a chaque dimension", format: "Record { pillarKey: { strengths[], weaknesses[], opportunities[], threats[] } }", rules: ["1 micro-SWOT par pilier ADVE"] },
  probabilityImpactMatrix: { description: "Matrice de risques avec probabilité × impact", format: "Array de 5+ objets { risk (texte), probability (LOW|MEDIUM|HIGH), impact (LOW|MEDIUM|HIGH), mitigation (texte 40+ chars) }", rules: ["5 minimum", "Chaque risque a une mitigation concrète"] },
  mitigationPriorities: { description: "Actions de mitigation prioritaires", format: "Array de 5+ objets { action (40+ chars), owner, timeline, investment }", rules: ["5 minimum", "Chaque action est concrète et assignable"] },
};

// ── PILIER T — TRACK ──────────────────────────────────────────────────

export const BIBLE_T: Record<string, VariableSpec> = {
  overtonPosition: {
    description: "La position actuelle de la Fenêtre d'Overton — comment le marché perçoit la marque MAINTENANT",
    format: "Objet { currentPerception (texte), marketSegments[{ segment, perception }], confidence 0-1 }",
    rules: ["currentPerception = perception RÉELLE, pas souhaitée", "marketSegments = comment différents segments voient la marque"],
  },
  perceptionGap: {
    description: "L'écart entre la perception actuelle (T) et la perception cible (A.prophecy + D.positionnement)",
    format: "Objet { currentPerception, targetPerception, gapDescription, gapScore 0-100 }",
    rules: ["gapScore 0 = aucun écart, 100 = perception totalement opposée", "C'est le KPI d'entrée de S"],
    derivedFrom: "t.overtonPosition + a.prophecy + d.positionnement",
    feedsInto: ["s.fenetreOverton"],
  },
  tamSamSom: {
    description: "Taille du marché adressable (Total, Serviceable, Obtainable)",
    format: "Objet { tam { value, description, source }, sam { value, description, source }, som { value, description, source } }",
    rules: ["TAM > SAM > SOM toujours", "Chaque valeur doit avoir source: 'ai_estimate' ou 'verified'", "Les estimations IA doivent être marquées comme telles"],
  },
  riskValidation: { description: "Chaque risque R confronté au marché", format: "Array d'objets { riskRef (ref R.matrix), marketEvidence, status (CONFIRMED|DENIED|UNKNOWN), source (ai_estimate|verified) }", rules: ["T ne met JAMAIS status=VALIDATED sans source externe"] },
  competitorOvertonPositions: { description: "Position des concurrents sur la Fenêtre d'Overton", format: "Array d'objets { competitorName (ref D.concurrents), overtonPosition (texte), relativeToUs (AHEAD|BEHIND|PARALLEL|DIVERGENT) }", derivedFrom: "d.paysageConcurrentiel" },
  triangulation: { description: "Croisement de 4 sources de données marché", format: "Objet { customerInterviews (100+ chars), competitiveAnalysis (100+ chars), trendAnalysis (100+ chars), financialBenchmarks (100+ chars) }", rules: ["Chaque source doit être spécifique, pas générique", "Citer les données réelles extraites de ADVE"], minLength: 100 },
  hypothesisValidation: { description: "Hypothèses de marché à valider", format: "Array de 5+ objets { hypothesis, validationMethod, status (HYPOTHESIS|TESTING|VALIDATED|INVALIDATED), evidence }", rules: ["5 minimum", "VALIDATED uniquement avec source externe", "Le LLM peut produire HYPOTHESIS ou TESTING, jamais VALIDATED"] },
  marketReality: { description: "Macro-tendances et signaux faibles du marché", format: "Objet { macroTrends[] (3+), weakSignals[] (2+) }", rules: ["macroTrends = tendances lourdes vérifiables", "weakSignals = signaux émergents à surveiller"] },
  brandMarketFitScore: { description: "Score d'adéquation marque-marché (0-100)", format: "Nombre 0-100, calculé depuis les hypothèses validées + triangulation", derivedFrom: "t.hypothesisValidation + t.triangulation (calcul)" },
  weakSignalAnalysis: { description: "Analyse des signaux faibles avec chaînes causales (TARSIS)", format: "Array d'objets { thesis, rawEvent, causalChain[], impactCategory, brandImpact, confidence, urgency, recommendedAction }" },
  marketDataSources: { description: "Sources de données marché utilisées", format: "Array d'objets { sourceType, title, reliability (0-1) }" },
  lastMarketDataRefresh: { description: "Date de dernière actualisation des données marché", format: "ISO date string" },
  sectorKnowledgeReused: { description: "Si les données sectorielles cross-brand ont été réutilisées", format: "Boolean" },
  traction: { description: "Preuves de traction marché (Berkus: Business Relationships)", format: "Objet { loisSignees[], utilisateursInscrits, utilisateursActifs, croissanceHebdo, revenusRecurrents, metriqueCle { nom, valeur, tendance }, preuvesTraction[], tractionScore (0-10) }" },
};

// ── PILIER I — INNOVATION ─────────────────────────────────────────────

export const BIBLE_I: Record<string, VariableSpec> = {
  catalogueParCanal: {
    description: "Catalogue EXHAUSTIF de toutes les actions possibles, organisé par canal",
    format: "Record { DIGITAL: actions[], EVENEMENTIEL: actions[], MEDIA_TRADITIONNEL: actions[], PR_INFLUENCE: actions[], PRODUCTION: actions[], RETAIL_DISTRIBUTION: actions[] }",
    rules: ["5+ actions par canal minimum", "Chaque action : { action (texte), format, objectif, pilierImpact, devotionImpact, overtonShift }"],
  },
  innovationsProduit: {
    description: "Les innovations produit/marque possibles — extensions, pivots, co-branding",
    format: "Array d'objets { name, type (enum), description, feasibility (HIGH/MEDIUM/LOW), horizon (COURT/MOYEN/LONG), devotionImpact }",
    rules: ["type : EXTENSION_GAMME, EXTENSION_MARQUE, CO_BRANDING, PIVOT, DIVERSIFICATION"],
  },
  actionsByDevotionLevel: {
    description: "Le catalogue trié par niveau Devotion Ladder au lieu de par canal",
    format: "Objet { SPECTATEUR: actions[], INTERESSE: actions[], PARTICIPANT: actions[], ENGAGE: actions[], AMBASSADEUR: actions[], EVANGELISTE: actions[] }",
    rules: ["Doit couvrir les 6 niveaux", "Chaque action doit être dans le bon niveau"],
    derivedFrom: "i.catalogueParCanal (re-tri par devotionImpact)",
  },
  actionsByOvertonPhase: { description: "Actions groupées par phase de déplacement Overton", format: "Array d'objets { phase (early adopters|mainstream|résistants), actions[] }" },
  riskMitigationActions: { description: "Actions qui mitigent spécifiquement les risques R", format: "Array d'objets { riskRef (ref R.matrix), action, canal, expectedImpact }", derivedFrom: "r.mitigationPriorities × i.catalogueParCanal" },
  hypothesisTestActions: { description: "Actions qui testent les hypothèses T non-validées", format: "Array d'objets { hypothesisRef (ref T.hypotheses), testAction, expectedOutcome, cost (LOW|MEDIUM|HIGH) }", derivedFrom: "t.hypothesisValidation (status=HYPOTHESIS|TESTING)" },
  assetsProduisibles: { description: "Tous les assets créatifs que la marque peut produire", format: "Array de 15+ objets { asset, type (VIDEO|PRINT|DIGITAL|PHOTO|AUDIO|PACKAGING|EXPERIENCE), usage }", rules: ["15 minimum", "Couvrir tous les types"] },
  activationsPossibles: { description: "Toutes les activations terrain/digitales possibles", format: "Array de 10+ objets { activation, canal, cible, budgetEstime (LOW|MEDIUM|HIGH) }", rules: ["10 minimum"] },
  formatsDisponibles: { description: "Tous les formats créatifs possibles", format: "Array de 10+ strings (reels, billboards, podcasts, etc.)", rules: ["10 minimum"] },
  totalActions: { description: "Compteur total d'actions dans le catalogue", format: "Nombre entier", derivedFrom: "i.catalogueParCanal (somme)" },
  brandPlatform: { description: "Plateforme de marque — synthèse stratégique", format: "Objet { name, benefit, target, competitiveAdvantage, emotionalBenefit, functionalBenefit, supportedBy }", derivedFrom: "a.noyauIdentitaire + d.positionnement + d.promesseMaitre" },
  copyStrategy: { description: "Stratégie de copywriting — promesse, RTB, ton, messages clés", format: "Objet { promise, rtb, tonOfVoice, keyMessages[], doNot[] }" },
  bigIdea: { description: "Le concept central de la marque", format: "Objet { concept, mechanism, insight, adaptations[] }" },
  potentielBudget: { description: "Fourchettes budgétaires pour le potentiel identifié", format: "Objet { production, media, talent, logistics, technology, total } (en XAF)" },
  mediaPlan: { description: "Plan media potentiel — repartition budgetaire par canal avec objectifs et KPIs", format: "Objet { totalBudget, channels[] { channel, budget, percentage, objective, kpi } }" },
  generationMeta: { description: "Métadonnées de génération du pilier I", format: "Objet { gloryToolsUsed[], qualityScore (0-100), generatedAt (ISO date) }" },
};

// ── PILIER S — STRATEGY ───────────────────────────────────────────────

export const BIBLE_S: Record<string, VariableSpec> = {
  fenetreOverton: {
    description: "La Fenêtre d'Overton — LE CŒUR de S. Perception actuelle vs cible, stratégie de déplacement",
    format: "Objet { perceptionActuelle, perceptionCible, ecart, strategieDeplacement[{ etape, action, canal, horizon, devotionTarget, riskRef, hypothesisRef }] }",
    rules: ["REQUIRED (pas optionnel)", "strategieDeplacement : 3+ étapes", "Chaque étape doit cibler un niveau Devotion", "perceptionActuelle vient de T.overtonPosition", "perceptionCible vient de A.prophecy + D.positionnement"],
    derivedFrom: "t.overtonPosition + a.prophecy + d.positionnement",
  },
  selectedFromI: {
    description: "Les actions choisies depuis I.catalogueParCanal pour la roadmap",
    format: "Array d'objets { sourceRef (path dans I), action, phase (phase roadmap), priority }",
    rules: ["Traçabilité : chaque action référence son origine dans I", "Permet de revoir les choix plus tard"],
    derivedFrom: "i.catalogueParCanal (sélection)",
  },
  devotionFunnel: {
    description: "Objectifs quantifiés de progression Devotion Ladder par phase de la roadmap",
    format: "Array d'objets { phase, spectateurs, interesses, participants, engages, ambassadeurs, evangelistes }",
    rules: ["1 entrée par phase de la roadmap", "Les chiffres sont des objectifs, pas des mesures"],
  },
  northStarKPI: {
    description: "Le KPI ultime — progression sur la Devotion Ladder",
    format: "Objet { name, target, frequency (DAILY/WEEKLY/MONTHLY/QUARTERLY), currentValue }",
    rules: ["Toujours orienté Devotion Ladder", "Le target doit être quantifié"],
    examples: ["{ name: 'Progression Devotion Ladder', target: '+10% d'évangélistes par trimestre', frequency: 'MONTHLY' }"],
  },
  visionStrategique: { description: "La vision stratégique à long terme", format: "Texte 200+ chars qui décrit le futur stratégique de la marque", minLength: 200, derivedFrom: "a.prophecy" },
  syntheseExecutive: { description: "Résumé exécutif de la stratégie complète", format: "Texte 400+ chars qui répond à : 'Comment on déplace la perception pour transformer des spectateurs en évangélistes'", minLength: 400 },
  axesStrategiques: { description: "Les 3+ axes stratégiques de la marque", format: "Array de 3+ objets { axe, pillarsLinked[] (A|D|V|E|R|T|I|S, min 2), kpis[] }", rules: ["3 minimum", "Chaque axe lie au moins 2 piliers"] },
  facteursClesSucces: { description: "Les facteurs clés de succès de la stratégie", format: "Array de 3+ strings", rules: ["3 minimum", "Facteurs spécifiques, pas génériques"] },
  sprint90Days: { description: "Les actions prioritaires des 90 prochains jours", format: "Array de 5+ objets { action, owner, kpi, priority (rang), devotionImpact (enum Devotion), sourceRef (ref I.catalogue), isRiskMitigation (bool) }", rules: ["5 minimum", "Chaque action a un owner et un KPI", "sourceRef trace l'origine dans I"] },
  roadmap: { description: "La roadmap en 3-4 phases avec objectifs Devotion", format: "Array de 3+ objets { phase, objectif, objectifDevotion (ex: 'spectateur→intéressé'), actions[], budget, duree }", rules: ["3 phases minimum", "Chaque phase a un objectifDevotion explicite"] },
  globalBudget: { description: "Budget total de la strategie — enveloppe globale allouee a l'execution de la roadmap", format: "Nombre en XAF" },
  budgetBreakdown: { description: "Ventilation du budget par poste", format: "Objet { production, media, talent, logistics, technology, contingency, agencyFees } (en XAF)" },
  teamStructure: { description: "L'équipe mobilisée pour exécuter la stratégie", format: "Array d'objets { name, title, responsibility }", rules: ["1 minimum"] },
  kpiDashboard: { description: "Tableau de bord KPIs — 1 KPI par pilier minimum", format: "Array de 5+ objets { name, pillar (A|D|V|E|R|T|I|S), target, frequency (DAILY|WEEKLY|MONTHLY|QUARTERLY) }", rules: ["5 minimum", "Le KPI de S est toujours la progression Devotion"] },
  coherenceScore: { description: "Score de cohérence entre les piliers (0-100)", format: "Nombre 0-100", derivedFrom: "Cross-pillar coherence analysis (calcul)" },
  rejectedFromI: { description: "Actions de I explicitement non-sélectionnées pour la roadmap", format: "Array d'objets { sourceRef (path dans I), reason }", rules: ["Permet de revoir les choix plus tard"] },
  overtonMilestones: { description: "Jalons de déplacement de la Fenêtre d'Overton par phase", format: "Array d'objets { phase, currentPerception, targetPerception, measurementMethod }" },
  budgetByDevotion: { description: "Répartition du budget par objectif Devotion Ladder", format: "Objet { acquisition, conversion, retention, evangelisation } (en XAF)" },
  recommandationsPrioritaires: { description: "Recommandations stratégiques prioritaires", format: "Array d'objets { recommendation, source (A|D|V|E|R|T|I|S), priority (rang) }" },
};

// ── Master map ────────────────────────────────────────────────────────

export const VARIABLE_BIBLE: Record<string, Record<string, VariableSpec>> = {
  a: BIBLE_A,
  d: BIBLE_D,
  v: BIBLE_V,
  e: BIBLE_E,
  r: BIBLE_R,
  t: BIBLE_T,
  i: BIBLE_I,
  s: BIBLE_S,
};

/**
 * Get the spec for a specific variable. Returns undefined if not defined.
 */
export function getVariableSpec(pillarKey: string, fieldKey: string): VariableSpec | undefined {
  return VARIABLE_BIBLE[pillarKey.toLowerCase()]?.[fieldKey];
}

// ── Editable Mode Resolution (ADR-0023) ───────────────────────────────

const ADVE_PILLAR_KEYS = new Set(["a", "d", "v", "e"]);

/**
 * Resolve the OPERATOR_AMEND_PILLAR edition mode for a given variable.
 *
 * Decision order:
 *   1. Explicit override on the spec wins.
 *   2. `derivedFrom` set → INFERRED_NO_EDIT (calculated from upstream).
 *   3. RTIS pillars (R/T/I/S) → INFERRED_NO_EDIT (regenerated via
 *      ENRICH_*_FROM_ADVE intents, never amended manually).
 *   4. Long qualitative text (minLength ≥ 30 OR maxLength ≥ 200) →
 *      LLM_REPHRASE (operator gives intent, Notoria proposes phrasing).
 *   5. Otherwise PATCH_DIRECT (short scalar, name, enum, currency, date).
 *
 * STRATEGIC_REWRITE is never returned from spec alone — the gate decides
 * it at runtime based on currentStatus (LOCKED) and destructive markers.
 */
export function getEditableMode(
  pillarKey: string,
  spec: VariableSpec | undefined,
): EditableMode {
  if (!spec) return "PATCH_DIRECT";
  if (spec.editableMode) return spec.editableMode;
  if (spec.derivedFrom) return "INFERRED_NO_EDIT";
  if (!ADVE_PILLAR_KEYS.has(pillarKey.toLowerCase())) return "INFERRED_NO_EDIT";
  const minL = spec.minLength ?? 0;
  const maxL = spec.maxLength ?? 0;
  if (minL >= 30 || maxL >= 200) return "LLM_REPHRASE";
  return "PATCH_DIRECT";
}

/**
 * List the editable variables of a pillar, with their resolved mode and
 * spec. Used by the OPERATOR_AMEND_PILLAR modal dropdown.
 *
 * Returns an empty array for unknown pillars.
 * INFERRED_NO_EDIT entries are excluded from the editable list — RTIS
 * recalculations go through ENRICH_*_FROM_ADVE intents, not this dropdown.
 */
export function listEditableFields(pillarKey: string): Array<{
  field: string;
  spec: VariableSpec;
  mode: Exclude<EditableMode, "INFERRED_NO_EDIT">;
}> {
  const bible = VARIABLE_BIBLE[pillarKey.toLowerCase()];
  if (!bible) return [];
  const out: Array<{
    field: string;
    spec: VariableSpec;
    mode: Exclude<EditableMode, "INFERRED_NO_EDIT">;
  }> = [];
  for (const [field, spec] of Object.entries(bible)) {
    const mode = getEditableMode(pillarKey, spec);
    if (mode === "INFERRED_NO_EDIT") continue;
    out.push({ field, spec, mode });
  }
  return out;
}

// ── Bible Validation Engine ────────────────────────────────────────────

export interface BibleViolation {
  field: string;
  rule: string;
  severity: "WARN" | "BLOCK";
  message: string;
}

/**
 * Validate a pillar content object against the Variable Bible rules.
 * Returns violations (warnings + blocks). Called by Pillar Gateway on every write.
 *
 * Checks:
 *   - minLength / maxLength on strings
 *   - Array min/max item counts (from rules like "3 maximum")
 *   - Empty required fields
 */
export function validateAgainstBible(
  pillarKey: string,
  content: Record<string, unknown>,
): BibleViolation[] {
  const bible = VARIABLE_BIBLE[pillarKey.toLowerCase()];
  if (!bible) return [];

  const violations: BibleViolation[] = [];

  for (const [field, spec] of Object.entries(bible)) {
    const value = content[field];

    // Skip null/undefined — those are caught by Zod required/optional
    if (value === null || value === undefined) continue;

    // ── String length checks ──
    if (typeof value === "string") {
      if (spec.minLength && value.length < spec.minLength) {
        violations.push({
          field,
          rule: `minLength:${spec.minLength}`,
          severity: "WARN",
          message: `${field}: ${value.length} chars, minimum ${spec.minLength} requis`,
        });
      }
      if (spec.maxLength && value.length > spec.maxLength) {
        violations.push({
          field,
          rule: `maxLength:${spec.maxLength}`,
          severity: "WARN",
          message: `${field}: ${value.length} chars, maximum ${spec.maxLength} autorise`,
        });
      }
    }

    // ── Array item count checks (from rules) ──
    if (Array.isArray(value) && spec.rules) {
      for (const rule of spec.rules) {
        // Parse "N maximum" rules
        const maxMatch = rule.match(/(\d+)\s*maximum/i);
        if (maxMatch) {
          const max = parseInt(maxMatch[1]!, 10);
          if (value.length > max) {
            violations.push({
              field,
              rule: `max_items:${max}`,
              severity: "BLOCK",
              message: `${field}: ${value.length} elements, maximum ${max} autorise (regle Bible)`,
            });
          }
        }
        // Parse "N minimum" or "minimum N" rules
        const minMatch = rule.match(/(?:minimum\s*(\d+)|(\d+)\s*minimum)/i);
        if (minMatch) {
          const min = parseInt(minMatch[1] ?? minMatch[2]!, 10);
          if (value.length < min) {
            violations.push({
              field,
              rule: `min_items:${min}`,
              severity: "WARN",
              message: `${field}: ${value.length} elements, minimum ${min} recommande`,
            });
          }
        }
      }
    }

    // ── Array items: check each item has required sub-fields (from format description) ──
    if (Array.isArray(value) && spec.format) {
      // Check for "justification" requirement
      if (spec.format.includes("justification") && spec.rules?.some(r => r.includes("justification"))) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i] as Record<string, unknown> | undefined;
          if (item && typeof item === "object" && (!item.justification || (typeof item.justification === "string" && item.justification.length < 10))) {
            violations.push({
              field,
              rule: "justification_required",
              severity: "WARN",
              message: `${field}[${i}]: justification manquante ou trop courte`,
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Generate a format instruction block for a list of fields.
 * Used by the vault-enrichment prompt to tell the LLM the exact format expected.
 */
export function getFormatInstructions(pillarKey: string, fieldKeys: string[]): string {
  const bible = VARIABLE_BIBLE[pillarKey.toLowerCase()];
  if (!bible) return "";

  return fieldKeys
    .map(key => {
      const spec = bible[key];
      if (!spec) return `- ${key}: (format non specifie)`;
      const parts = [`- ${key}: ${spec.description}`];
      parts.push(`  Format: ${spec.format}`);
      if (spec.examples && spec.examples.length > 0) {
        parts.push(`  Exemple: ${spec.examples[0]}`);
      }
      if (spec.rules && spec.rules.length > 0) {
        parts.push(`  Regles: ${spec.rules.join(" | ")}`);
      }
      if (spec.minLength) parts.push(`  Min: ${spec.minLength} chars`);
      if (spec.maxLength) parts.push(`  Max: ${spec.maxLength} chars`);
      return parts.join("\n");
    })
    .join("\n\n");
}
