/**
 * CANON UPGRADERS — ADVE de la MARQUE OMBRELLE « UPgraders » (la société /
 * agence-opérateur « fixer »), à 100 % sur les 8 piliers.
 *
 * UPgraders est la SOCIÉTÉ qui construit et opère ses marques-produits :
 *   - La Fusée  — l'Industry OS (canon propre : `lafusee-canon.ts`)
 *   - Argos     — la sous-marque média / veille de référence
 *   + l'activité fixer / conseil de marque historique.
 *
 * Séparation société ≠ produit (KB UPGRADERS-LAFUSEE-KB + décision opérateur
 * 2026-06-24) : avant, l'ADVE « UPgraders » affichait « La Fusée » comme nom de
 * business — confusion corrigée ici. Ce canon RÉUTILISE le socle La Fusée
 * (mission, valeurs, ennemi, marché, trajectoire partagés — l'ADN de marque)
 * et SURCHARGE les seuls champs d'identité : nomMarque, nature, positionnement,
 * portefeuille produits. C'est la marque ombrelle qui POSSÈDE La Fusée, pas
 * l'inverse.
 *
 * Source de vérité consommée par :
 *   - prisma/seed-upgraders.ts (seed la stratégie ombrelle « UPgraders »)
 *   - le sync gouverné Console « Canon UPgraders » (prod — Vague 10)
 *   - tests/unit/governance/upgraders-canon-complete.test.ts (HARD 100 %)
 *
 * Complétude garantie par construction : chaque pilier hérite (spread) du socle
 * La Fusée contract-COMPLETE puis surcharge des champs non vides → invariant du
 * test HARD préservé.
 */

import {
  PILLAR_A as LF_A,
  PILLAR_D as LF_D,
  PILLAR_V as LF_V,
  PILLAR_E as LF_E,
  PILLAR_R as LF_R,
  PILLAR_T as LF_T,
  PILLAR_I as LF_I,
  PILLAR_S as LF_S,
} from "./lafusee-canon";

// ── PILIER A — AUTHENTICITÉ (identité de la société ombrelle) ───────────

export const PILLAR_A = {
  ...LF_A,
  nomMarque: "UPgraders",
  accroche: "De la Poussière à l'Étoile",
  description:
    "UPgraders est l'agence-opérateur (« fixer ») du marché créatif africain francophone : la société qui transforme des marques en icônes culturelles en les pilotant sur une trajectoire mesurée. Marque ombrelle de La Fusée (l'Industry OS qu'elle a construit et opère) et d'Argos (sa propriété média de référence), UPgraders vend l'état final prouvé, pas des moyens.",
  secteur: "Agence-opérateur de marque / Industry OS",
  brandNature: "SERVICE",
  noyauIdentitaire:
    "UPgraders ne se vit pas comme une agence de plus : c'est l'opérateur qui industrialise l'ascension des marques. Nous croyons que chaque marque organique porte un noyau ADVE qui mérite une trajectoire orbitale complète — et que la preuve doit primer sur la promesse. Pour le tenir, nous avons forgé nos propres instruments (La Fusée, Argos) ; nous les opérons nous-mêmes au service du client. Pas de bon sens — du protocole.",
  citationFondatrice:
    "« On ne vend pas des moyens, on vend un état final mesuré. De la poussière à l'étoile. » — Alexandre Djengue, fondateur d'UPgraders",
  // Équipe dirigeante réelle (source : dossier agence UPgraders / data.ts TEAM).
  // Avant : stub « Fondateur UP.graders ». Ici la vraie direction historique.
  equipeDirigeante: [
    {
      nom: "Alexandre « Xtincell » Djengue",
      role: "CEO — Direction générale & créative",
      bio: "Pilote la méthode ADVE/RTIS, l'OS La Fusée et La Guilde. Opère aussi en mission (image, motion, DA) quand le brief le demande. CEO depuis 2025.",
      experiencePasse: ["UPgraders (CEO depuis 2025)", "Directeur Créatif MATANGA Agency", "Friends Studio (binôme production)"],
      competencesCles: ["stratégie de marque (ADVE/RTIS)", "architecture d'Industry OS gouverné", "direction créative & artistique", "photo/vidéo/motion"],
      allocationPct: 100,
    },
    {
      nom: "Ingrid Nya Ngatchou",
      role: "Co-fondatrice — Éminence stratégique (ex-CEO)",
      bio: "Co-fondatrice (2017) et ancienne CEO. Architecte des premières années : positionnement, structuration, premières grandes missions.",
      experiencePasse: ["UPgraders (co-fondatrice 2017, ex-CEO)"],
      competencesCles: ["positionnement de marque", "structuration d'agence", "direction stratégique"],
    },
    {
      nom: "Jean-Philippe Veigne",
      role: "Co-fondateur — Gouvernance (ex-CEO)",
      bio: "Co-fondateur (2017) et ancien CEO. Pilier des opérations historiques ; référence en gouvernance et trajectoire long terme.",
      experiencePasse: ["UPgraders (co-fondateur 2017, ex-CEO)"],
      competencesCles: ["opérations agence", "gouvernance", "trajectoire long terme"],
    },
  ],
} as const;

