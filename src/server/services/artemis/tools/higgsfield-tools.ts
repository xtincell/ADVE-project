/**
 * Higgsfield Glory Tools — Phase 16 / ADR-0028.
 *
 * 3 outils optionnels qui exposent Higgsfield AI motion + lifestyle imagery
 * en tant que Glory tools atomiques (executionType="MCP", requiresPaidTier=true).
 *
 * Higgsfield = MCP server externe (https://mcp.higgsfield.ai/mcp), enregistré
 * dans `McpRegistry` direction=INBOUND, credentials gérés via Anubis Credentials
 * Vault avec OAuth 2.1 device flow (RFC 8628 + discovery RFC 9728).
 *
 * Ces tools n'apparaissent dans le registry que lorsqu'on les import explicitement.
 * Pas de cascade Glory→Brief→Forge automatique : on retourne directement l'URL
 * d'asset (l'opérateur peut ensuite déclencher PTAH_MATERIALIZE_BRIEF s'il veut
 * promouvoir l'output en BrandAsset matériel avec cost gate Thot + pillarSource).
 *
 * Pourquoi Glory tools et pas providers Ptah :
 *   - Atomicité : 1 capability = 1 tool, invocable directement par Artemis
 *   - Légèreté : ~50 LoC vs ~300 LoC pour un ForgeProvider complet
 *   - Pas de doublon avec Magnific qui couvre déjà 8 modèles vidéo génériques
 *   - Higgsfield apporte 3 capacités UNIQUES (motion control, lifestyle portrait,
 *     style transfer) qui ne justifient pas un Neter ou un provider lourd
 *
 * Cf. ADR-0028 — "Glory tools as primary API surface, Ptah as orchestrator".
 */

import type { GloryToolDef } from "./registry";

const HIGGSFIELD_MCP_SERVER = "higgsfield";

/**
 * Higgsfield DoP — Director of Photography.
 *
 * Génère une vidéo avec contrôle précis des mouvements caméra cinématiques
 * (dolly, push-in, pull-out, orbit, crane, handheld, FPV…). USP unique de
 * Higgsfield qu'aucun autre provider du repo (Magnific Kling/Veo/Runway) ne
 * couvre avec cette précision.
 */
export const HIGGSFIELD_DOP_TOOL: GloryToolDef = {
  slug: "higgsfield-dop-camera-motion",
  name: "Higgsfield DoP — Mouvement caméra cinématique",
  layer: "BRAND",
  order: 100,
  executionType: "MCP",
  pillarKeys: ["D", "E"],
  requiredDrivers: ["VIDEO", "TV", "INSTAGRAM", "TIKTOK"],
  dependencies: [],
  description:
    "Génère une vidéo avec mouvement caméra cinématique contrôlé (dolly, push-in, orbit, crane, etc.) via Higgsfield DoP. Réservé aux abonnements payants.",
  inputFields: ["prompt", "camera_motion", "duration_seconds", "reference_image_url"],
  pillarBindings: {},
  outputFormat: "video_url",
  promptTemplate: "{{prompt}}",
  status: "ACTIVE",
  requiresPaidTier: true,
  mcpDescriptor: {
    serverName: HIGGSFIELD_MCP_SERVER,
    toolName: "dop_generate",
    paramMap: {
      prompt: "prompt",
      camera_motion: "motion_preset",
      duration_seconds: "duration",
      reference_image_url: "reference_image",
    },
  },
};

/**
 * Higgsfield Soul — Portrait lifestyle hyperréaliste.
 *
 * Génère un portrait lifestyle ultra-réaliste avec rendu peau, cheveux, lumière
 * naturelle. Différenciant pour ambassadeurs, packshots humains, portraits
 * founders/équipe — le rendu paraît moins "AI" que Flux/Imagen.
 */
export const HIGGSFIELD_SOUL_TOOL: GloryToolDef = {
  slug: "higgsfield-soul-portrait",
  name: "Higgsfield Soul — Portrait lifestyle hyperréaliste",
  layer: "BRAND",
  order: 101,
  executionType: "MCP",
  pillarKeys: ["A", "D"],
  requiredDrivers: ["INSTAGRAM", "WEBSITE", "PRINT"],
  dependencies: [],
  description:
    "Génère un portrait lifestyle hyperréaliste via Higgsfield Soul (rendu peau/lumière naturel, moins 'AI' que Flux/Imagen). Réservé aux abonnements payants.",
  inputFields: ["subject_description", "scene_context", "style_reference_url"],
  pillarBindings: {
    style_reference_url: "d.directionArtistique.moodboard.theme",
  },
  outputFormat: "image_url",
  promptTemplate: "{{subject_description}} — {{scene_context}}",
  status: "ACTIVE",
  requiresPaidTier: true,
  mcpDescriptor: {
    serverName: HIGGSFIELD_MCP_SERVER,
    toolName: "soul_generate",
    paramMap: {
      subject_description: "subject",
      scene_context: "scene",
      style_reference_url: "style_reference",
    },
  },
};

/**
 * Higgsfield Steal — Style transfer vidéo depuis image de référence.
 *
 * Applique le style visuel d'une image de référence (charte de marque, KV
 * iconique, mood signature) à une séquence vidéo générée. Utile pour transposer
 * un look brand à du content vidéo avec cohérence visuelle élevée.
 */
export const HIGGSFIELD_STEAL_TOOL: GloryToolDef = {
  slug: "higgsfield-steal-style-transfer",
  name: "Higgsfield Steal — Style transfer vidéo",
  layer: "BRAND",
  order: 102,
  executionType: "MCP",
  pillarKeys: ["D", "V"],
  requiredDrivers: ["VIDEO", "INSTAGRAM", "TIKTOK"],
  dependencies: [],
  description:
    "Applique le style d'une image de référence à une vidéo générée via Higgsfield Steal (cohérence visuelle brand). Réservé aux abonnements payants.",
  inputFields: ["prompt", "style_reference_url", "duration_seconds"],
  pillarBindings: {
    style_reference_url: "d.directionArtistique.moodboard.theme",
  },
  outputFormat: "video_url",
  promptTemplate: "{{prompt}}",
  status: "ACTIVE",
  requiresPaidTier: true,
  mcpDescriptor: {
    serverName: HIGGSFIELD_MCP_SERVER,
    toolName: "steal_generate",
    paramMap: {
      prompt: "prompt",
      style_reference_url: "style_reference",
      duration_seconds: "duration",
    },
  },
};

/**
 * Set complet des Glory tools Higgsfield, à splatter dans le registry global.
 *
 * Pas de "phase APOGEE" — c'est un set provider externe optionnel.
 */
export const HIGGSFIELD_TOOLS: GloryToolDef[] = [
  HIGGSFIELD_DOP_TOOL,
  HIGGSFIELD_SOUL_TOOL,
  HIGGSFIELD_STEAL_TOOL,
];
