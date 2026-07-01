/**
 * artemis/tools/sequence-gap-tools.ts — Glory tools comblant les références
 * fantômes des séquences (trouvées par le scan fonctionnel NEFER 2026-06-30).
 *
 * Des séquences canon (PERSONA-MAP, MEDIA-PLAN, CONTENT-CALENDAR, CAMPAIGN-SINGLE,
 * QUARTERLY-REVIEW, RETAINER-REPORT…) référençaient via `glory(...)` des outils
 * jamais implémentés → steps "GLORY tool inconnu" → séquences PARTIAL. Ces 9 outils
 * les rendent COMPLÈTES — dont 3 (feedback-loop / crew-program-designer /
 * comms-plan-builder) clôturent les steps `planned()` de BAIN-NPS / IMHOTEP-CREW /
 * ANUBIS-COMMS (consigne « ne rien laisser en planifié »).
 *
 * Tous `executionType: "COMPOSE"` (template + données pilier → sortie ; le moteur
 * LLM-exécute le promptTemplate, parse legacy — pas d'outputSchema requis, comme
 * `competitive-analysis-builder`). Doctrine respectée : ce sont des GÉNÉRATEURS DE
 * BRIEF (texte structuré consommé en aval), pas des forges — aucun `forgeOutput`.
 *
 * Enregistrés dans `EXTENDED_GLORY_TOOLS` (pas CORE) → `getGloryTool` les résout
 * pour les séquences sans toucher la cardinalité CORE=56 (test glory-tools.test.ts).
 */

import type { GloryToolDef } from "./tool-types";

