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

export interface VariableSpec {
  description: string;
  format: string;
  examples?: string[];
  minLength?: number;
  maxLength?: number;
  rules?: string[];
  derivedFrom?: string;
  feedsInto?: string[];
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
    description: "Les 3-7 valeurs fondamentales de la marque (modèle Schwartz)",
    format: "Array d'objets { value (enum Schwartz), customName, rank, justification (50+ chars), costOfHolding }",
    rules: ["3 minimum, 7 maximum", "Chaque valeur doit avoir une justification spécifique, pas générique", "Le costOfHolding = ce que ça coûte de maintenir cette valeur"],
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