// ── PILIER D — DIFFÉRENCIATION (positionnement de l'ombrelle) ───────────

export const PILLAR_D = {
  ...LF_D,
  positionnement:
    "La maison-mère qui opère le premier Industry OS africain (La Fusée) et la propriété média de référence du secteur (Argos) : ni agence 360 classique, ni éditeur de SaaS — un opérateur de mission à obligation d'effet tracé, qui met sa propre technologie au service de la trajectoire LATENT → ICONE de ses clients.",
  assetsLinguistiques: {
    ...LF_D.assetsLinguistiques,
    lexique: ["UPgraders", "La Fusée", "Argos", "le Cockpit", "la Console", "les Neteru", "l'Oracle", "le fixer"],
  },
} as const;

// ── PILIER V — VALEUR (portefeuille de la société) ──────────────────────

export const PILLAR_V = {
  ...LF_V,
  promesseDeValeur:
    "Une société qui aligne ses propres outils sur l'intérêt du client : La Fusée pour piloter et mesurer, Argos pour la preuve sociale et la veille, l'opérateur humain pour exécuter — un état final mesuré plutôt que des moyens facturés.",
  produitsCatalogue: [
    {
      nom: "La Fusée — Industry OS", categorie: "PLATEFORME", phaseLifecycle: "GROWTH",
      gainClientConcret: "Un Cockpit qui pilote la marque, un Oracle 35 sections et un score /200 auditables",
      gainClientAbstrait: "La fin du marketing au feeling : la sensation de tenir enfin la barre de sa trajectoire",
      lienPromesse: "L'infrastructure qui rend l'obligation d'effet tenable et mesurable",
      segmentCible: "Le Founder bâtisseur (FMCG/PME)", canalDistribution: ["WEBSITE", "APP"],
    },
    {
      nom: "Argos", categorie: "CONTENU", phaseLifecycle: "GROWTH",
      gainClientConcret: "Des dossiers de référence sectoriels et une veille curée, sourcés et signés",
      gainClientAbstrait: "La légitimité d'être adossé à la propriété média de référence de son secteur",
      lienPromesse: "La preuve sociale et la veille qui nourrissent la trajectoire depuis le marché",
      segmentCible: "Le directeur marketing corporate", canalDistribution: ["WEBSITE", "EMAIL"],
    },
    {
      nom: "Conseil & exécution fixer", categorie: "CONSEIL", phaseLifecycle: "MATURITY",
      gainClientConcret: "Stratégie, GTM et direction créative exécutés sous SLA chiffrés avec pénalités d'avoir",
      gainClientAbstrait: "La tranquillité de déléguer à un opérateur tenu à l'effet, pas aux moyens",
      lienPromesse: "L'humain qui exécute l'état final promis, gouverné par l'OS",
      segmentCible: "Le Founder bâtisseur (FMCG/PME)", canalDistribution: ["LINKEDIN", "EVENT"],
    },
    {
      nom: "Académie & Guilde", categorie: "FORMATION", phaseLifecycle: "GROWTH",
      gainClientConcret: "Accès à une Académie de formation et à une Guilde de talents qualifiés sous Hub-Escrow",
      gainClientAbstrait: "L'appartenance à un écosystème qui fait monter le talent en même temps que la marque",
      lienPromesse: "Le vivier humain qui industrialise l'exécution de la trajectoire",
      segmentCible: "La marque personnelle en ascension", canalDistribution: ["WEBSITE", "LINKEDIN"],
    },
  ],
} as const;

// ── PILIERS E / R / T / I / S — socle partagé (ADN de marque) ───────────
// L'ombrelle et son produit phare partagent engagement, marché, trajectoire,
// potentiel et stratégie au niveau société. Hérités tels quels (contract-COMPLETE).

export const PILLAR_E = { ...LF_E } as const;
export const PILLAR_R = { ...LF_R } as const;
export const PILLAR_T = { ...LF_T } as const;
export const PILLAR_I = { ...LF_I } as const;
export const PILLAR_S = { ...LF_S } as const;

// ── Export canon (consommé par seed + sync + test HARD) ─────────────────

export const UPGRADERS_CANON_PILLARS: ReadonlyArray<{ key: string; content: unknown; confidence: number }> = [
  { key: "a", content: PILLAR_A, confidence: 0.92 },
  { key: "d", content: PILLAR_D, confidence: 0.9 },
  { key: "v", content: PILLAR_V, confidence: 0.9 },
  { key: "e", content: PILLAR_E, confidence: 0.88 },
  { key: "r", content: PILLAR_R, confidence: 0.85 },
  { key: "t", content: PILLAR_T, confidence: 0.85 },
  { key: "i", content: PILLAR_I, confidence: 0.85 },
  { key: "s", content: PILLAR_S, confidence: 0.88 },
];

export const UPGRADERS_STRATEGY_NAME = "UPgraders";
export const UPGRADERS_BUSINESS_CONTEXT = {
  sector: "Agence-opérateur de marque / Industry OS",
  country: "CM",
  businessModel: "SERVICE",
  positioningArchetype: "PREMIUM_ACCESSIBLE",
} as const;
