/**
 * Phase 14 — Imhotep Glory tools (ADR-0019, full activation Crew Programs).
 *
 * 4 nouveaux tools au layer HYBRID/DC pour orchestrer les opérations crew :
 * matching candidates LLM-ranked, talent evaluation, formation recommendation,
 * QC scoring.
 *
 * Tous wrappent les services satellites existants (matching-engine, talent-engine,
 * tier-evaluator, qc-router) via les Intent kinds Imhotep enregistrés en
 * `intent-kinds.ts` Phase 14 — anti-doublon NEFER §3 strict.
 *
 * APOGEE compliance :
 * - Sous-système : Crew Programs (Ground #6) — premier sous-système Ground actif
 * - Pilier 4 : pas de pre-conditions strictes (les services satellites valident)
 * - Loi 3 (Conservation carburant) : tools qualityTier B/A, costEstimate ~$0-0.05
 */

import type { GloryToolDef } from "./types";

export const PHASE14_IMHOTEP_TOOLS: GloryToolDef[] = [
  {
    slug: "crew-matcher",
    name: "Matcheur de Talents",
    layer: "HYBRID",
    order: 51,
    executionType: "LLM",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Ranke les candidates talent les plus adaptés à un brief mission via LLM-enriched scoring (alignement skills, performance historique, devotion footprint sectoriel). Wrappe matching-engine.suggest.",
    inputFields: ["mission_brief", "required_roles", "min_match_score", "limit"],
    pillarBindings: {
      mission_brief: "i.equipe",
    },
    outputFormat: "talent_match_ranking",
    promptTemplate: `Tu es Imhotep, sage architecte qui apparie talents et missions.

Brief mission : {{mission_brief}}
Rôles requis : {{required_roles}}
Score minimum : {{min_match_score}}
Limit : {{limit}}

Pour chaque candidate fourni en input par matching-engine :
- valide le matchScore brut (compétences + dispo)
- enrichis avec lecture devotion footprint sectoriel (Creator a-t-il déjà recruté des superfans dans ce secteur ?)
- propose 2-3 matchReasons explicites

Format JSON : { "ranked": [{talentProfileId, matchScore, matchReasons, devotionAlignment}], "rationale": "string" }.`,
    status: "ACTIVE",
  },

  {
    slug: "talent-evaluator",
    name: "Évaluateur de Tier",
    layer: "DC",
    order: 52,
    executionType: "CALC",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Évalue tier promotion readiness d'un creator via critères met/required (totalMissions, firstPassRate, peerReviews, collabMissions). Output PROMOTE/HOLD/DEMOTE + rationale narratif. Wrappe tier-evaluator.evaluateCreator.",
    inputFields: ["talent_profile_id"],
    pillarBindings: {},
    outputFormat: "tier_evaluation",
    promptTemplate: `CALC — pas de prompt LLM. Délègue à tier-evaluator.evaluateCreator(talent_profile_id) puis structure la réponse :

{
  "currentTier": "...",
  "recommendedTier": "...",
  "action": "PROMOTE | HOLD | DEMOTE",
  "criteria": { "totalMissions": <actual>, "firstPassRate": <actual>, ... },
  "rationale": "Promotion X→Y — N/M critères atteints"
}`,
    status: "ACTIVE",
  },

  {
    slug: "formation-recommender",
    name: "Recommandeur de Formation",
    layer: "HYBRID",
    order: 53,
    executionType: "LLM",
    pillarKeys: ["I"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Propose top 3 Courses Académie pour combler un skill gap d'un user (filtre par pillarFocus si fourni). Génère rationale narrative pour chaque cours.",
    inputFields: ["user_id", "skill_gap", "current_tier"],
    pillarBindings: {},
    outputFormat: "formation_recommendation",
    promptTemplate: `Tu es Imhotep, sage formateur égyptien. Tu recommandes 3 cours pour combler un gap.

User : {{user_id}}
Skill gap identifié : {{skill_gap}}
Tier actuel : {{current_tier}}

Récupère les Courses publiés filtrés par pillarFocus={{skill_gap}} (top 3 par order ASC).

Pour chaque cours :
- titre
- rationale narrative (1-2 phrases) reliant le cours au gap et au tier cible
- estimated duration

Format JSON : { "courses": [{courseId, title, rationale, estimatedDurationMin}] }.`,
    status: "ACTIVE",
  },

  {
    slug: "qc-evaluator",
    name: "Évaluateur QC Deliverable",
    layer: "DC",
    order: 54,
    executionType: "LLM",
    pillarKeys: ["E", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Évalue qualité d'un MissionDeliverable + score (passed/failed + issues catégorisés format/brand/content/pillar). Wrappe qc-router.automatedQc en mode AUTOMATED, sinon route vers reviewer humain.",
    inputFields: ["deliverable_id", "reviewer_id"],
    pillarBindings: {},
    outputFormat: "qc_result",
    promptTemplate: `Tu es Imhotep, gardien de la qualité. Tu évalues un deliverable.

Deliverable : {{deliverable_id}}

Pour chaque catégorie d'issue (format/brand/content/pillar) :
- détecte les écarts vs guidelines brand
- catégorise sévérité (info/warning/error)
- propose correction concrète

Format JSON : { "passed": bool, "score": 0-100, "issues": [{type, severity, message, fix}] }.`,
    status: "ACTIVE",
  },
];
