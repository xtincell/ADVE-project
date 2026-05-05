/**
 * Deliverable Orchestrator — Types & errors (Phase 17, ADR-0050 — anciennement ADR-0037).
 *
 * Layer 1 — pas d'IO, pas de Prisma, pas de mestor. Pure DTO.
 *
 * Cf. docs/governance/adr/0050-output-first-deliverable-composition.md
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";

/**
 * Un nœud du DAG résolu : un Glory tool qui produit un brief consommé en aval
 * (ou un kind feuille à fournir par le vault).
 */
export interface BriefRequirement {
  /** BrandAsset.kind que ce nœud représente (cible matérielle, brief, ou kind upstream). */
  readonly kind: BrandAssetKind;
  /** Glory tool slug qui produit ce brief. `null` = nœud feuille consommé tel quel depuis le vault. */
  readonly producerSlug: string | null;
  /** Profondeur DAG (0 = livrable cible matériel, N = pillars/leaf upstream). */
  readonly depth: number;
  /** Kinds upstream que CE nœud requiert (pour debug / UI). */
  readonly requires: readonly BrandAssetKind[];
}

/** Statut d'un kind requis au regard du vault de la strategy. */
export type VaultMatchStatus =
  | "ACTIVE_REUSE"      // BrandAsset state=ACTIVE non-stale → on réutilise
  | "STALE_REFRESH"     // BrandAsset state=ACTIVE mais staleAt<now → on rafraîchit
  | "MISSING_GENERATE"; // aucun BrandAsset state=ACTIVE → on génère

export interface VaultMatchResult {
  readonly kind: BrandAssetKind;
  readonly status: VaultMatchStatus;
  /** ID du BrandAsset ACTIVE trouvé (ACTIVE_REUSE / STALE_REFRESH), null si MISSING. */
  readonly assetId: string | null;
  /** State observé (ACTIVE / SUPERSEDED / DRAFT / etc.) ; null si MISSING. */
  readonly assetState: string | null;
  /** Date d'expiration si déclarée. */
  readonly staleAt: Date | null;
}

/**
 * Plan complet de composition produit par `resolveRequirements` + `matchVault`.
 *
 * Équivaut à la "facture" préalable affichée au founder avant qu'il valide
 * `Lancer la production` (Loi 3 fuel — confirmation utilisateur obligatoire).
 */
export interface DeliverableComposition {
  /** BrandAsset.kind matériel demandé par le founder. */
  readonly targetKind: BrandAssetKind;
  /** Glory tool qui matérialisera le livrable cible (forgeOutput présent). */
  readonly targetGloryToolSlug: string;
  /**
   * DAG topologique trié — depth 0 = nœud target, depth croissant vers feuilles.
   * Construit par `resolveRequirements`. Garanti acyclique (cycle = throw).
   */
  readonly briefDag: readonly BriefRequirement[];
  /** Diff vault par kind requis. Construit par `matchVault`. */
  readonly vaultMatches: readonly VaultMatchResult[];
  /** Estimation cout USD agrégé (LLM Glory tools manquants + Ptah forges). */
  readonly estimatedCostUsd: number;
  /**
   * Pre-conditions Loi 2 manquantes (manipulationMix.primary absent, aucun
   * pilier ADVE state=ACTIVE, etc.). Vide = composition autorisée.
   */
  readonly missingPreconditions: readonly string[];
}

/**
 * Output public du handler `composeDeliverable`.
 *
 * Phase 17 commit 3 : seul `PREVIEW` est implémenté. Le dispatch async réel
 * (status `DISPATCHED`) arrive avec le router tRPC commit 4 ou ultérieur.
 */
export interface ComposeDeliverableOutput {
  readonly composition: DeliverableComposition;
  readonly status: "PREVIEW" | "DISPATCHED" | "MISSING_PRECONDITIONS";
  /** Présent quand status=DISPATCHED — pointer vers la SequenceExecution lancée. */
  readonly sequenceExecutionId: string | null;
  /** Summary lisible utilisé pour `IntentResult.summary`. */
  readonly summary: string;
}

// ── Erreurs structurées ──────────────────────────────────────────────────

export class ResolverCycleDetectedError extends Error {
  readonly code = "RESOLVER_CYCLE_DETECTED";
  constructor(public readonly cycle: readonly BrandAssetKind[]) {
    super(`RESOLVER_CYCLE_DETECTED: ${cycle.join(" -> ")}`);
    this.name = "ResolverCycleDetectedError";
  }
}

export class TargetNotForgeableError extends Error {
  readonly code = "TARGET_NOT_FORGEABLE";
  constructor(public readonly targetKind: BrandAssetKind) {
    super(
      `TARGET_NOT_FORGEABLE: no Glory tool registered as producer for kind=${targetKind} ` +
        `(see deliverable-orchestrator/target-mapping.ts to register one).`,
    );
    this.name = "TargetNotForgeableError";
  }
}

export class MissingPreconditionPillarError extends Error {
  readonly code = "MISSING_PRECONDITION_PILLAR";
  constructor(public readonly missing: readonly string[]) {
    super(`MISSING_PRECONDITION_PILLAR: ${missing.join(", ")}`);
    this.name = "MissingPreconditionPillarError";
  }
}
