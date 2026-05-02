/**
 * Phase 15 — Anubis Glory tools (ADR-0020, full activation Comms).
 *
 * 3 nouveaux tools pour orchestrer ad-copy generation, audience targeting,
 * broadcast scheduling.
 *
 * Tous wrappent les services satellites + provider façades feature-flagged.
 * Les tools qui appellent providers externes (ad-copy-generator) retournent
 * en cas de credentials absentes : DEFERRED_AWAITING_CREDENTIALS (cf. ADR-0021).
 *
 * APOGEE compliance :
 * - Sous-système : Comms (Ground #7) — dernier sous-système Ground actif
 * - Pilier 4 : pas de pre-conditions strictes (Anubis governance check credentials)
 * - Loi 3 (Conservation carburant) : ad-copy LLM cost ~$0.02-0.05 par variant
 */

import type { GloryToolDef } from "./types";

export const PHASE15_ANUBIS_TOOLS: GloryToolDef[] = [
  {
    slug: "ad-copy-generator",
    name: "Générateur d'Ad Copy",
    layer: "CR",
    order: 61,
    executionType: "LLM",
    pillarKeys: ["V", "S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Génère 3 variants d'ad copy pour une campagne paid ads, alignés sur le mode manipulation déclaré (peddler/dealer/facilitator/entertainer) et les contraintes du provider (Meta/Google/X/TikTok).",
    inputFields: ["campaign_brief", "manipulation_mode", "provider", "audience_segment", "char_limit"],
    pillarBindings: {
      campaign_brief: "v.promesse",
      manipulation_mode: "s.modeOps",
    },
    outputFormat: "ad_copy_variants",
    promptTemplate: `Tu es Anubis, psychopompe des messages. Tu produis 3 variants d'ad copy.

Brief campagne : {{campaign_brief}}
Mode manipulation : {{manipulation_mode}} (peddler=urgence/scarcity, dealer=hooks récurrents, facilitator=valeur/utilité, entertainer=narratif/esthétique)
Provider : {{provider}}
Segment audience : {{audience_segment}}
Char limit : {{char_limit}}

Produis 3 variants distincts (A/B/C) :
- chacun aligné sur le mode déclaré
- chacun respecte char_limit
- chacun a une CTA explicite adaptée au provider
- inclut 2-3 hashtags si provider supporte

Format JSON : { "variants": [{label: "A", copy: "...", cta: "...", hashtags: [...]}], "rationale": "..." }.`,
    status: "ACTIVE",
  },

  {
    slug: "audience-targeter",
    name: "Cibleur d'Audience",
    layer: "HYBRID",
    order: 62,
    executionType: "LLM",
    pillarKeys: ["D", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Propose des règles de segmentation pour une audience cible (sector, devotion tier, geo, behavior). Output JSON queryable pour ad networks.",
    inputFields: ["target_persona", "sector", "geo_constraints", "exclude_existing_customers"],
    pillarBindings: {
      target_persona: "d.personas",
      sector: "v.secteur",
    },
    outputFormat: "audience_segment_rules",
    promptTemplate: `Tu es Anubis, segmenteur d'audience. Tu produis des règles de targeting.

Persona cible : {{target_persona}}
Secteur : {{sector}}
Géo : {{geo_constraints}}
Exclure clients existants : {{exclude_existing_customers}}

Produis un objet rules JSON queryable :
- demographics (age, gender, income range)
- interests (categories ad-network compatibles)
- behaviors (purchase intent, lifestyle)
- exclusions (existing_customers_emails si demandé)
- estimatedReach (range "100K-500K")

Format JSON : { "rules": {...}, "estimatedReach": "...", "rationale": "..." }.`,
    status: "ACTIVE",
  },

  {
    slug: "broadcast-scheduler",
    name: "Planificateur de Broadcast",
    layer: "HYBRID",
    order: 63,
    executionType: "CALC",
    pillarKeys: ["T", "S"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Calcule les fenêtres optimales d'envoi broadcast (timezone audience, historiques engagement, contraintes provider quiet-hours). Output liste de timestamps schedulables.",
    inputFields: ["channels", "audience_timezone", "preferred_hours", "blackout_dates"],
    pillarBindings: {},
    outputFormat: "broadcast_schedule",
    promptTemplate: `CALC — pas de prompt LLM. Calcul déterministe :

1. Convertir audience_timezone → UTC offsets
2. Filtrer preferred_hours par quiet-hours provider (NotificationPreference.quiet)
3. Exclure blackout_dates (jours fériés audience, week-ends si B2B)
4. Pour chaque channel, calculer top 3 fenêtres (jour+heure)
5. Retourner timestamps ISO8601 next 30 days

Format JSON : { "schedule": [{channel, scheduledFor, expectedReach, rationale}] }.`,
    status: "ACTIVE",
  },
];
