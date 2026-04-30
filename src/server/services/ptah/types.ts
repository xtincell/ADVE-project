/**
 * Ptah types — ForgeBrief, ForgeSpec, ForgeProvider interface.
 *
 * Layer 3. Cf. ADR-0009 + PANTHEON.md §2.5.
 */

import type { PillarKey } from "@/domain/pillars";

export type ManipulationMode = "peddler" | "dealer" | "facilitator" | "entertainer";

export const MANIPULATION_MODES: readonly ManipulationMode[] = [
  "peddler",
  "dealer",
  "facilitator",
  "entertainer",
] as const;

export type ForgeKind =
  | "image"
  | "video"
  | "audio"
  | "icon"
  | "refine"
  | "transform"
  | "classify"
  | "stock"
  | "design";

export const FORGE_KINDS: readonly ForgeKind[] = [
  "image",
  "video",
  "audio",
  "icon",
  "refine",
  "transform",
  "classify",
  "stock",
  "design",
] as const;

export type ProviderName = "magnific" | "adobe" | "figma" | "canva";

export const PROVIDER_NAMES: readonly ProviderName[] = [
  "magnific",
  "adobe",
  "figma",
  "canva",
] as const;

/**
 * ForgeSpec — partie machine-lisible d'un ForgeBrief Artemis.
 * Indique à Mestor que l'output Glory tool doit être matérialisé par Ptah.
 */
export interface ForgeSpec {
  kind: ForgeKind;
  /** Hint provider — Ptah peut override via routing/provider-selector. */
  providerHint?: ProviderName;
  /** Hint modèle (ex: "mystic", "kling-3", "flux-2-pro"). */
  modelHint?: string;
  /** Paramètres provider-spécifiques (prompt, dimensions, durée, etc.). */
  parameters: Record<string, unknown>;
}

/**
 * ForgeBrief — output Glory tool brief-to-forge.
 * Contient le brief texte + le forgeSpec qui handoff à Ptah.
 */
export interface ForgeBrief {
  /** Texte du brief (déjà généré par Artemis Glory tool). */
  briefText: string;
  /** Spec machine-lisible pour Ptah. */
  forgeSpec: ForgeSpec;
  /**
   * Pillar source — quel pillar A/D/V/E/R/T/I/S justifie cette forge.
   * Obligatoire (ancrage téléologique — voir PANTHEON.md §2.5).
   */
  pillarSource: PillarKey;
  /** Mode demandé. Doit être dans Strategy.manipulationMix. */
  manipulationMode: ManipulationMode;
}

/**
 * Payload PTAH_MATERIALIZE_BRIEF.
 */
export interface MaterializeBriefPayload {
  strategyId: string;
  /** intentId du INVOKE_GLORY_TOOL Artemis qui a produit le brief. */
  sourceIntentId: string;
  brief: ForgeBrief;
  /** Override pour cas tests / expérimentations. Loggé dans IntentEmission. */
  overrideMixViolation?: boolean;
}

/**
 * Résultat synchrone d'une forge — task créé, asset livré plus tard via webhook.
 */
export interface ForgeTaskCreated {
  taskId: string;
  provider: ProviderName;
  providerModel: string;
  estimatedCostUsd: number;
  status: "CREATED" | "IN_PROGRESS";
  /** Pour webhook providers (Magnific) — secret unique de cette task. */
  webhookSecret: string;
}

/**
 * Résultat de réconciliation (webhook arrivé).
 */
export interface ForgeReconciled {
  taskId: string;
  assetVersionIds: string[];
  realisedCostUsd: number;
  resultUrls: string[];
}

/**
 * Interface unifiée des 4 providers (ADR-0009).
 * Plugin sandboxing ADR-0008 : chaque implémentation déclare ses externalDomains[].
 */
export interface ForgeProvider {
  readonly name: ProviderName;
  /**
   * Domaines externes whitelistés (pour ADR-0008 sandboxing futur + audit).
   */
  readonly externalDomains: readonly string[];
  /**
   * Lance la forge. Renvoie un task créé + estimation coût.
   * L'asset est livré plus tard (webhook ou polling reconcile).
   */
  forge(brief: ForgeBrief, webhookUrl?: string): Promise<{
    providerTaskId: string;
    providerModel: string;
    estimatedCostUsd: number;
    webhookSecret: string;
  }>;
  /**
   * Réconcilie un task à partir d'un payload webhook (ou polling sync).
   * Renvoie URLs des assets + coût réalisé.
   */
  reconcile(
    providerTaskId: string,
    webhookPayload?: unknown,
  ): Promise<{
    resultUrls: string[];
    realisedCostUsd: number;
    completedAt: Date;
  }>;
  /**
   * Vérifie la signature/secret d'un webhook entrant. Fail-closed.
   */
  verifyWebhook(req: { headers: Headers; bodyText: string; expectedSecret: string }): boolean;
  /**
   * Estimation pré-flight du coût (USD) pour un brief donné.
   * Utilisé par Thot CHECK_CAPACITY avant l'invocation Ptah.
   */
  estimateCost(brief: ForgeBrief): number;
  /**
   * Disponibilité (circuit breaker, quota provider, etc.).
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Statut d'un GenerativeTask — miroir DB.
 */
export type ForgeTaskStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "VETOED"
  | "EXPIRED";