export const SEQUENCE_GAP_TOOLS: GloryToolDef[] = [
  {
    slug: "persona-constellation-deep",
    name: "Constellation Persona Approfondie",
    layer: "DC",
    order: 300,
    executionType: "COMPOSE",
    pillarKeys: ["V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Enrichit les archétypes persona en constellation complète — motivations profondes, jobs-to-be-done, tensions, déclencheurs émotionnels, codes culturels, barrières à l'engagement.",
    inputFields: ["target_audience", "persona_archetypes", "brand_values"],
    pillarBindings: {
      // L'audience cible canonique vit dans D (personas), pas dans V — bind
      // sur un champ réel + déjà requis (évite d'introduire un requirement
      // COMPLETE fantôme `v.cibles` qui n'est dans aucun schema/canon).
      target_audience: "d.personas",
      brand_values: "a.valeurs",
    },
    outputFormat: "persona_constellation",
    promptTemplate: `Constellation persona approfondie.
Audience cible : {{target_audience}}
Archétypes de départ : {{persona_archetypes}}
Valeurs de marque : {{brand_values}}
Pour chaque persona : nom évocateur, démographie + psychographie, motivations profondes, jobs-to-be-done (fonctionnel/émotionnel/social), tensions et frustrations, déclencheurs émotionnels, codes culturels et références, barrières à l'engagement, citation signature.
Synthèse : la constellation (relations entre personas), le persona prioritaire et pourquoi.`,
    status: "ACTIVE",
  },
  {
    slug: "touchpoint-journey-mapper",
    name: "Cartographe Parcours & Touchpoints",
    layer: "DC",
    order: 301,
    executionType: "COMPOSE",
    pillarKeys: ["E", "V"],
    requiredDrivers: [],
    dependencies: ["persona-constellation-deep"],
    description:
      "Cartographie le parcours de chaque persona à travers les touchpoints — étapes prise de conscience → advocacy, canaux, moments de vérité, émotions, frictions, leviers d'activation.",
    inputFields: ["personas", "touchpoints", "channels"],
    pillarBindings: {
      touchpoints: "e.touchpoints",
      channels: "i.catalogueParCanal",
    },
    outputFormat: "touchpoint_journeys",
    promptTemplate: `Cartographie de parcours par persona.
Personas : {{personas}}
Touchpoints déclarés : {{touchpoints}}
Canaux : {{channels}}
Pour chaque persona, le parcours en 5 étapes (Prise de conscience, Considération, Décision, Expérience, Fidélité/Advocacy) : touchpoint(s) actif(s), canal, état émotionnel, moment de vérité, friction principale, levier d'activation recommandé.
Synthèse : les 3 moments de vérité prioritaires cross-persona, les frictions à éliminer en priorité.`,
    status: "ACTIVE",
  },
  {
    slug: "campaign-calendar-builder",
    name: "Constructeur de Calendrier de Campagne",
    layer: "DC",
    order: 302,
    executionType: "COMPOSE",
    pillarKeys: ["I", "S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Construit un calendrier de campagne flighté — phases teasing/lancement/entretien/clôture, vagues par canal, cadence éditoriale, temps forts, jalons et dépendances.",
    inputFields: ["campaign_goals", "channels", "duration", "key_moments"],
    pillarBindings: {
      channels: "i.catalogueParCanal",
      key_moments: "s.sprint90Days",
    },
    outputFormat: "campaign_calendar",
    promptTemplate: `Calendrier de campagne flighté.
Objectifs : {{campaign_goals}}
Canaux : {{channels}}
Durée : {{duration}}
Temps forts : {{key_moments}}
Construis le plan de vol : phases (teasing → lancement → entretien → clôture) avec dates relatives, vagues d'activation par canal, cadence éditoriale (fréquence/canal), jalons clés et dépendances, points de mesure.
Format : timeline semaine par semaine + tableau canal × phase.`,
    status: "ACTIVE",
  },
  {
    slug: "kpi-dashboard-designer",
    name: "Concepteur de Dashboard KPI",
    layer: "DC",
    order: 303,
    executionType: "COMPOSE",
    pillarKeys: ["S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Conçoit le dashboard KPI d'une campagne — North Star, métriques par étage AARRR, cibles, seuils d'alerte, attribution, fréquence de relevé, garde-fous.",
    inputFields: ["campaign_objectives", "channels", "aarrr_targets"],
    pillarBindings: {
      // Les cibles AARRR vivent dans E (funnel aarrr), pas dans S — bind sur
      // un champ réel + déjà requis (évite un requirement COMPLETE fantôme
      // `s.metriquesCles` absent des schemas/canons).
      aarrr_targets: "e.aarrr",
    },
    outputFormat: "kpi_dashboard",
    promptTemplate: `Dashboard KPI de campagne.
Objectifs : {{campaign_objectives}}
Canaux : {{channels}}
Cibles AARRR : {{aarrr_targets}}
Conçois le dashboard : North Star de la campagne, puis par étage AARRR (Acquisition, Activation, Rétention, Referral, Revenue) — métrique, définition, cible, seuil d'alerte, source/attribution, fréquence de relevé. Ajoute 2-3 métriques garde-fou (brand safety, coût).
Format : tableau structuré + le tableau de bord hebdomadaire à suivre.`,
    status: "ACTIVE",
  },
  {
    slug: "performance-report-builder",
    name: "Constructeur de Rapport de Performance",
    layer: "DC",
    order: 304,
    executionType: "COMPOSE",
    pillarKeys: ["S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Rédige le rapport de performance — synthèse exécutive, résultats vs objectifs par étage AARRR, ce qui a marché / pas marché, apprentissages, recommandations priorisées.",
    inputFields: ["kpi_data", "objectives", "period"],
    pillarBindings: {},
    outputFormat: "performance_report",
    promptTemplate: `Rapport de performance.
Données KPI : {{kpi_data}}
Objectifs : {{objectives}}
Période : {{period}}
Rédige : (1) synthèse exécutive en 3 lignes, (2) résultats vs objectifs par étage AARRR avec écart et lecture, (3) ce qui a marché et pourquoi, (4) ce qui n'a pas marché et pourquoi, (5) apprentissages clés, (6) 3 recommandations priorisées pour la période suivante.
Ton : factuel, orienté décision, sans langue de bois.`,
    status: "ACTIVE",
  },
  {
    slug: "insight-opportunity-scanner",
    name: "Scanner d'Insights & Opportunités",
    layer: "DC",
    order: 305,
    executionType: "COMPOSE",
    pillarKeys: ["T", "D"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Scanne la performance et les signaux marché pour extraire insights actionnables, opportunités d'optimisation et recommandations d'ajustement priorisées (effort × impact).",
    inputFields: ["performance_data", "market_signals", "brand_positioning"],
    pillarBindings: {
      brand_positioning: "d.positionnement",
    },
    outputFormat: "insight_opportunities",
    promptTemplate: `Scan insights & opportunités.
Performance : {{performance_data}}
Signaux marché : {{market_signals}}
Positionnement : {{brand_positioning}}
Extrais : (1) 3-5 insights actionnables (un insight = tension/vérité non triviale), (2) opportunités d'optimisation (quick wins + paris structurants), (3) recommandations d'ajustement priorisées en matrice effort × impact.
Chaque reco : action, étage AARRR visé, effort (S/M/L), impact attendu, condition de réussite.`,
    status: "ACTIVE",
  },
  {
    slug: "feedback-loop",
    name: "Boucle de Feedback NPS",
    layer: "DC",
    order: 306,
    executionType: "COMPOSE",
    pillarKeys: ["E"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Construit la boucle de feedback NPS — récupération des détracteurs (close-the-loop), amplification des promoteurs, thèmes récurrents → causes racines, actions correctives priorisées.",
    inputFields: ["nps_segments", "detractor_themes", "promoter_signals"],
    pillarBindings: {},
    outputFormat: "feedback_loop",
    promptTemplate: `Boucle de feedback NPS.
Segments NPS : {{nps_segments}}
Thèmes détracteurs : {{detractor_themes}}
Signaux promoteurs : {{promoter_signals}}
Construis : (1) plan de récupération détracteurs (close-the-loop : qui contacter, quel message, quel délai), (2) plan d'amplification promoteurs (referral, témoignages, advocacy), (3) thèmes récurrents → causes racines, (4) 3 actions correctives priorisées (effort × impact NPS).
Réponds en JSON : {"customer_feedback": {"detractor_recovery": [], "promoter_amplification": [], "recurring_themes": [], "corrective_actions": []}}.`,
    status: "ACTIVE",
  },
  {
    slug: "crew-program-designer",
    name: "Concepteur de Programme Crew",
    layer: "DC",
    order: 307,
    executionType: "COMPOSE",
    pillarKeys: ["I", "S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Conçoit le programme crew (talent) — composition d'équipe, rôles, mix de compétences, niveaux/tiers, plan de contrôle qualité, cadence de collaboration pour exécuter la roadmap de marque.",
    inputFields: ["deliverables", "timeline", "budget"],
    pillarBindings: { deliverables: "i.catalogueParCanal" },
    outputFormat: "crew_program",
    promptTemplate: `Programme crew (talent) pour exécuter la roadmap.
Livrables : {{deliverables}}
Timeline : {{timeline}}
Budget : {{budget}}
Conçois : (1) composition d'équipe (rôles + nombre), (2) mix de compétences par livrable, (3) niveau/tier requis par rôle (junior/medior/senior), (4) plan de contrôle qualité (jalons de revue, critères), (5) cadence de collaboration (rituels, points de synchro).`,
    status: "ACTIVE",
  },
  {
    slug: "comms-plan-builder",
    name: "Constructeur de Plan de Communication",
    layer: "DC",
    order: 308,
    executionType: "COMPOSE",
    pillarKeys: ["E", "I"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Construit le plan de communication multi-canal — audiences, message clé par segment, mapping canal × audience, cadence et séquencement, CTA par étape, KPI d'engagement.",
    inputFields: ["audiences", "key_messages", "channels"],
    pillarBindings: { channels: "i.catalogueParCanal" },
    outputFormat: "comms_plan",
    promptTemplate: `Plan de communication multi-canal.
Audiences : {{audiences}}
Messages clés : {{key_messages}}
Canaux : {{channels}}
Construis : (1) message clé adapté par audience/segment, (2) mapping canal × audience (où toucher qui), (3) cadence et séquencement (timing des vagues), (4) call-to-action par étape, (5) KPI d'engagement à suivre par canal.`,
    status: "ACTIVE",
  },
];
