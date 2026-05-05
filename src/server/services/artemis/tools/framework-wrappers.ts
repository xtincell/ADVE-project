/**
 * src/server/services/artemis/tools/framework-wrappers.ts
 *
 * Phase 17 (ADR-0039) — Wrappers single-step autour des frameworks Artemis legacy.
 *
 * Sequence devient l'unité publique unique d'Artemis. Les 24 frameworks
 * existants restent accessibles isolément, mais uniquement via leur wrap
 * `WRAP-FW-<slug>` qui est une `GlorySequenceDef` single-step `type: "ARTEMIS"`.
 *
 * Émission canonique :
 *   mestor.emitIntent({
 *     kind: "RUN_ORACLE_SEQUENCE",
 *     strategyId,
 *     sequenceKey: `WRAP-FW-${frameworkSlug}`,
 *     input: {},
 *   })
 *
 * Audit hash chain présent (IntentEmission), promotion BrandAsset
 * disponible (uniformément avec les autres sequences), quality gate
 * post-sequence appliquable (Phase 17 Chantier C, ADR-0041).
 *
 * Note circular import : ce fichier n'importe **que les types** depuis
 * `./sequences` (élidés au runtime). Les helpers de step sont inlined
 * pour éviter un cycle `sequences.ts ↔ framework-wrappers.ts`.
 */

import { FRAMEWORKS, type FrameworkDef } from "../frameworks";
import type {
  GlorySequenceDef,
  GlorySequenceKey,
  SequenceStep,
} from "./sequences";

/**
 * Construit une `GlorySequenceDef` single-step qui wrappe un framework Artemis.
 *
 * Pattern unifié : tous les callers (Mestor, Oracle enrich, pillar.validate
 * triggerNextStageSequences, debug tools) passent par cette fonction au lieu
 * d'appeler `executeFramework` direct. Ferme F1 (bypass Mestor) + F11 (bypass
 * triggerNextStageFrameworks fire-and-forget).
 */
export function wrapFrameworkAsSequence(frameworkSlug: string): GlorySequenceDef {
  const fw = FRAMEWORKS.find((f) => f.slug === frameworkSlug);
  if (!fw) throw new Error(`Unknown framework: ${frameworkSlug}`);

  const artemisStep: SequenceStep = {
    type: "ARTEMIS",
    ref: fw.slug,
    name: fw.name,
    outputKeys: fw.outputFields,
    status: "ACTIVE",
  };

  const pillar = (fw.pillarKeys[0] ?? "a").toUpperCase();

  return {
    key: `WRAP-FW-${frameworkSlug}` as GlorySequenceKey,
    family: "WRAP",
    name: `Wrap: ${fw.name}`,
    description: `Single-step wrap autour du framework ${frameworkSlug} — accès gouverné via EXECUTE_GLORY_SEQUENCE (Phase 17, ADR-0039).`,
    pillar,
    steps: [artemisStep],
    aiPowered: true,
    lifecycle: "DRAFT",
    tier: 0,
    requires: fw.dependencies.map((depSlug) => ({
      type: "SEQUENCE" as const,
      key: `WRAP-FW-${depSlug}` as GlorySequenceKey,
      status: "ACCEPTED" as const,
    })),
  };
}

/**
 * Auto-generate les 24 wrappers single-step pour tous les frameworks Artemis
 * existants. Branchés dans `ALL_SEQUENCES` (cf. sequences.ts).
 */
export const WRAP_SEQUENCES: GlorySequenceDef[] = FRAMEWORKS.map((fw: FrameworkDef) =>
  wrapFrameworkAsSequence(fw.slug),
);
