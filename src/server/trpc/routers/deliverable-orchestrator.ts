/**
 * Deliverable Orchestrator Router — NETERU-Governed (Phase 17b, ADR-0050 — anciennement ADR-0037).
 *
 * Surface tRPC du service `deliverable-orchestrator` (Propulsion / Artemis
 * governor). 3 procédures :
 *
 *   1. `resolveRequirements` (query)  — Sync resolver pur. Pas de DB-write.
 *      Retourne le DAG résolu sans scan vault — utile pour preview UI rapide
 *      avant de soumettre la composition complète.
 *
 *   2. `compose` (mutation)            — Mode PREVIEW (Phase 17 commit 4).
 *      Passe par `mestor.emitIntent({ kind: "COMPOSE_DELIVERABLE" })` qui
 *      route vers Artemis commandant → handler `composeDeliverable` du
 *      service. Retourne `DeliverableComposition` complète + status.
 *      Le mode DISPATCHED viendra avec un commit ultérieur.
 *
 *   3. `listSupportedKinds` (query)   — Helper UI : liste des
 *      `BrandAsset.kind` matériels supportés par le composer (table
 *      `target-mapping`). Sert au sélecteur étape 0 du wizard cockpit
 *      (commit 5).
 *
 * Pattern : `auditedProtected` — identique aux autres routers gouvernés
 * (brief-ingest, anubis). Toutes les mutations hash-chainées dans
 * `IntentEmission` via `mestor.emitIntent`.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

/* lafusee:governed-active — compose mutation traverses mestor.emitIntent({ kind: "COMPOSE_DELIVERABLE" }), service imports are types + sync resolvers (read-only DAG resolution + vault scan, no DB writes outside emitIntent) */
import {
  resolveRequirements,
  matchVault,
  extractUpstreamKinds,
  SUPPORTED_TARGET_KINDS,
  isSupportedTargetKind,
  TargetNotForgeableError,
  ResolverCycleDetectedError,
} from "@/server/services/deliverable-orchestrator";
import { emitIntent } from "@/server/services/mestor/intents";

const auditedProtected = auditedProcedure(protectedProcedure, "deliverable-orchestrator");

const targetKindSchema = z.string().refine(isSupportedTargetKind, {
  message:
    "TARGET_NOT_FORGEABLE — kind absent du mapping Phase 17. Voir SUPPORTED_TARGET_KINDS.",
});

export const deliverableOrchestratorRouter = createTRPCRouter({
  /**
   * Helper UI — liste des `BrandAsset.kind` matériels supportés par le
   * composer (table target-mapping). Sert au sélecteur étape 0 du wizard
   * cockpit Phase 17 commit 5.
   */
  listSupportedKinds: protectedProcedure.query(() => {
    return {
      kinds: SUPPORTED_TARGET_KINDS,
    };
  }),

  /**
   * Sync resolver pur — retourne le DAG résolu + (optionnel) scan vault.
   *
   * Sans `strategyId` : DAG seul, sans vault-matches (preview UI ultra-rapide
   * lors du choix du target kind, avant qu'une strategy soit sélectionnée).
   *
   * Avec `strategyId` : DAG + vault-matches scannés sur la strategy. Utile
   * pour afficher les diff "Réutiliser / Rafraîchir / Générer" avant de
   * lancer `compose`.
   */
  resolveRequirements: auditedProtected
    .input(
      z.object({
        targetKind: targetKindSchema,
        strategyId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      let resolved;
      try {
        resolved = resolveRequirements(input.targetKind);
      } catch (err) {
        if (err instanceof TargetNotForgeableError) {
          return {
            ok: false as const,
            code: "TARGET_NOT_FORGEABLE" as const,
            message: err.message,
            targetKind: err.targetKind,
          };
        }
        if (err instanceof ResolverCycleDetectedError) {
          return {
            ok: false as const,
            code: "RESOLVER_CYCLE_DETECTED" as const,
            message: err.message,
            cycle: err.cycle,
          };
        }
        throw err;
      }

      const { targetSlug, briefDag } = resolved;

      // Vault scan optionnel
      let vaultMatches = null;
      if (input.strategyId) {
        const upstream = extractUpstreamKinds(briefDag);
        vaultMatches = await matchVault(input.strategyId, upstream);
      }

      return {
        ok: true as const,
        targetKind: input.targetKind,
        targetGloryToolSlug: targetSlug,
        briefDag,
        vaultMatches,
      };
    }),

  /**
   * Mode PREVIEW (Phase 17 commit 4). Passe par
   * `mestor.emitIntent({ kind: "COMPOSE_DELIVERABLE" })` qui route vers
   * Artemis commandant → handler `composeDeliverable` du service.
   *
   * Côté router : pas de logique métier — pure passerelle hash-chainée vers
   * mestor. Toute la logique vit dans `composer.ts`.
   *
   * Le mode DISPATCHED (status retourné par le composer) viendra avec un
   * commit ultérieur — il fera le dispatch async via sequence-executor.
   */
  compose: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        targetKind: targetKindSchema,
        campaignId: z.string().optional(),
        overrideManipulationMode: z
          .enum(["peddler", "dealer", "facilitator", "entertainer"])
          .optional(),
        previewOnly: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;

      const result = await emitIntent({
        kind: "COMPOSE_DELIVERABLE",
        strategyId: input.strategyId,
        operatorId,
        targetKind: input.targetKind,
        campaignId: input.campaignId,
        overrideManipulationMode: input.overrideManipulationMode,
        previewOnly: input.previewOnly,
      });

      return {
        intentResult: result,
      };
    }),
});
