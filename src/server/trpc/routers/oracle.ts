/**
 * Oracle Router — Phase 21 F-C (ADR-0070)
 *
 * Procédures tRPC pour la génération unitaire des sections Oracle. Délègue
 * à `Mestor.emitIntent({ kind: "GENERATE_ORACLE_SECTION", ... })` (LOI 1 — no
 * bypass governance).
 *
 * Procédures :
 *   - listSections(strategyId) — liste 35 sections avec status (lazy seed
 *     transparent si manquantes).
 *   - getSection(strategyId, sectionId) — détail single section.
 *   - generateSection(strategyId, sectionId, mode?) — émet le Intent. Mode
 *     par défaut = "FRESH" si PENDING, "REGEN" si COMPLETE, "RETRY" si
 *     FAILED ou STALE (auto-detect depuis status courant).
 *   - retrySection(strategyId, sectionId) — convenience pour mode RETRY
 *     explicite (audit log clair "opérateur a retenté").
 *   - snapshotStrategy(strategyId) — counts par status (UI dashboard).
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import {
  getSectionsForStrategy,
  getSection,
  snapshotStrategy,
} from "@/server/services/oracle-section";
import { buildOracleCatalog } from "@/server/services/strategy-presentation/oracle-catalog";
/* lafusee:governed-active — reads only (catalog + section snapshots) ; mutations (generate/retry/assemble) traverse mestor.emitIntent. */

const SectionIdSchema = z.number().int().min(1).max(35);

export const oracleRouter = createTRPCRouter({
  /**
   * Static documentation catalog of the 35 Oracle sections (consult-before-arming,
   * Phase 24) : subtitle/description, producing runner, ADVERTIS variables consumed,
   * BrandAsset produced, cost class, gap flag. No strategy required — pure metadata.
   */
  catalog: protectedProcedure.query(() => buildOracleCatalog()),

  listSections: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ input }) => {
      const sections = await getSectionsForStrategy(input.strategyId);
      return { sections };
    }),

  getSection: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), sectionId: SectionIdSchema }))
    .query(async ({ input }) => {
      const section = await getSection(input.strategyId, input.sectionId);
      return { section };
    }),

  snapshotStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ input }) => {
      const snapshot = await snapshotStrategy(input.strategyId);
      return snapshot;
    }),

  /**
   * Génère une section. Mode auto-détecté depuis status courant si absent :
   *   - PENDING → FRESH
   *   - COMPLETE → REGEN
   *   - FAILED / STALE → RETRY
   *   - GENERATING → veto (lock occupé, attendre)
   *
   * Émet `GENERATE_ORACLE_SECTION` via Mestor (gouvernance LOI 1).
   */
  generateSection: operatorProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        sectionId: SectionIdSchema,
        mode: z.enum(["FRESH", "REGEN", "RETRY"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      let mode = input.mode;
      if (!mode) {
        const current = await getSection(input.strategyId, input.sectionId);
        mode = autoDetectMode(current?.status ?? "PENDING");
      }

      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "GENERATE_ORACLE_SECTION",
          strategyId: input.strategyId,
          sectionId: input.sectionId,
          mode,
          operatorId,
        },
        { caller: "trpc.oracle.generateSection" },
      );
      return result;
    }),

  /**
   * Retry explicite — variant qui force `mode=RETRY` (audit log distinct
   * "opérateur a retenté §X" vs auto-detect).
   */
  retrySection: operatorProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        sectionId: SectionIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "GENERATE_ORACLE_SECTION",
          strategyId: input.strategyId,
          sectionId: input.sectionId,
          mode: "RETRY",
          operatorId,
        },
        { caller: "trpc.oracle.retrySection" },
      );
      return result;
    }),

  /**
   * Phase 21 F-D (ADR-0071) — Oracle Assembler manual-first orchestrator.
   *
   * Émet `ASSEMBLE_ORACLE` qui boucle sur `GENERATE_ORACLE_SECTION` × N.
   * Resilient : un échec individuel ne bloque pas les suivants.
   *
   * Scope :
   *   - "ALL"       — toutes les 35 sections (REGEN forcé sur les COMPLETE).
   *   - "MISSING"   — uniquement PENDING.
   *   - "STALE"     — uniquement STALE + FAILED.
   *   - sectionIds  — liste explicite (mode auto-détecté par section).
   */
  assembleOracle: operatorProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        scope: z.union([
          z.literal("ALL"),
          z.literal("MISSING"),
          z.literal("STALE"),
          z.array(SectionIdSchema).min(1).max(35),
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "ASSEMBLE_ORACLE",
          strategyId: input.strategyId,
          scope: input.scope,
          operatorId,
        },
        { caller: "trpc.oracle.assembleOracle" },
      );
      return result;
    }),
});

function autoDetectMode(status: string): "FRESH" | "REGEN" | "RETRY" {
  switch (status) {
    case "PENDING":
      return "FRESH";
    case "COMPLETE":
      return "REGEN";
    case "FAILED":
    case "STALE":
      return "RETRY";
    default:
      // GENERATING ou statut inconnu → fallback FRESH (le handler vetoera si conflit)
      return "FRESH";
  }
}
