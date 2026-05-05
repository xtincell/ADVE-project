/**
 * Deliverable Orchestrator — Public API (Phase 17, ADR-0050 — anciennement ADR-0037).
 *
 * Service Propulsion gouverné par Artemis. Output-first deliverable
 * composition : prend un `BrandAsset.kind` matériel cible et résout en
 * arrière la cascade Glory→Brief→Forge complète.
 *
 * Surface :
 *   - composeDeliverable() : handler de l'Intent COMPOSE_DELIVERABLE,
 *     mode PREVIEW (commit 3).
 *   - resolveRequirements() : DAG resolver pur (testable, pas de DB).
 *   - matchVault() : vault scan ACTIVE/stale (Prisma read-only).
 *   - target-mapping : table BrandAsset.kind → Glory tool slug producteur.
 *   - types : DTO + erreurs structurées.
 *
 * Cf. docs/governance/adr/0050-output-first-deliverable-composition.md
 */

export { composeDeliverable } from "./composer";
export { resolveRequirements, extractUpstreamKinds, describeDag } from "./resolver";
export { matchVault, extractToGenerate, extractToReuse } from "./vault-matcher";
export {
  TARGET_KIND_TO_PRODUCER_SLUG,
  SUPPORTED_TARGET_KINDS,
  getProducerSlug,
  isSupportedTargetKind,
  type SupportedTargetKind,
} from "./target-mapping";

export type {
  BriefRequirement,
  VaultMatchStatus,
  VaultMatchResult,
  DeliverableComposition,
  ComposeDeliverableOutput,
} from "./types";

export {
  ResolverCycleDetectedError,
  TargetNotForgeableError,
  MissingPreconditionPillarError,
} from "./types";
