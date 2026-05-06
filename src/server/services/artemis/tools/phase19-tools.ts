/**
 * Phase 19 — Campaign tracker dedicated Glory tools (ADR-0052 v2).
 *
 * 6 Glory tools spécialisés campaign-tracker. Layer = DC (Direction de Création
 * — evaluation, architecture, presentation). Tous LLM execution type pour
 * promotion `MVP → PRODUCTION` des sous-clusters Vague 1-3.
 *
 * Ajoutés à EXTENDED_GLORY_TOOLS (pas CORE) — préserve la cardinalité 56 du
 * test `glory-tools.test.ts`. Référencés par `campaign-tracker` service en
 * promotion future via Glory dispatcher (slugs résolus via `getGloryTool()`).
 *
 * Liste (ordre de promotion priorisée) :
 *   1. big-idea-coherence-checker         — Cluster B (PRODUCTION promotion)
 *   2. myth-arc-cohesion-evaluator        — Cluster B (PRODUCTION promotion)
 *   3. postmortem-12q                     — Cluster E (canon 12 questions)
 *   4. crew-performance-evaluator         — Cluster E (12 dimensions scoring)
 *   5. negative-space-auditor             — Cluster H (LLM upgrade des 3 catégories MVP)
 *   6. mcp-content-pii-classifier         — Cluster D (PII classifier production)
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import type { GloryToolDef } from "./registry";

export const PHASE19_TOOLS: GloryToolDef[] = [
  // ─── Cluster B — Cohérence narrative ───
  {
    slug: "big-idea-coherence-checker",
    name: "Big Idea Coherence Checker",
    layer: "DC",
    order: 19_001,
    executionType: "LLM",
    pillarKeys: ["A", "D"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Évalue la cohérence d'une CampaignAction (claim + body + tagline) vs le snapshot " +
      "BigIdea + Manifesto immutable de la Campaign. Promotion PRODUCTION du sous-cluster " +
      "coherence.bigIdeaCoherence (MVP heuristic Jaccard tokens). Output : score 0..1 + " +
      "rationale + drift detection. Cf. ADR-0052 Cluster B + ADR enfant 0052-B-coherence-llm-evaluator.",
    inputFields: ["big_idea_text", "manifesto_text", "action_text", "manipulation_mode_applied", "manipulation_mix_allowed"],
    pillarBindings: {
      // Note : les contenus snapshot Campaign.bigIdeaSnapshotContent / manifestoSnapshotContent
      // ne viennent PAS des piliers ADVE — ils sont passés en input direct par le caller
      // (campaign-tracker handler) qui a déjà fait la résolution via Campaign.bigIdeaSnapshotBrandAssetId.
    },
    outputFormat: "coherence_score_with_rationale",
    promptTemplate: `Tu es l'éditeur stratégique en chef. Évalue la cohérence narrative d'une action de campagne vs la Big Idea + le Manifesto fondateurs de la marque.

BIG IDEA snapshot (figée au lancement campagne) :
{{big_idea_text}}

MANIFESTO snapshot (figé au lancement campagne) :
{{manifesto_text}}

ACTION DE CAMPAGNE à évaluer :
{{action_text}}

Mode manipulation appliqué : {{manipulation_mode_applied}}
Modes autorisés mix stratégique : {{manipulation_mix_allowed}}

Produis un JSON strict :
{
  "score": 0..1,                           // 0 = contredit/détourne ; 1 = renforce parfaitement
  "rationale": "1-2 phrases explicatives",
  "manipulationDrift": true/false,         // true si mode appliqué hors mix
  "redFlags": ["liste"],                   // ex: ["copy contredit promesse maître"]
  "alignmentSignals": ["liste"]            // ex: ["claim développe archetype héros"]
}`,
    status: "ACTIVE",
  },
  {
    slug: "myth-arc-cohesion-evaluator",
    name: "Myth Arc Cohesion Evaluator",
    layer: "DC",
    order: 19_002,
    executionType: "LLM",
    pillarKeys: ["A"],
    requiredDrivers: [],
    dependencies: ["big-idea-coherence-checker"],
    description:
      "Évalue la continuité narrative entre 2 chapitres consécutifs d'une Strategy " +
      "(Campaign N vs Campaign N-1). Promotion PRODUCTION du sous-cluster coherence.mythArc " +
      "(MVP heuristic Jaccard). Output : score similarity + continuity flag + arc trajectory.",
    inputFields: ["chapter_n_big_idea", "chapter_n_minus_1_big_idea", "manifesto_anchor"],
    pillarBindings: {
      manifesto_anchor: "a.noyauIdentitaire",
    },
    outputFormat: "myth_arc_cohesion_report",
    promptTemplate: `Tu es l'archiviste narratif de la marque. Évalue si le chapitre N de la trajectoire de marque développe ou contredit le chapitre N-1.

ANCRE MANIFESTO (constante across chapitres) :
{{manifesto_anchor}}

CHAPITRE N-1 (Big Idea précédente) :
{{chapter_n_minus_1_big_idea}}

CHAPITRE N (Big Idea actuelle) :
{{chapter_n_big_idea}}

Produis un JSON strict :
{
  "similarity": 0..1,                      // 0 = totalement disjoint ; 1 = identique
  "continuityFlag": true/false,            // true si N développe N-1 (vs contradicts/ignore)
  "arcTrajectory": "ascending|stable|drift|reset",
  "narrativeCommentary": "2-3 phrases archiviste"
}`,
    status: "ACTIVE",
  },

  // ─── Cluster E — Boucles d'apprentissage ───
  {
    slug: "postmortem-12q",
    name: "Postmortem 12 Questions Canon",
    layer: "DC",
    order: 19_003,
    executionType: "LLM",
    pillarKeys: ["A", "D", "V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Conduit le postmortem structuré canon (12 questions) d'une Campaign post-LIVE. " +
      "Format : { q1: {answer, score, evidenceUrls[]}, ..., q12: ... }. Alimente simultanément " +
      "Oracle reconciler + variable-bible enrichment + Imhotep crew loop + sequences promoter. " +
      "Cf. ADR enfant 0052-E-postmortem-12q.md (12 questions canon variable-bible).",
    inputFields: ["campaign_summary", "tier_delta", "cult_index_delta", "altitude_regression", "actions_summary"],
    pillarBindings: {
      // Inputs viennent du campaign-tracker handler (Campaign.tierBrandFinal, snapshots,
      // etc.) — pas de bindings pillar directs.
    },
    outputFormat: "postmortem_structured_12q",
    promptTemplate: `Tu es l'enquêteur post-mission. Réponds aux 12 questions canoniques du postmortem en t'appuyant strictement sur les données fournies. Aucune invention.

DONNÉES CAMPAGNE :
- Sommaire : {{campaign_summary}}
- Tier delta (BrandClassification composite score) : {{tier_delta}}
- Cult Index delta : {{cult_index_delta}}
- Altitude regression (Loi 1) : {{altitude_regression}}
- Actions exécutées : {{actions_summary}}

12 QUESTIONS CANONIQUES (réponds à chaque) :
1. La Big Idea s'est-elle imposée ? (preuve)
2. Le Manifesto a-t-il été respecté par toutes les actions ? (gap)
3. Quel mode manipulation a dominé en pratique vs prévu ? (drift)
4. Combien d'évangélistes produits ? (devotion ladder transitions)
5. Combien de détracteurs émergents ? (anti-superfans)
6. L'axe Overton a-t-il bougé ? (sectoriel)
7. Quels signaux faibles Tarsis non anticipés ? (capture culturelle)
8. Quelle action a sur-performé / sous-performé ? (postmortem KPI)
9. Quel pillar a régressé silencieusement ? (Loi 1 audit)
10. Quelle séquence Glory mérite promotion DRAFT→STABLE ? (capitalisation)
11. Quel apprentissage entre dans la variable-bible ? (typed)
12. Quelle est la prochaine campagne suggérée pour cette trajectoire ? (chapter N+1)

Pour chaque question, produis un JSON strict :
{ "qN": { "answer": "string", "score": 0..1, "evidenceUrls": ["..."] } }`,
    status: "ACTIVE",
  },
  {
    slug: "crew-performance-evaluator",
    name: "Crew Performance Evaluator (12 dimensions)",
    layer: "DC",
    order: 19_004,
    executionType: "LLM",
    pillarKeys: [],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Score un CampaignTeamMember sur 12 dimensions canoniques (deliverable_quality, " +
      "deadline_respect, team_collaboration, client_communication, creative_originality, " +
      "strategic_alignment, technical_execution, issue_resolution, documentation, cost_discipline, " +
      "innovation, ownership). Output : composite + tier recommendation (PROMOTE/HOLD/DEMOTE) + " +
      "skill gaps + recommended courses. Cf. ADR enfant 0052-E-crew-scoring.md.",
    inputFields: ["member_role", "member_actions_count", "campaign_outcome", "evidence_corpus"],
    pillarBindings: {},
    outputFormat: "crew_performance_score_12d",
    promptTemplate: `Tu es l'évaluateur Imhotep — score un membre d'équipe sur 12 dimensions canoniques. Aucune complaisance, aucune sévérité injustifiée. Tes scores font autorité pour Imhotep crew tier promotion.

MEMBRE :
- Rôle : {{member_role}}
- Nombre d'actions livrées : {{member_actions_count}}
- Outcome campagne : {{campaign_outcome}}
- Corpus de preuve (livrables + feedback + audit log) : {{evidence_corpus}}

Score chaque dimension 0..100 :
1. deliverable_quality
2. deadline_respect
3. team_collaboration
4. client_communication
5. creative_originality
6. strategic_alignment
7. technical_execution
8. issue_resolution
9. documentation
10. cost_discipline
11. innovation
12. ownership

Produis JSON strict :
{
  "byDimension": {"deliverable_quality": N, ..., "ownership": N},
  "composite": N,                                   // moyenne pondérée
  "tierRecommendation": "PROMOTE" | "HOLD" | "DEMOTE",
  "skillGaps": ["..."],                              // top 3 dimensions <50
  "recommendedCourses": ["course-slug-1", ...]      // matchent skillGaps
}`,
    status: "ACTIVE",
  },

  // ─── Cluster H — Negative space audit ───
  {
    slug: "negative-space-auditor",
    name: "Negative Space Auditor",
    layer: "DC",
    order: 19_005,
    executionType: "LLM",
    pillarKeys: ["A", "D", "V", "E"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Audit cross-Neteru — détecte les 6 catégories de gaps (BRAND_OBLIGATION_UNCOVERED, " +
      "LADDER_RUNG_ORPHAN, TACTICAL_ACTIVATION_MISSING, CHANNEL_FIT_GAP, " +
      "ORACLE_RECONCILIATION_PARTIAL, DORMANT_TOOL_HINT). Promotion PRODUCTION du sous-cluster " +
      "audit.negativeSpace (MVP heuristic 3/6 inline). Output : findings + severity + recommendations.",
    inputFields: ["manifesto_obligations", "actions_summary", "tarsis_emergent_signals", "advertis_phase_target", "oracle_sections_impacted", "available_glory_tools"],
    pillarBindings: {
      manifesto_obligations: "a.preuvesAuthenticite",
    },
    outputFormat: "negative_space_findings",
    promptTemplate: `Tu es l'auditeur cross-Neteru. Identifie ce qui n'a PAS été fait et qui aurait dû l'être, sur 6 dimensions canoniques. Pas de redondance avec ce qui est documenté ailleurs — focus sur les omissions.

INPUTS :
- Manifesto obligations : {{manifesto_obligations}}
- Actions summary (pillarServed[] aggregated) : {{actions_summary}}
- Tarsis emergent signals : {{tarsis_emergent_signals}}
- Phase ADVERTIS visée : {{advertis_phase_target}}
- Oracle sections normalement impactées : {{oracle_sections_impacted}}
- Glory tools disponibles non invoqués : {{available_glory_tools}}

Produis JSON strict :
{
  "findings": [
    {
      "category": "BRAND_OBLIGATION_UNCOVERED" | "LADDER_RUNG_ORPHAN" | "TACTICAL_ACTIVATION_MISSING" | "CHANNEL_FIT_GAP" | "ORACLE_RECONCILIATION_PARTIAL" | "DORMANT_TOOL_HINT",
      "severity": "INFO" | "WARNING" | "CRITICAL",
      "description": "1-2 phrases factuelles",
      "recommendation": "action concrète corrective",
      "relatedEntityIds": ["ids Prisma concernés"]
    }
  ]
}

Sois exhaustif sur les 6 catégories — retourner array vide est valide si le périmètre est parfait.`,
    status: "ACTIVE",
  },

  // ─── Cluster D — MCP context PII classifier ───
  {
    slug: "mcp-content-pii-classifier",
    name: "MCP Content PII Classifier",
    layer: "DC",
    order: 19_006,
    executionType: "LLM",
    pillarKeys: [],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Classifie le content body d'un MCP context entrant (Slack/Notion/Drive/GitHub) " +
      "en CLEAN | PII_DETECTED_REJECTED | PII_REDACTED. Promotion PRODUCTION du sous-cluster " +
      "culture.mcpIngest (MVP regex baseline 4 patterns). Plus précis qu'une regex — " +
      "détecte numéros, emails, adresses postales, identifiants administratifs, données médicales.",
    inputFields: ["content_body", "source_type"],
    pillarBindings: {},
    outputFormat: "pii_classification_verdict",
    promptTemplate: `Tu es le classifier PII. Analyse le content suivant et identifie toute donnée personnelle identifiable (PII) à protéger avant stockage.

CONTENT (source: {{source_type}}) :
{{content_body}}

Produis JSON strict :
{
  "verdict": "CLEAN" | "PII_DETECTED_REJECTED" | "PII_REDACTED",
  "piiTypes": ["EMAIL", "PHONE", "POSTAL_ADDRESS", "GOVERNMENT_ID", "MEDICAL", "FINANCIAL", "BIOMETRIC"],
  "redactedContent": "string",                  // version PII-free si PII_REDACTED
  "rejectionReason": "string|null",             // si PII_DETECTED_REJECTED
  "confidence": 0..1
}

Règles strictes :
- Email professionnel public d'une entreprise : CLEAN.
- Email personnel : PII_DETECTED.
- Numéro de téléphone : PII_DETECTED.
- Adresse postale complète : PII_DETECTED.
- Identifiants administratifs, sécurité sociale, passeport, carte bancaire : PII_DETECTED_REJECTED (refuser stockage).
- Mention de pathologie médicale liée à un nom : PII_DETECTED_REJECTED.`,
    status: "ACTIVE",
  },
];
