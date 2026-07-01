/**
 * Bible des variables — version réduite v7.
 *
 * Port lisible de `legacy/src/lib/types/variable-bible.ts` (~300 entrées) :
 * on ne garde que les champs STRUCTURANTS de la méthode, avec les mêmes ids
 * (camelCase) que le legacy pour qu'une migration de données soit un mapping 1:1.
 *
 * Sémantique canon des piliers (legacy `src/domain/pillars.ts`) :
 *   A = Authenticité (identité)      — socle, déclaré/amendé par l'humain
 *   D = Distinction (positionnement) — socle
 *   V = Valeur (offre & pricing)     — socle
 *   E = Engagement (expérience)      — socle
 *   R = Risque (diagnostic ADVE)     — dérivé
 *   T = Tracking (réalité marché)    — dérivé
 *   I = Innovation (potentiel)       — dérivé
 *   S = Stratégie (roadmap)          — dérivé
 *
 * `needsHuman` (doctrine ADVE, cf. CLAUDE.md) : champ non-dérivable par l'IA —
 * décision stratégique (archetype, positionnement, businessModel) ou donnée
 * réelle (nom, preuves, chiffres). L'IA peut au mieux en proposer un draft
 * marqué INFERRED ; seul l'opérateur/fondateur le fait passer à DECLARED.
 * Les piliers RTIS étant intégralement dérivés, aucun de leurs champs n'est
 * needsHuman.
 *
 * Pur TS, zéro dépendance, zéro IO.
 */
import type { PillarKey } from "./pillars";

/** Type de contenu attendu — grain volontairement grossier pour l'UI et le scoring. */
export type FieldType = "texte" | "liste";

export interface FieldDef {
  /** Id canonique du champ (identique à la bible legacy — migration 1:1). */
  id: string;
  /** Label FR affiché. */
  label: string;
  /** Description courte FR (tooltip, placeholder, aide au remplissage). */
  description: string;
  /** true = non-dérivable : décision ou donnée réelle que seul l'humain déclare. */
  needsHuman: boolean;
  type: FieldType;
  /**
   * Listes uniquement — nombre minimal d'items pour que la collection soit
   * « complète » (axe collections du scoring structurel, poids 7).
   * Seuils repris des règles de la bible legacy. Défaut : 1.
   */
  minItems?: number;
}

/** Labels FR canoniques des 8 piliers (legacy PILLAR_METADATA.displayName). */
export const PILLAR_LABELS: Record<PillarKey, string> = {
  A: "Authenticité",
  D: "Distinction",
  V: "Valeur",
  E: "Engagement",
  R: "Risque",
  T: "Tracking",
  I: "Innovation",
  S: "Stratégie",
};

// ── A — Authenticité (identité, raison d'être) ────────────────────────

const FIELDS_A: FieldDef[] = [
  {
    id: "nomMarque",
    label: "Nom de la marque",
    description: "Nom commercial tel qu'il apparaît sur les produits et communications.",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "description",
    label: "Description",
    description: "Ce que fait la marque en 2-3 phrases factuelles — secteur, activité, taille.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "secteur",
    label: "Secteur d'activité",
    description: "Le secteur en 1-3 mots (FMCG, matériaux de construction, fintech…).",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "publicCible",
    label: "Public cible",
    description: "L'audience visée en une phrase — les personas (D) la détailleront ensuite.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "promesseFondamentale",
    label: "Promesse fondamentale",
    description: "La conviction intime qui fonde le projet — une croyance, pas un slogan.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "archetype",
    label: "Archétype de marque",
    description: "Archétype jungien primaire (pattern narratif profond) — décision identitaire.",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "valeurs",
    label: "Valeurs fondamentales",
    description: "1 à 3 valeurs maximum (une marque forte se concentre), chacune justifiée.",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
  {
    id: "citationFondatrice",
    label: "Citation fondatrice",
    description: "La conviction du fondateur, verbatim — jamais inventée à sa place.",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "noyauIdentitaire",
    label: "Noyau identitaire",
    description: "L'ADN en 2-3 phrases — regarde l'intérieur, pas le marché (ça, c'est D).",
    needsHuman: false,
    type: "texte",
  },
];

// ── D — Distinction (positionnement, différenciation) ─────────────────

const FIELDS_D: FieldDef[] = [
  {
    id: "positionnement",
    label: "Positionnement",
    description: "La position unique sur le marché — répond à « pourquoi nous et pas un autre ? ».",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "promesseMaitre",
    label: "Promesse maître",
    description: "La promesse principale au client, en une phrase orientée bénéfice.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "personas",
    label: "Personas",
    description: "2 à 5 profils types de clients : motivations, freins, désir caché.",
    needsHuman: false,
    type: "liste",
    minItems: 2,
  },
  {
    id: "tonDeVoix",
    label: "Ton de voix",
    description: "Personnalité verbale : adjectifs, ce qu'on dit, ce qu'on ne dit jamais.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "paysageConcurrentiel",
    label: "Paysage concurrentiel",
    description: "3+ concurrents directs, chacun avec forces et faiblesses.",
    needsHuman: false,
    type: "liste",
    minItems: 3,
  },
  {
    id: "positionnementEmotionnel",
    label: "Positionnement émotionnel",
    description: "Le ressenti unique déclenché chez l'audience, formulé à la 1ère personne.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "assetsLinguistiques",
    label: "Assets linguistiques",
    description: "Vocabulaire propriétaire : slogan, tagline, mantras, lexique de marque.",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
  {
    id: "proofPoints",
    label: "Preuves",
    description: "2+ preuves tangibles des promesses — chiffres, témoignages, certifications réelles.",
    needsHuman: true,
    type: "liste",
    minItems: 2,
  },
];

// ── V — Valeur (offre, pricing, économie) ─────────────────────────────

const FIELDS_V: FieldDef[] = [
  {
    id: "produitsCatalogue",
    label: "Catalogue produits/services",
    description: "L'offre réelle : produits ou services, avec prix et gain client concret.",
    needsHuman: true,
    type: "liste",
    minItems: 1,
  },
  {
    id: "businessModel",
    label: "Modèle d'affaires",
    description: "Comment la marque capture la valeur (production, service, abonnement, plateforme…).",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "promesseDeValeur",
    label: "Proposition de valeur",
    description: "La synthèse du bénéfice client global en 1-3 phrases.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "pricingJustification",
    label: "Justification du prix",
    description: "Pourquoi CE prix pour CE positionnement — lie la Distinction au prix.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "productLadder",
    label: "Échelle de produits",
    description: "2+ paliers d'offre à prix croissants, chacun ciblant un usage ou segment.",
    needsHuman: false,
    type: "liste",
    minItems: 2,
  },
  {
    id: "unitEconomics",
    label: "Unit economics",
    description: "Chiffres réels : CAC, LTV, marge, point mort — jamais estimés par l'IA.",
    needsHuman: true,
    type: "texte",
  },
  {
    id: "valeurClientTangible",
    label: "Valeur client tangible",
    description: "Bénéfices fonctionnels concrets pour le client : temps, argent, qualité.",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
  {
    id: "roiProofs",
    label: "Preuves de ROI",
    description: "Résultats clients chiffrés avant/après — données réelles uniquement.",
    needsHuman: true,
    type: "liste",
    minItems: 2,
  },
];

// ── E — Engagement (expérience, communauté) ───────────────────────────

const FIELDS_E: FieldDef[] = [
  {
    id: "promesseExperience",
    label: "Promesse d'expérience",
    description: "Ce que chaque interaction avec la marque garantit au client.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "superfanPortrait",
    label: "Portrait du superfan",
    description: "Le profil de l'évangéliste visé : motivations et barrières à la montée.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "touchpoints",
    label: "Points de contact",
    description: "5+ points de contact entre la marque et son audience, chacun avec un rôle.",
    needsHuman: false,
    type: "liste",
    minItems: 5,
  },
  {
    id: "rituels",
    label: "Rituels de marque",
    description: "3+ rituels réguliers qui créent l'habitude et la fidélité.",
    needsHuman: false,
    type: "liste",
    minItems: 3,
  },
  {
    id: "conversionTriggers",
    label: "Déclencheurs de conversion",
    description: "Ce qui fait monter un fan d'un niveau de dévotion au suivant.",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
  {
    id: "kpis",
    label: "KPIs d'engagement",
    description: "6+ indicateurs de mesure, chacun avec cible et fréquence.",
    needsHuman: false,
    type: "liste",
    minItems: 6,
  },
  {
    id: "communityBuilding",
    label: "Community building",
    description: "Plateformes communautaires actives et mécaniques de croissance.",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
];

// ── R — Risque (dérivé : diagnostic des risques sur ADVE) ─────────────

const FIELDS_R: FieldDef[] = [
  {
    id: "globalSwot",
    label: "SWOT global",
    description: "Forces, faiblesses, opportunités, menaces — dérivé du socle ADVE.",
    needsHuman: false,
    type: "liste",
    minItems: 4, // les 4 quadrants renseignés
  },
  {
    id: "probabilityImpactMatrix",
    label: "Matrice des risques",
    description: "5+ risques probabilité × impact, chacun avec une mitigation concrète.",
    needsHuman: false,
    type: "liste",
    minItems: 5,
  },
  {
    id: "coherenceRisks",
    label: "Risques de cohérence",
    description: "Contradictions détectées entre piliers (ex. premium en D, prix low-cost en V).",
    needsHuman: false,
    type: "liste",
    minItems: 1,
  },
  {
    id: "mitigationPriorities",
    label: "Priorités de mitigation",
    description: "Actions de réduction de risque, concrètes et assignables.",
    needsHuman: false,
    type: "liste",
    minItems: 5,
  },
];

// ── T — Tracking (dérivé : confrontation à la réalité marché) ─────────

const FIELDS_T: FieldDef[] = [
  {
    id: "overtonPosition",
    label: "Position Overton actuelle",
    description: "Comment le marché perçoit la marque MAINTENANT — perception réelle, pas souhaitée.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "perceptionGap",
    label: "Écart de perception",
    description: "Distance entre la perception actuelle (T) et la perception cible (A+D).",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "tamSamSom",
    label: "Taille de marché (TAM/SAM/SOM)",
    description: "Marché total, adressable, atteignable — chaque valeur sourcée (estimation ou vérifiée).",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "marketReality",
    label: "Réalité marché",
    description: "Macro-tendances vérifiables et signaux faibles à surveiller.",
    needsHuman: false,
    type: "liste",
    minItems: 2,
  },
];

// ── I — Innovation (dérivé : potentiel d'action) ──────────────────────

const FIELDS_I: FieldDef[] = [
  {
    id: "catalogueParCanal",
    label: "Catalogue d'actions par canal",
    description: "Les actions possibles, organisées par canal (digital, événementiel, média…).",
    needsHuman: false,
    type: "liste",
    minItems: 2,
  },
  {
    id: "innovationsProduit",
    label: "Innovations produit",
    description: "Extensions, pivots, co-branding possibles — avec faisabilité et horizon.",
    needsHuman: false,
    type: "liste",
    minItems: 2,
  },
  {
    id: "bigIdea",
    label: "Big Idea",
    description: "Le concept central : idée, mécanisme, insight.",
    needsHuman: false,
    type: "texte",
  },
];

// ── S — Stratégie (dérivé : synthèse et roadmap) ──────────────────────

const FIELDS_S: FieldDef[] = [
  {
    id: "visionStrategique",
    label: "Vision stratégique",
    description: "Le futur stratégique de la marque à long terme.",
    needsHuman: false,
    type: "texte",
  },
  {
    id: "axesStrategiques",
    label: "Axes stratégiques",
    description: "3+ axes reliant chacun au moins 2 piliers, avec leurs KPIs.",
    needsHuman: false,
    type: "liste",
    minItems: 3,
  },
  {
    id: "sprint90Days",
    label: "Sprint 90 jours",
    description: "5+ actions prioritaires, chacune avec un responsable et un KPI.",
    needsHuman: false,
    type: "liste",
    minItems: 5,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    description: "3-4 phases avec objectif de dévotion, budget et durée.",
    needsHuman: false,
    type: "liste",
    minItems: 3,
  },
];

// ── Registre maître ───────────────────────────────────────────────────

export const PILLAR_FIELDS: Record<PillarKey, FieldDef[]> = {
  A: FIELDS_A,
  D: FIELDS_D,
  V: FIELDS_V,
  E: FIELDS_E,
  R: FIELDS_R,
  T: FIELDS_T,
  I: FIELDS_I,
  S: FIELDS_S,
};

/** Spec d'un champ par pilier + id. `undefined` si inconnu. */
export function getFieldDef(pillar: PillarKey, fieldId: string): FieldDef | undefined {
  return PILLAR_FIELDS[pillar].find((f) => f.id === fieldId);
}

/** Les champs needsHuman d'un pilier (décisions/données que seul l'humain déclare). */
export function needsHumanFields(pillar: PillarKey): FieldDef[] {
  return PILLAR_FIELDS[pillar].filter((f) => f.needsHuman);
}
